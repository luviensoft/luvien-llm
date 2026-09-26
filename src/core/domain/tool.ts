export interface LlmTool {
  name: string;
  description?: string;
  /** JSON Schema. The library transports it; it does not validate it. */
  inputSchema: unknown;
}

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export type LlmToolChoice = 'auto' | 'none' | 'required' | { name: string };
