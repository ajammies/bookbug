import type { AgentMessage } from '../../agents/providers/agentProvider.js';

export interface ChatInterface {
  history: AgentMessage[];
  promptUser(): Promise<string>;
  showAssistantMessage(message: string): Promise<void>;
  close?(): Promise<void>;
}
