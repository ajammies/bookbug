export interface ChatSession<T> {
    send(message: string): Promise<string>;
    extract(): Promise<T>;
}
export declare class ChatCli<T> {
    private readonly chat;
    private readonly exitToken;
    private readonly speakerLabel;
    constructor(chat: ChatSession<T>, exitToken: string, speakerLabel?: string);
    run(): Promise<T>;
    private prompt;
}
//# sourceMappingURL=chatCli.d.ts.map