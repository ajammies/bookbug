import { AuthorAgent } from '../agents/authorAgent.js';
import { ArtDirectorAgent } from '../agents/artDirectorAgent.js';
import { IllustratorAgent } from '../agents/illustratorAgent.js';
import { StoryBriefSchema, type StoryDraft, type IllustrationPlan, type RenderedImage, type StoryBrief } from '../protocols/storyProtocols.js';
import type { ImageStore } from '../utils/imageStore.js';
import { logger as defaultLogger } from '../shared/logger.js';

export interface BriefToBookOptions {
  brief: StoryBrief;
}

export class BriefToBookWorkflow {
  private readonly author: AuthorAgent;
  private readonly artDirector: ArtDirectorAgent;
  private readonly illustrator: IllustratorAgent;

  constructor(
    private readonly imageStore: ImageStore,
    author = new AuthorAgent(),
    artDirector = new ArtDirectorAgent(),
    illustrator = new IllustratorAgent(),
    private readonly log: typeof defaultLogger = defaultLogger
  ) {
    this.author = author;
    this.artDirector = artDirector;
    this.illustrator = illustrator;
  }

  async run(options: BriefToBookOptions): Promise<{ draft: StoryDraft; plan: IllustrationPlan; renders: RenderedImage[] }> {
    const brief = StoryBriefSchema.parse(options.brief);
    const draft = await this.author.draft(brief);
    const plan = await this.artDirector.plan(draft);
    const renders = await this.illustrator.render(draft.title, plan, this.imageStore);

    this.log.info({ title: draft.title }, 'Bypass workflow completed run');
    return { draft, plan, renders };
  }
}
