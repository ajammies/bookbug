import { IllustrationPlan, StoryDraft } from '../protocols/storyProtocols.js';
import { logger as defaultLogger } from '@bookbug/shared';
export interface ArtDirectorAgentConfig {
    model?: string;
    log?: typeof defaultLogger;
}
export declare class ArtDirectorAgent {
    private readonly agent;
    private readonly log;
    constructor({ model, log }?: ArtDirectorAgentConfig);
    plan(draft: StoryDraft): Promise<IllustrationPlan>;
}
export declare const DEFAULT_IMAGE_STYLE = "storybook-watercolor";
//# sourceMappingURL=artDirectorAgent.d.ts.map