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
  protected history: AgentMessage[] = [];

  protected constructor(protected readonly config: AgentProviderConfig<TOutput>) {}

  public run(input?: AgentPrompt): Promise<AgentRunResult<TOutput>> ;

  getHistory(): AgentMessage[] {
    return this.history;
  }

  protected setHistory(messages: AgentMessage[]): AgentMessage[] {
    this.history = messages;
    return this.history;
  }

  protected appendUserMessage(content: string): AgentMessage[] {
    this.history = this.history.concat({ role: 'user', content });
    return this.history;
  }

  protected prepareMessages(input?: AgentPrompt): AgentMessage[] {
    if (Array.isArray(input)) {
      return this.setHistory(input);
    }

    if (typeof input === 'string') {
      return this.appendUserMessage(input);
    }

    return this.history;
  }
}
