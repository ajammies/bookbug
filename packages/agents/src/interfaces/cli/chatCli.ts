import readline from 'node:readline';

export interface ChatSession<T> {
  send(message: string): Promise<string>;
  extract(): Promise<T>;
}

export class ChatCli<T> {
  constructor(
    private readonly chat: ChatSession<T>,
    private readonly exitToken: string,
    private readonly speakerLabel = 'Agent'
  ) {}

  async run(): Promise<T> {
    const interfaceInstance = readline.createInterface({ input: process.stdin, output: process.stdout });

    try {
      while (true) {
        const userInput = await this.prompt(interfaceInstance);
        if (!userInput.trim()) {
          continue;
        }

        const reply = (await this.chat.send(userInput)).trim();
        if (reply === this.exitToken) {
          return await this.chat.extract();
        }

        console.log(`\n${this.speakerLabel}: ${reply}\n`);
      }
    } finally {
      interfaceInstance.close();
    }
  }

  private prompt(interfaceInstance: readline.Interface): Promise<string> {
    return new Promise((resolve) => interfaceInstance.question('You: ', resolve));
  }
}
