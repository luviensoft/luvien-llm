export declare class LlmError extends Error {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
export declare class LlmConfigurationError extends LlmError {
}
export declare class LlmConnectionError extends LlmError {
}
export declare class LlmTimeoutError extends LlmError {
}
export declare class LlmRateLimitError extends LlmError {
}
export declare class LlmAuthenticationError extends LlmError {
}
export declare class LlmInvalidRequestError extends LlmError {
}
export declare class LlmCapabilityError extends LlmError {
}
export declare class LlmProviderError extends LlmError {
}
export declare class LlmSerializationError extends LlmError {
}
//# sourceMappingURL=errors.d.ts.map