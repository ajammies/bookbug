import { StoryDraft, StoryIntake } from '../protocols/storyProtocols.js';
import { logger as defaultLogger } from '@bookbug/shared';
export interface AuthorAgentConfig {
    model?: string;
    log?: typeof defaultLogger;
}
export declare class AuthorAgent {
    private readonly agent;
    private readonly log;
    constructor({ model, log }?: AuthorAgentConfig);
    draft(intake: StoryIntake): Promise<StoryDraft>;
}
//# sourceMappingURL=authorAgent.d.ts.map