import type { LlmToolCall } from './tool.js';
import type { LlmUsage } from './usage.js';

interface ChatResponseBase {
  model: string;
  provider: string;
  finishReason: string;
  usage: LlmUsage;
}

export interface TextChatResponse extends ChatResponseBase {
  type: 'text';
  text: string;
}

export interface StructuredChatResponse extends ChatResponseBase {
  type: 'structured';
  data: unknown;
}

export interface ToolCallsChatResponse extends ChatResponseBase {
  type: 'tool_calls';
  toolCalls: LlmToolCall[];
}

export type ChatResponse =
  TextChatResponse | StructuredChatResponse | ToolCallsChatResponse;

export type ResponsesResponse = ChatResponse;
