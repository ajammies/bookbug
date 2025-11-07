import readline from 'node:readline';
export class ChatCli {
    chat;
    exitToken;
    speakerLabel;
    constructor(chat, exitToken, speakerLabel = 'Agent') {
        this.chat = chat;
        this.exitToken = exitToken;
        this.speakerLabel = speakerLabel;
    }
    async run() {
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
        }
        finally {
            interfaceInstance.close();
        }
    }
    prompt(interfaceInstance) {
        return new Promise((resolve) => interfaceInstance.question('You: ', resolve));
    }
}
//# sourceMappingURL=chatCli.js.map