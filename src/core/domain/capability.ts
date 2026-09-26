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

export const FULL_CAPABILITIES: LlmCapabilities = {
  chat: true,
  responses: true,
  streaming: true,
  toolCalling: true,
  structuredOutput: true,
  vision: false,
  reasoning: false,
};
