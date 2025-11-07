import { z } from 'zod';

export type AgentPrompt = string | AgentMessage[] | undefined;

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AgentRunResult<TOutput> {
  finalOutput?: TOutput | string;
  history: AgentMessage[];
  rawText?: string;
}

export type AgentProviderConfig<TOutput> = {
  name: string;
  instructions: string;
  model: string;
  outputType?: z.ZodType<TOutput>;
  maxOutputTokens?: number;
  apiKey?: string;
};

export abstract class AgentProvider<TOutput = unknown> {
  protected constructor(protected readonly config: AgentProviderConfig<TOutput>) {}

  abstract run(input?: AgentPrompt): Promise<AgentRunResult<TOutput>>;
}

export async function run<TOutput>(agent: AgentProvider<TOutput>, input?: AgentPrompt): Promise<AgentRunResult<TOutput>> {
  return agent.run(input);
}
