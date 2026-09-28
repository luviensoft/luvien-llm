import type { ChatRequest } from '../../core/domain/request.js';
import type { LlmToolCall } from '../../core/domain/tool.js';
import type { LlmUsage } from '../../core/domain/usage.js';
import type { LlmError } from '../../core/domain/errors.js';
export type MockResponseSpec = {
    type: 'text';
    text: string;
    usage?: Partial<LlmUsage>;
    finishReason?: string;
    chunkSize?: number;
    latencyMs?: number;
} | {
    type: 'structured';
    data: unknown;
    usage?: Partial<LlmUsage>;
    finishReason?: string;
    latencyMs?: number;
} | {
    type: 'tool_calls';
    toolCalls: LlmToolCall[];
    usage?: Partial<LlmUsage>;
    finishReason?: string;
    latencyMs?: number;
} | {
    type: 'error';
    error: LlmError;
    latencyMs?: number;
};
export interface MockScenario {
    name: string;
    match?(request: ChatRequest): boolean;
    respond: MockResponseSpec | ((request: ChatRequest) => MockResponseSpec | Promise<MockResponseSpec>);
}
//# sourceMappingURL=mock.scenario.d.ts.map