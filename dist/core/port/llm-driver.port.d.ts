import type { LlmCapabilities } from '../domain/capability.js';
export declare const LLM_DRIVER = "luvien:llm:driver";
export interface LlmDriver {
    readonly provider: string;
    readonly capabilities: LlmCapabilities;
    chat(request: import('../domain/request.js').ChatRequest): Promise<import('../domain/response.js').ChatResponse>;
    responses(request: import('../domain/request.js').ResponsesRequest): Promise<import('../domain/response.js').ResponsesResponse>;
    stream(request: import('../domain/request.js').ChatRequest): AsyncIterable<import('../domain/stream.js').LlmStreamEvent>;
}
//# sourceMappingURL=llm-driver.port.d.ts.map