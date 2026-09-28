import type { LlmDriver } from '../../core/port/llm-driver.port.js';
import type { ChatRequest, ResponsesRequest } from '../../core/domain/request.js';
import type { ChatResponse, ResponsesResponse } from '../../core/domain/response.js';
import type { LlmStreamEvent } from '../../core/domain/stream.js';
import type { LlmCapabilities } from '../../core/domain/capability.js';
import type { OpenAiCompatibleConfig } from './openai-compatible.config.js';
export declare class OpenAiCompatibleDriver implements LlmDriver {
    readonly provider = "openai-compatible";
    readonly capabilities: LlmCapabilities;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly defaultModel;
    private readonly headers;
    private readonly timeoutMs;
    constructor(config: OpenAiCompatibleConfig);
    chat(request: ChatRequest): Promise<ChatResponse>;
    responses(request: ResponsesRequest): Promise<ResponsesResponse>;
    stream(request: ChatRequest): AsyncIterable<LlmStreamEvent>;
    private buildHeaders;
    private buildRequestBody;
    private post;
    private mapFetchError;
    private throwHttpError;
}
//# sourceMappingURL=openai-compatible.driver.d.ts.map