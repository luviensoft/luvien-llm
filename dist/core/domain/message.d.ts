import type { LlmToolCall } from './tool.js';
export type LlmRole = 'system' | 'user' | 'assistant' | 'tool';
export interface LlmMessage {
    role: LlmRole;
    content: string | null;
    toolCalls?: LlmToolCall[];
    toolCallId?: string;
    name?: string;
}
//# sourceMappingURL=message.d.ts.map