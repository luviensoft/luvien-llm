import type { ChatRequest } from '../../core/domain/request.js';
import type { ChatResponse } from '../../core/domain/response.js';
import type { LlmStreamEvent } from '../../core/domain/stream.js';
import type { LlmToolCall } from '../../core/domain/tool.js';
import type { LlmUsage } from '../../core/domain/usage.js';
import type { LlmError } from '../../core/domain/errors.js';

export type MockResponseSpec =
  | {
      type: 'text';
      text: string;
      usage?: Partial<LlmUsage>;
      finishReason?: string;
      /** When set, stream() will emit the text in chunks. */
      chunkSize?: number;
      latencyMs?: number;
    }
  | {
      type: 'structured';
      data: unknown;
      usage?: Partial<LlmUsage>;
      finishReason?: string;
      latencyMs?: number;
    }
  | {
      type: 'tool_calls';
      toolCalls: LlmToolCall[];
      usage?: Partial<LlmUsage>;
      finishReason?: string;
      latencyMs?: number;
    }
  | {
      type: 'error';
      error: LlmError;
      latencyMs?: number;
    };

export interface MockScenario {
  name: string;
  /** Optional additional match predicate. Scenario is already matched by name. */
  match?(request: ChatRequest): boolean;
  /** Either a static spec or a function of the request. */
  respond:
    | MockResponseSpec
    | ((request: ChatRequest) => MockResponseSpec | Promise<MockResponseSpec>);
}
