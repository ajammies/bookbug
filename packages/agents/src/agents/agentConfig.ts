import { z } from 'zod';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required for the Agent SDK'),
});

type ModelMap = {
  concierge: string;
  author: string;
  artDirector: string;
  illustrator: string;
};

export class AgentConfig {
  private static readonly _env = envSchema.parse(process.env);

  // Mapping of our studio roles to preferred OpenAI models.
  static readonly MODELS: ModelMap = {
    concierge: 'gpt-4.1-mini',
    author: 'gpt-4.1',
    artDirector: 'gpt-4o-mini',
    illustrator: 'gpt-4.1-mini',
  } as const;

  static model(key: keyof ModelMap): string {
    return this.MODELS[key];
  }

  // Expose env for future needs without revalidating elsewhere.
  static get env(): Readonly<typeof AgentConfig._env> {
    return this._env;
  }
}

export type AgentModelKey = keyof typeof AgentConfig.MODELS;
