export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** Optional. The library does not hard-code provider pricing. */
  estimatedCost?: number;
  currency?: string;
}
