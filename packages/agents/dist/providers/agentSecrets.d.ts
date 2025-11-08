export declare class AgentSecrets {
    private static readonly env;
    static getOpenAIKey(): string | undefined;
    static getAnthropicKey(): string | undefined;
    static requireOpenAIKey(origin: string): string;
    static requireAnthropicKey(origin: string): string;
}
//# sourceMappingURL=agentSecrets.d.ts.map