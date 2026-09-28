import { FULL_CAPABILITIES } from '../../core/domain/capability.js';
import { LlmAuthenticationError, LlmConnectionError, LlmInvalidRequestError, LlmProviderError, LlmRateLimitError, LlmTimeoutError, } from '../../core/domain/errors.js';
export class OpenAiCompatibleDriver {
    provider = 'openai-compatible';
    capabilities;
    baseUrl;
    apiKey;
    defaultModel;
    headers;
    timeoutMs;
    constructor(config) {
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
    async chat(request) {
        const body = this.buildRequestBody(request, false);
        const res = await this.post('/chat/completions', body);
        const choice = res.choices[0];
        if (!choice)
            throw new LlmProviderError('No choices in response');
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
        if (request.responseFormat?.type === 'json_schema' ||
            request.responseFormat?.type === 'json_object') {
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
    responses(request) {
        return this.chat(request);
    }
    async *stream(request) {
        const body = this.buildRequestBody(request, true);
        const url = `${this.baseUrl}/chat/completions`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        let res;
        try {
            res = await fetch(url, {
                method: 'POST',
                headers: this.buildHeaders(),
                body: JSON.stringify(body),
                signal: controller.signal,
            });
        }
        catch (err) {
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
            const partialToolCalls = new Map();
            let finishReason = 'stop';
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data:'))
                        continue;
                    const data = trimmed.slice(5).trim();
                    if (data === '[DONE]')
                        continue;
                    const chunk = JSON.parse(data);
                    const choice = chunk.choices[0];
                    if (!choice)
                        continue;
                    if (choice.delta.content) {
                        yield { type: 'text_delta', delta: choice.delta.content };
                    }
                    for (const tc of choice.delta.tool_calls ?? []) {
                        const acc = partialToolCalls.get(tc.index) ?? { arguments: '' };
                        if (tc.id)
                            acc.id = tc.id;
                        if (tc.function?.name)
                            acc.name = tc.function.name;
                        if (tc.function?.arguments)
                            acc.arguments += tc.function.arguments;
                        partialToolCalls.set(tc.index, acc);
                        yield {
                            type: 'tool_call_delta',
                            index: tc.index,
                            id: tc.id,
                            name: tc.function?.name,
                            argumentsDelta: tc.function?.arguments,
                        };
                    }
                    if (choice.finish_reason)
                        finishReason = choice.finish_reason;
                    if (chunk.usage) {
                        yield { type: 'usage', usage: normalizeUsage(chunk.usage) };
                    }
                }
            }
            yield { type: 'response_completed', finishReason };
        }
        finally {
            clearTimeout(timer);
        }
    }
    buildHeaders() {
        const headers = {
            'content-type': 'application/json',
            accept: 'application/json',
            ...this.headers,
        };
        if (this.apiKey)
            headers.authorization = `Bearer ${this.apiKey}`;
        return headers;
    }
    buildRequestBody(request, stream) {
        const body = {
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
        if (request.maxTokens !== undefined)
            body.max_tokens = request.maxTokens;
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
            }
            else if (request.responseFormat.type === 'json_object') {
                body.response_format = { type: 'json_object' };
            }
        }
        if (stream) {
            body.stream = true;
            body.stream_options = { include_usage: true };
        }
        return body;
    }
    async post(path, body) {
        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        let res;
        try {
            res = await fetch(url, {
                method: 'POST',
                headers: this.buildHeaders(),
                body: JSON.stringify(body),
                signal: controller.signal,
            });
        }
        catch (err) {
            clearTimeout(timer);
            throw this.mapFetchError(err);
        }
        clearTimeout(timer);
        if (!res.ok)
            await this.throwHttpError(res);
        return (await res.json());
    }
    mapFetchError(err) {
        const e = err;
        if (e?.name === 'AbortError') {
            return new LlmTimeoutError(`Request timed out after ${this.timeoutMs}ms`);
        }
        return new LlmConnectionError('Failed to connect to provider', err);
    }
    async throwHttpError(res) {
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
function toOpenAiMessage(m) {
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
                    arguments: typeof tc.arguments === 'string'
                        ? tc.arguments
                        : JSON.stringify(tc.arguments),
                },
            })),
        };
    }
    return { role: m.role, content: m.content };
}
function toOpenAiToolChoice(choice) {
    if (typeof choice === 'string')
        return choice;
    return { type: 'function', function: { name: choice.name } };
}
function normalizeUsage(u) {
    if (!u)
        return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    return {
        inputTokens: u.prompt_tokens,
        outputTokens: u.completion_tokens,
        totalTokens: u.total_tokens,
    };
}
function safeJsonParse(s) {
    try {
        return JSON.parse(s);
    }
    catch {
        return s;
    }
}
//# sourceMappingURL=openai-compatible.driver.js.map