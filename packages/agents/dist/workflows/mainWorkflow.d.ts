import { ConciergeAgent } from '../agents/conciergeAgent.js';
import { AuthorAgent } from '../agents/authorAgent.js';
import { ArtDirectorAgent } from '../agents/artDirectorAgent.js';
import { IllustratorAgent } from '../agents/illustratorAgent.js';
import { type StoryDraft, type StoryIntake, type IllustrationPlan, type RenderedImage } from '../protocols/storyProtocols.js';
import type { ImageStore } from '../utils/imageStore.js';
import { logger as defaultLogger } from '@bookbug/shared';
export interface MainWorkflowOptions {
    exitToken?: string;
}
export interface MainWorkflowResult {
    intake: StoryIntake;
    draft: StoryDraft;
    plan: IllustrationPlan;
    renders: RenderedImage[];
}
export declare class MainWorkflow {
    private readonly concierge;
    private readonly author;
    private readonly artDirector;
    private readonly illustrator;
    private readonly imageStore;
    private readonly log;
    constructor(imageStore: ImageStore, concierge?: ConciergeAgent, author?: AuthorAgent, artDirector?: ArtDirectorAgent, illustrator?: IllustratorAgent, log?: typeof defaultLogger);
    run(options: MainWorkflowOptions): Promise<MainWorkflowResult>;
    private collectIntake;
}
//# sourceMappingURL=mainWorkflow.d.ts.map