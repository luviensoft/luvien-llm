import type { LlmDriver } from '../../core/port/llm-driver.port.js';
import type {
  ChatRequest,
  ResponsesRequest,
} from '../../core/domain/request.js';
import type {
  ChatResponse,
  ResponsesResponse,
} from '../../core/domain/response.js';
import type { LlmStreamEvent } from '../../core/domain/stream.js';
import type { LlmCapabilities } from '../../core/domain/capability.js';
import { FULL_CAPABILITIES } from '../../core/domain/capability.js';
import type { LlmUsage } from '../../core/domain/usage.js';
import type { LlmMessage } from '../../core/domain/message.js';
import type { LlmToolCall, LlmToolChoice } from '../../core/domain/tool.js';
import {
  LlmAuthenticationError,
  LlmConnectionError,
  LlmInvalidRequestError,
  LlmProviderError,
  LlmRateLimitError,
  LlmTimeoutError,
} from '../../core/domain/errors.js';
import type { OpenAiCompatibleConfig } from './openai-compatible.config.js';

interface OpenAiToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface OpenAiChatCompletion {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: OpenAiToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAiCompatibleDriver implements LlmDriver {
  readonly provider = 'openai-compatible';
  readonly capabilities: LlmCapabilities;

  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly defaultModel: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  constructor(config: OpenAiCompatibleConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel;
    this.headers = config.headers ?? {};
    this.timeoutMs = config.timeoutMs ?? 60_000;
    this.capabilities = {
      ...FULL_CAPABILITIES,
      ...(config.capabilities ?? {}),
    };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const body = this.buildRequestBody(request, false);
    const res = await this.post<OpenAiChatCompletion>(
      '/chat/completions',
      body,
    );

    const choice = res.choices[0];
    if (!choice) throw new LlmProviderError('No choices in response');

    const usage = normalizeUsage(res.usage);
    const model = res.model;
    const provider = this.provider;

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      return {
        type: 'tool_calls',
        toolCalls: choice.message.tool_calls.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: safeJsonParse(tc.function.arguments),
        })),
        finishReason: choice.finish_reason,
        usage,
        model,
        provider,
      };
    }

    const content = choice.message.content ?? '';

    if (
      request.responseFormat?.type === 'json_schema' ||
      request.responseFormat?.type === 'json_object'
    ) {
      return {
        type: 'structured',
        data: safeJsonParse(content),
        finishReason: choice.finish_reason,
        usage,
        model,
        provider,
      };
    }

    return {
      type: 'text',
      text: content,
      finishReason: choice.finish_reason,
      usage,
      model,
      provider,
    };
  }

  responses(request: ResponsesRequest): Promise<ResponsesResponse> {
    return this.chat(request);
  }

  async *stream(request: ChatRequest): AsyncIterable<LlmStreamEvent> {
    const body = this.buildRequestBody(request, true);
    const url = `${this.baseUrl}/chat/completions`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      throw this.mapFetchError(err);
    }

    if (!res.ok) {
      clearTimeout(timer);
      await this.throwHttpError(res);
    }

    if (!res.body) {
      clearTimeout(timer);
      throw new LlmProviderError('Streaming response has no body');
    }

    const model = request.model ?? this.defaultModel;
    yield { type: 'response_started', provider: this.provider, model };

    try {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const partialToolCalls = new Map<
        number,
        { id?: string; name?: string; arguments: string }
      >();
      let finishReason = 'stop';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;

          const chunk = JSON.parse(data) as {
            choices: Array<{
              delta: {
                content?: string;
                tool_calls?: Array<{
                  index: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }>;
              };
              finish_reason: string | null;
            }>;
            usage?: {
              prompt_tokens: number;
              completion_tokens: number;
              total_tokens: number;
            };
          };

          const choice = chunk.choices[0];
          if (!choice) continue;

          if (choice.delta.content) {
            yield { type: 'text_delta', delta: choice.delta.content };
          }

          for (const tc of choice.delta.tool_calls ?? []) {
            const acc = partialToolCalls.get(tc.index) ?? { arguments: '' };
            if (tc.id) acc.id = tc.id;
            if (tc.function?.name) acc.name = tc.function.name;
            if (tc.function?.arguments) acc.arguments += tc.function.arguments;
            partialToolCalls.set(tc.index, acc);

            yield {
              type: 'tool_call_delta',
              index: tc.index,
              id: tc.id,
              name: tc.function?.name,
              argumentsDelta: tc.function?.arguments,
            };
          }

          if (choice.finish_reason) finishReason = choice.finish_reason;

          if (chunk.usage) {
            yield { type: 'usage', usage: normalizeUsage(chunk.usage) };
          }
        }
      }

      yield { type: 'response_completed', finishReason };
    } finally {
      clearTimeout(timer);
    }
  }

  // --- internals ---

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json',
      ...this.headers,
    };
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
    return headers;
  }

  private buildRequestBody(request: ChatRequest, stream: boolean): unknown {
    const body: Record<string, unknown> = {
      model: request.model ?? this.defaultModel,
      messages: request.messages.map(toOpenAiMessage),
    };

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      }));
    }

    if (request.toolChoice)
      body.tool_choice = toOpenAiToolChoice(request.toolChoice);
    if (request.temperature !== undefined)
      body.temperature = request.temperature;
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;

    if (request.responseFormat) {
      if (request.responseFormat.type === 'json_schema') {
        body.response_format = {
          type: 'json_schema',
          json_schema: {
            name: request.responseFormat.name,
            schema: request.responseFormat.schema,
            strict: request.responseFormat.strict ?? true,
          },
        };
      } else if (request.responseFormat.type === 'json_object') {
        body.response_format = { type: 'json_object' };
      }
    }

    if (stream) {
      body.stream = true;
      body.stream_options = { include_usage: true };
    }

    return body;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      throw this.mapFetchError(err);
    }

    clearTimeout(timer);

    if (!res.ok) await this.throwHttpError(res);
    return (await res.json()) as T;
  }

  private mapFetchError(err: unknown): Error {
    const e = err as { name?: string; message?: string };
    if (e?.name === 'AbortError') {
      return new LlmTimeoutError(`Request timed out after ${this.timeoutMs}ms`);
    }
    return new LlmConnectionError('Failed to connect to provider', err);
  }

  private async throwHttpError(res: Response): Promise<never> {
    const body = await res.text().catch(() => '');
    const snippet = body.slice(0, 300);

    if (res.status === 401 || res.status === 403) {
      throw new LlmAuthenticationError('Authentication failed', {
        status: res.status,
        body: snippet,
      });
    }
    if (res.status === 429) {
      throw new LlmRateLimitError('Rate limit exceeded', {
        status: res.status,
        body: snippet,
      });
    }
    if (res.status >= 400 && res.status < 500) {
      throw new LlmInvalidRequestError('Invalid request', {
        status: res.status,
        body: snippet,
      });
    }
    throw new LlmProviderError(`Provider returned ${res.status}`, {
      status: res.status,
      body: snippet,
    });
  }
}

function toOpenAiMessage(m: LlmMessage): OpenAiMessage {
  if (m.role === 'tool') {
    if (!m.toolCallId) {
      throw new LlmInvalidRequestError('tool message missing toolCallId');
    }
    return {
      role: 'tool',
      content: m.content ?? '',
      tool_call_id: m.toolCallId,
      ...(m.name ? { name: m.name } : {}),
    };
  }
  if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
    return {
      role: 'assistant',
      content: m.content,
      tool_calls: m.toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: {
          name: tc.name,
          arguments:
            typeof tc.arguments === 'string'
              ? tc.arguments
              : JSON.stringify(tc.arguments),
        },
      })),
    };
  }
  return { role: m.role, content: m.content };
}

function toOpenAiToolChoice(choice: LlmToolChoice): unknown {
  if (typeof choice === 'string') return choice;
  return { type: 'function', function: { name: choice.name } };
}

function normalizeUsage(u?: {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}): LlmUsage {
  if (!u) return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  return {
    inputTokens: u.prompt_tokens,
    outputTokens: u.completion_tokens,
    totalTokens: u.total_tokens,
  };
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
