export interface OpenAiCompatibleConfig {
    baseUrl: string;
    apiKey?: string;
    defaultModel: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
    capabilities?: Partial<import('../../core/domain/capability.js').LlmCapabilities>;
}
//# sourceMappingURL=openai-compatible.config.d.ts.map