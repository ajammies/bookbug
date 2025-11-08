// MainWorkflow is the org chart in code: it routes work between concierge,
// author, art director, and illustrator nodes so callers see one simple interface.
import { ConciergeAgent } from '../agents/conciergeAgent.js';
import { AuthorAgent } from '../agents/authorAgent.js';
import { ArtDirectorAgent } from '../agents/artDirectorAgent.js';
import { IllustratorAgent } from '../agents/illustratorAgent.js';
import { type StoryDraft, type StoryBrief, type IllustrationPlan, type RenderedImage } from '../protocols/storyProtocols.js';
import { ChatCli } from '../interfaces/cli/chatCli.js';
import type { ImageStore } from '../utils/imageStore.js';
import { logger as defaultLogger } from '../shared/logger.js';


export interface MainWorkflowResult {
  brief: StoryBrief;
  draft: StoryDraft;
  plan: IllustrationPlan;
  renders: RenderedImage[];
}

export class MainWorkflow {
  private readonly concierge: ConciergeAgent;
  private readonly author: AuthorAgent;
  private readonly artDirector: ArtDirectorAgent;
  private readonly illustrator: IllustratorAgent;
  private readonly imageStore: ImageStore;
  private readonly log: typeof defaultLogger;

  constructor(log: typeof defaultLogger = defaultLogger) {
    this.imageStore = imageStore;
    this.log = log;
    this.concierge = concierge;
    this.author = author;
    this.artDirector = artDirector;
    this.illustrator = illustrator;
  }

  async run(): Promise<MainWorkflowResult> {
    const brief = await this.collectBrief();
    const draft = await this.author.draft(brief);
    const plan = await this.artDirector.plan(draft);
    const renders = await this.illustrator.render(draft.title, plan, this.imageStore);

    this.log.info(
      { title: draft.title, planned: plan.pages.length, rendered: renders.length },
      'Main workflow completed run'
    );

    return { brief, draft, plan, renders };
  }

  private async collectBrief(): Promise<StoryBrief> {
    const chat = this.concierge.createChat();
    const cli = new ChatCli(chat, ConciergeAgent.EXIT_TOKEN, 'Concierge');
    return cli.run();
  }
}
