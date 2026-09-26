import type { LlmError } from './errors.js';
import type { LlmUsage } from './usage.js';

export type LlmStreamEvent =
  | { type: 'response_started'; provider: string; model: string }
  | { type: 'text_delta'; delta: string }
  | {
      type: 'tool_call_delta';
      index: number;
      id?: string;
      name?: string;
      argumentsDelta?: string;
    }
  | { type: 'usage'; usage: LlmUsage }
  | { type: 'response_completed'; finishReason: string }
  | { type: 'error'; error: LlmError };
