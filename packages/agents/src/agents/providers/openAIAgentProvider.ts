import { Agent as OpenAIAgent, type AgentInputItem, run as runOpenAI } from '@openai/agents';
import { z } from 'zod';
import { AgentSecrets } from '../../providers/agentSecrets.js';
import { AgentProvider, type AgentProviderConfig, type AgentPrompt, type AgentRunResult, type AgentMessage } from './agentProvider.js';

export type OpenAIAgentOptions = Partial<ConstructorParameters<typeof OpenAIAgent>[0]>;

export class OpenAIAgentProvider<TOutput> extends AgentProvider<TOutput> {
  private agent: OpenAIAgent<any, any>;

  constructor(config: AgentProviderConfig<TOutput> & { agentOptions?: OpenAIAgentOptions }) {
    super(config);
    this.agent = new OpenAIAgent({
      name: config.name,
      instructions: config.instructions,
      model: config.model,
      outputType: config.outputType as z.ZodTypeAny,
      ...config.agentOptions,
    });
  }

  async run(input?: AgentPrompt): Promise<AgentRunResult<TOutput>> {
    const apiKey = this.config.apiKey ?? AgentSecrets.getOpenAIKey();
    if (!process.env.OPENAI_API_KEY && apiKey) {
      process.env.OPENAI_API_KEY = apiKey;
    }
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required to run OpenAI agents');
    }

    const normalizedInput = Array.isArray(input)
      ? input.map(OpenAIAgentProvider.toAgentInput)
      : input ?? '';

    const response = await runOpenAI(this.agent, normalizedInput as any);

    if (this.config.outputType && response.finalOutput === undefined) {
      throw new Error('OpenAI agent did not return structured output');
    }

    return {
      finalOutput: response.finalOutput as TOutput,
      history: response.history.map(OpenAIAgentProvider.toAgentMessage),
      rawText: OpenAIAgentProvider.extractFinalText(response.finalOutput),
    };
  }

  private static toAgentInput(message: AgentMessage): AgentInputItem {
    return { role: message.role, content: message.content };
  }

  private static toAgentMessage(item: AgentInputItem): AgentMessage {
    return {
      role: (item.role as AgentMessage['role']) ?? 'assistant',
      content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content),
    };
  }

  private static extractFinalText(finalOutput?: unknown): string | undefined {
    if (typeof finalOutput === 'string') {
      return finalOutput;
    }
    return undefined;
  }
}
