export class LlmError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class LlmConfigurationError extends LlmError {}
export class LlmConnectionError extends LlmError {}
export class LlmTimeoutError extends LlmError {}
export class LlmRateLimitError extends LlmError {}
export class LlmAuthenticationError extends LlmError {}
export class LlmInvalidRequestError extends LlmError {}
export class LlmCapabilityError extends LlmError {}
export class LlmProviderError extends LlmError {}
export class LlmSerializationError extends LlmError {}
