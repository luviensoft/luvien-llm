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
import { LlmConfigurationError, LlmError } from '../../core/domain/errors.js';
import type { MockConfig } from './mock.config.js';
import type { MockResponseSpec, MockScenario } from './mock.scenario.js';

const ZERO_USAGE: LlmUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
};

export class MockDriver implements LlmDriver {
  readonly provider = 'mock';
  readonly capabilities: LlmCapabilities = FULL_CAPABILITIES;

  private readonly scenarios: Map<string, MockScenario>;
  private readonly defaultScenario: string | undefined;
  private readonly defaultModel: string;

  constructor(config: MockConfig = {}) {
    this.scenarios = new Map((config.scenarios ?? []).map((s) => [s.name, s]));
    this.defaultScenario = config.defaultScenario;
    this.defaultModel = config.defaultModel ?? 'mock-model';
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const spec = await this.resolveSpec(request);
    if (spec.type === 'error') throw spec.error;

    const model = request.model ?? this.defaultModel;
    const usage = mergeUsage(spec.usage);

    if (spec.latencyMs) await sleep(spec.latencyMs);

    switch (spec.type) {
      case 'text':
        return {
          type: 'text',
          text: spec.text,
          finishReason: spec.finishReason ?? 'stop',
          usage,
          model,
          provider: this.provider,
        };
      case 'structured':
        return {
          type: 'structured',
          data: spec.data,
          finishReason: spec.finishReason ?? 'stop',
          usage,
          model,
          provider: this.provider,
        };
      case 'tool_calls':
        return {
          type: 'tool_calls',
          toolCalls: spec.toolCalls,
          finishReason: spec.finishReason ?? 'tool_calls',
          usage,
          model,
          provider: this.provider,
        };
    }
  }

  responses(request: ResponsesRequest): Promise<ResponsesResponse> {
    return this.chat(request);
  }

  async *stream(request: ChatRequest): AsyncIterable<LlmStreamEvent> {
    const spec = await this.resolveSpec(request);
    const model = request.model ?? this.defaultModel;

    yield { type: 'response_started', provider: this.provider, model };

    if (spec.latencyMs) await sleep(spec.latencyMs);

    if (spec.type === 'error') {
      yield { type: 'error', error: spec.error };
      return;
    }

    if (spec.type === 'text') {
      const chunkSize = spec.chunkSize ?? 8;
      for (let i = 0; i < spec.text.length; i += chunkSize) {
        yield { type: 'text_delta', delta: spec.text.slice(i, i + chunkSize) };
      }
    } else if (spec.type === 'structured') {
      const json = JSON.stringify(spec.data);
      yield { type: 'text_delta', delta: json };
    } else if (spec.type === 'tool_calls') {
      for (let index = 0; index < spec.toolCalls.length; index++) {
        const call = spec.toolCalls[index];
        yield {
          type: 'tool_call_delta',
          index,
          id: call.id,
          name: call.name,
          argumentsDelta: JSON.stringify(call.arguments),
        };
      }
    }

    yield { type: 'usage', usage: mergeUsage(spec.usage) };
    yield {
      type: 'response_completed',
      finishReason:
        spec.finishReason ??
        (spec.type === 'tool_calls' ? 'tool_calls' : 'stop'),
    };
  }

  // --- internals ---

  private async resolveSpec(request: ChatRequest): Promise<MockResponseSpec> {
    const scenarioName =
      (request.metadata?.scenario as string | undefined) ??
      this.defaultScenario;

    if (!scenarioName) {
      throw new LlmConfigurationError(
        'Mock driver: no scenario in metadata and no defaultScenario configured',
      );
    }

    const scenario = this.scenarios.get(scenarioName);
    if (!scenario) {
      throw new LlmConfigurationError(
        `Mock driver: unknown scenario "${scenarioName}"`,
      );
    }

    if (scenario.match && !scenario.match(request)) {
      throw new LlmConfigurationError(
        `Mock driver: scenario "${scenarioName}" predicate did not match`,
      );
    }

    const spec =
      typeof scenario.respond === 'function'
        ? await scenario.respond(request)
        : scenario.respond;

    return spec;
  }
}

function mergeUsage(partial: Partial<LlmUsage> | undefined): LlmUsage {
  return { ...ZERO_USAGE, ...(partial ?? {}) };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
