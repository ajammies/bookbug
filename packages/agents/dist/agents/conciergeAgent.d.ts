import { StoryIntake } from '../protocols/storyProtocols.js';
import { logger as defaultLogger } from '@bookbug/shared';
export declare const READY_TO_EXTRACT_TOKEN = "[READY_TO_EXTRACT]";
export interface ConciergeChat {
    send(message: string): Promise<string>;
    extract(): Promise<StoryIntake>;
}
export interface ConciergeAgentConfig {
    model?: string;
    log?: typeof defaultLogger;
}
export declare class ConciergeAgent {
    private readonly conversationAgent;
    private readonly extractionAgent;
    private readonly log;
    constructor({ model, log }?: ConciergeAgentConfig);
    createChat(): ConciergeChat;
}
//# sourceMappingURL=conciergeAgent.d.ts.map