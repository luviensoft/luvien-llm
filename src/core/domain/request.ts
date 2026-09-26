import type { LlmMessage } from './message.js';
import type { LlmTool, LlmToolChoice } from './tool.js';
import type { LlmResponseFormat } from './structured-output.js';

export interface ChatRequest {
  /** Optional. Driver default is used when omitted. */
  model?: string;

  messages: LlmMessage[];

  tools?: LlmTool[];
  toolChoice?: LlmToolChoice;

  responseFormat?: LlmResponseFormat;

  temperature?: number;
  maxTokens?: number;

  /**
   * Opaque to the library. Used by Mock and Routing drivers to select
   * behavior. The library never interprets the values.
   */
  metadata?: Record<string, unknown>;
}

export type ResponsesRequest = ChatRequest;
