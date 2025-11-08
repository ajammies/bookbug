import readline from 'node:readline';
import { type AgentMessage } from '../../agents/providers/agentProvider.js';
import type { ChatInterface } from './chatInterface.js';

export class CLIChat implements ChatInterface {
  readonly history: AgentMessage[] = [];
  private readonly rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  constructor(private readonly speakerLabel = 'Agent') {}

  async promptUser(): Promise<string> {
    const input = await new Promise<string>((resolve) => this.rl.question('You: ', resolve));
    this.history.push({ role: 'user', content: input });
    return input;
  }

  async showAssistantMessage(message: string): Promise<void> {
    this.history.push({ role: 'assistant', content: message });
    console.log(`\n${this.speakerLabel}: ${message}\n`);
  }

  async close(): Promise<void> {
    this.rl.close();
  }
}
