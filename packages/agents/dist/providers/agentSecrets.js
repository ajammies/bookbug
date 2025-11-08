import { z } from 'zod';
const envSchema = z.object({
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
});
export class AgentSecrets {
    static env = envSchema.parse(process.env);
    static getOpenAIKey() {
        return this.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    }
    static getAnthropicKey() {
        return this.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    }
    static requireOpenAIKey(origin) {
        const key = this.getOpenAIKey();
        if (!key) {
            throw new Error(`OPENAI_API_KEY is required by ${origin}`);
        }
        return key;
    }
    static requireAnthropicKey(origin) {
        const key = this.getAnthropicKey();
        if (!key) {
            throw new Error(`ANTHROPIC_API_KEY is required by ${origin}`);
        }
        return key;
    }
}
//# sourceMappingURL=agentSecrets.js.map