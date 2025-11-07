import { z } from 'zod';
const envSchema = z.object({
    OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required for the Agent SDK'),
});
export class AgentConfig {
    static _env = envSchema.parse(process.env);
    // Mapping of our studio roles to preferred OpenAI models.
    static MODELS = {
        concierge: 'gpt-4.1-mini',
        author: 'gpt-4.1',
        artDirector: 'gpt-4o-mini',
        illustrator: 'gpt-4.1-mini',
    };
    static model(key) {
        return this.MODELS[key];
    }
    // Expose env for future needs without revalidating elsewhere.
    static get env() {
        return this._env;
    }
}
//# sourceMappingURL=agentConfig.js.map