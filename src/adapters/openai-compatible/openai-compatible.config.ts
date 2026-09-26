export interface OpenAiCompatibleConfig {
  /** Base URL without trailing slash, e.g. http://localhost:11434/v1 */
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  /** Extra headers sent on every request. */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds. Default 60_000. */
  timeoutMs?: number;
  /** Override declared capabilities. Useful for local models. */
  capabilities?: Partial<
    import('../../core/domain/capability.js').LlmCapabilities
  >;
}
