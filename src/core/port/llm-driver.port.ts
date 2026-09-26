import type { LlmCapabilities } from '../domain/capability.js';

export const LLM_DRIVER = 'luvien:llm:driver';

/**
 * A driver is a concrete provider adapter. It is what the OpenAI-compatible
 * adapter, the Mock adapter, and the Replay adapter implement.
 *
 * Infrastructure layers (routing, retry, timeout) sit above drivers and
 * implement `Llm` rather than `LlmDriver`.
 */
export interface LlmDriver {
  readonly provider: string;
  readonly capabilities: LlmCapabilities;
  chat(
    request: import('../domain/request.js').ChatRequest,
  ): Promise<import('../domain/response.js').ChatResponse>;
  responses(
    request: import('../domain/request.js').ResponsesRequest,
  ): Promise<import('../domain/response.js').ResponsesResponse>;
  stream(
    request: import('../domain/request.js').ChatRequest,
  ): AsyncIterable<import('../domain/stream.js').LlmStreamEvent>;
}
