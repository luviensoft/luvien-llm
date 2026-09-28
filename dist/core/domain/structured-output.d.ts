export type LlmResponseFormat = {
    type: 'text';
} | {
    type: 'json_object';
} | {
    type: 'json_schema';
    name: string;
    schema: unknown;
    strict?: boolean;
};
//# sourceMappingURL=structured-output.d.ts.map