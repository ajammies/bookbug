import { AuthorAgent } from '../agents/authorAgent.js';
import { ArtDirectorAgent } from '../agents/artDirectorAgent.js';
import { IllustratorAgent } from '../agents/illustratorAgent.js';
import { type StoryDraft, type IllustrationPlan, type RenderedImage, type StoryIntake } from '../protocols/storyProtocols.js';
import type { ImageStore } from '../utils/imageStore.js';
import { logger as defaultLogger } from '@bookbug/shared';
export interface IntakeBypassOptions {
    intake: StoryIntake;
}
export declare class IntakeBypassWorkflow {
    private readonly imageStore;
    private readonly log;
    private readonly author;
    private readonly artDirector;
    private readonly illustrator;
    constructor(imageStore: ImageStore, author?: AuthorAgent, artDirector?: ArtDirectorAgent, illustrator?: IllustratorAgent, log?: typeof defaultLogger);
    run(options: IntakeBypassOptions): Promise<{
        draft: StoryDraft;
        plan: IllustrationPlan;
        renders: RenderedImage[];
    }>;
}
//# sourceMappingURL=intakeBypassWorkflow.d.ts.map