import { AgentSecrets } from '../../providers/agentSecrets.js';
import {
  AgentProvider,
  type AgentProviderConfig,
  type AgentPrompt,
  type AgentRunResult,
  type AgentMessage,
} from './agentProvider.js';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_VERSION = '2023-06-01';

export type ClaudeRequestOverrides = {
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  metadata?: Record<string, string>;
  thinking?: { type: 'enabled'; budget_tokens: number };
};

export class ClaudeAgentProvider<TOutput> extends AgentProvider<TOutput> {
  private requestOptions: Partial<ClaudeRequestOverrides>;

  constructor(config: AgentProviderConfig<TOutput> & { requestOptions?: Partial<ClaudeRequestOverrides> }) {
    super(config);
    this.requestOptions = config.requestOptions ?? {};
  }

  setRequestOptions(options: Partial<ClaudeRequestOverrides>): void {
    this.requestOptions = { ...this.requestOptions, ...options };
  }

  async run(input?: AgentPrompt): Promise<AgentRunResult<TOutput>> {
    const apiKey = this.config.apiKey ?? AgentSecrets.getAnthropicKey();
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required to run Claude agents');
    }

    const agentMessages = this.prepareMessages(input);
    const effectiveMessages = agentMessages.length > 0 ? agentMessages : [ClaudeAgentProvider.defaultAgentMessage()];
    const payloadMessages = effectiveMessages.map(ClaudeAgentProvider.toAnthropicMessage);

    const fetchImpl = globalThis.fetch;
    if (!fetchImpl) {
      throw new Error('Fetch API is not available in this runtime');
    }

    const { max_tokens: overrideMaxTokens, ...restOverrides } = this.requestOptions;
    const payload: AnthropicMessageRequest & Partial<ClaudeRequestOverrides> = {
      ...restOverrides,
      model: this.config.model,
      max_tokens: overrideMaxTokens ?? this.config.maxOutputTokens ?? 2048,
      system: this.config.instructions,
      messages: payloadMessages,
    };

    const response = await fetchImpl(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': CLAUDE_API_VERSION,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude request failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as AnthropicMessageResponse;
    const rawText = (data.content ?? [])
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('\n')
      .trim();

    const finalOutput = this.config.outputType ? this.parseStructured(rawText) : (rawText as TOutput | string);
    const assistantMessage: AgentMessage = { role: 'assistant', content: rawText };
    if (agentMessages.length === 0) {
      this.history = [ClaudeAgentProvider.defaultAgentMessage(), assistantMessage];
    } else {
      this.history.push(assistantMessage);
    }

    return {
      finalOutput,
      history: this.history,
      rawText,
    };
  }

  private parseStructured(text: string): TOutput {
    if (!this.config.outputType) {
      throw new Error('outputType is required for structured Claude responses');
    }
    const jsonPayload = ClaudeAgentProvider.extractJson(text);
    const parsed = JSON.parse(jsonPayload);
    return this.config.outputType.parse(parsed);
  }

  private static toAnthropicMessage(message: AgentMessage): AnthropicMessage {
    if (message.role === 'assistant') {
      return { role: 'assistant', content: [{ type: 'text', text: message.content }] };
    }
    return { role: 'user', content: [{ type: 'text', text: message.content }] };
  }

  private static extractJson(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Claude response was empty when JSON was expected');
    }

    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      const first = trimmed.indexOf('{');
      const last = trimmed.lastIndexOf('}');
      if (first === -1 || last === -1 || last <= first) {
        throw new Error('Claude response did not contain valid JSON');
      }
      const candidate = trimmed.slice(first, last + 1);
      JSON.parse(candidate);
      return candidate;
    }
  }

  private static defaultAgentMessage(): AgentMessage {
    return { role: 'user', content: 'Follow the system instructions and respond.' };
  }
}

export type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: { type: 'text'; text: string }[];
};

export type AnthropicMessageRequest = {
  model: string;
  max_tokens: number;
  system: string;
  messages: AnthropicMessage[];
};

export type AnthropicMessageResponse = {
  content?: Array<{ type: string; text?: string }>;
};
