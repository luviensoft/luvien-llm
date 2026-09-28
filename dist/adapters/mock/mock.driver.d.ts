import type { LlmDriver } from '../../core/port/llm-driver.port.js';
import type { ChatRequest, ResponsesRequest } from '../../core/domain/request.js';
import type { ChatResponse, ResponsesResponse } from '../../core/domain/response.js';
import type { LlmStreamEvent } from '../../core/domain/stream.js';
import type { LlmCapabilities } from '../../core/domain/capability.js';
import type { MockConfig } from './mock.config.js';
export declare class MockDriver implements LlmDriver {
    readonly provider = "mock";
    readonly capabilities: LlmCapabilities;
    private readonly scenarios;
    private readonly defaultScenario;
    private readonly defaultModel;
    constructor(config?: MockConfig);
    chat(request: ChatRequest): Promise<ChatResponse>;
    responses(request: ResponsesRequest): Promise<ResponsesResponse>;
    stream(request: ChatRequest): AsyncIterable<LlmStreamEvent>;
    private resolveSpec;
}
//# sourceMappingURL=mock.driver.d.ts.map