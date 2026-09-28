import { type Llm } from '../core/port/llm.port.js';
import type { ChatRequest, ResponsesRequest } from '../core/domain/request.js';
import type { ChatResponse, ResponsesResponse } from '../core/domain/response.js';
import type { LlmStreamEvent } from '../core/domain/stream.js';
export declare class LlmService implements Llm {
    private readonly llm;
    constructor(llm: Llm);
    chat(request: ChatRequest): Promise<ChatResponse>;
    responses(request: ResponsesRequest): Promise<ResponsesResponse>;
    stream(request: ChatRequest): AsyncIterable<LlmStreamEvent>;
}
//# sourceMappingURL=llm.service.d.ts.map