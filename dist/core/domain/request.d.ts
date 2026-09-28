import type { LlmMessage } from './message.js';
import type { LlmTool, LlmToolChoice } from './tool.js';
import type { LlmResponseFormat } from './structured-output.js';
export interface ChatRequest {
    model?: string;
    messages: LlmMessage[];
    tools?: LlmTool[];
    toolChoice?: LlmToolChoice;
    responseFormat?: LlmResponseFormat;
    temperature?: number;
    maxTokens?: number;
    metadata?: Record<string, unknown>;
}
export type ResponsesRequest = ChatRequest;
//# sourceMappingURL=request.d.ts.map