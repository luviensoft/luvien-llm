import type { LlmToolCall } from './tool.js';

export type LlmRole = 'system' | 'user' | 'assistant' | 'tool';

export interface LlmMessage {
  role: LlmRole;
  /** null is valid for assistant messages that only contain tool_calls. */
  content: string | null;
  /** Populated when role === 'assistant' and the model requested tools. */
  toolCalls?: LlmToolCall[];
  /** Populated when role === 'tool'. Links the result to a prior tool call. */
  toolCallId?: string;
  /** Optional tool name, for logging/diagnostics. */
  name?: string;
}
