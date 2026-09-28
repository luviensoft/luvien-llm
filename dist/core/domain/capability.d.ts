export interface LlmCapabilities {
    chat: boolean;
    responses: boolean;
    streaming: boolean;
    toolCalling: boolean;
    structuredOutput: boolean;
    vision?: boolean;
    reasoning?: boolean;
}
export interface LlmModel {
    provider: string;
    model: string;
    capabilities: LlmCapabilities;
}
export declare const FULL_CAPABILITIES: LlmCapabilities;
//# sourceMappingURL=capability.d.ts.map