import { AuthorAgent } from '../agents/authorAgent.js';
import { ArtDirectorAgent } from '../agents/artDirectorAgent.js';
import { IllustratorAgent } from '../agents/illustratorAgent.js';
import { type StoryDraft, type IllustrationPlan, type RenderedImage, type StoryBrief } from '../protocols/storyProtocols.js';
import type { ImageStore } from '../utils/imageStore.js';
import { logger as defaultLogger } from '../shared/logger.js';
export interface BriefToBookOptions {
    brief: StoryBrief;
}
export declare class BriefToBookWorkflow {
    private readonly imageStore;
    private readonly log;
    private readonly author;
    private readonly artDirector;
    private readonly illustrator;
    constructor(imageStore: ImageStore, author?: AuthorAgent, artDirector?: ArtDirectorAgent, illustrator?: IllustratorAgent, log?: typeof defaultLogger);
    run(options: BriefToBookOptions): Promise<{
        draft: StoryDraft;
        plan: IllustrationPlan;
        renders: RenderedImage[];
    }>;
}
//# sourceMappingURL=briefToBookWorkflow.d.ts.map