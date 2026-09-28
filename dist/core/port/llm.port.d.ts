import type { ChatRequest, ResponsesRequest } from '../domain/request.js';
import type { ChatResponse, ResponsesResponse } from '../domain/response.js';
import type { LlmStreamEvent } from '../domain/stream.js';
export declare const LLM = "luvien:llm:llm";
export interface Llm {
    chat(request: ChatRequest): Promise<ChatResponse>;
    responses(request: ResponsesRequest): Promise<ResponsesResponse>;
    stream(request: ChatRequest): AsyncIterable<LlmStreamEvent>;
}
//# sourceMappingURL=llm.port.d.ts.map