export interface LlmTool {
    name: string;
    description?: string;
    inputSchema: unknown;
}
export interface LlmToolCall {
    id: string;
    name: string;
    arguments: unknown;
}
export type LlmToolChoice = 'auto' | 'none' | 'required' | {
    name: string;
};
//# sourceMappingURL=tool.d.ts.map