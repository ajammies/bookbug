import { z } from 'zod';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export class AgentSecrets {
  private static readonly env = envSchema.parse(process.env);

  static getOpenAIKey(): string | undefined {
    return this.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  }

  static getAnthropicKey(): string | undefined {
    return this.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  }

  static requireOpenAIKey(origin: string): string {
    const key = this.getOpenAIKey();
    if (!key) {
      throw new Error(`OPENAI_API_KEY is required by ${origin}`);
    }
    return key;
  }

  static requireAnthropicKey(origin: string): string {
    const key = this.getAnthropicKey();
    if (!key) {
      throw new Error(`ANTHROPIC_API_KEY is required by ${origin}`);
    }
    return key;
  }
}
