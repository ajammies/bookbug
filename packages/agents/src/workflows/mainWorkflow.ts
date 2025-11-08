// MainWorkflow orchestrates concierge intake, story drafting, art direction,
// and illustration so callers get one cohesive pipeline per run.
import { ConciergeAgent } from '../agents/conciergeAgent.js';
import { AuthorAgent } from '../agents/authorAgent.js';
import { ArtDirectorAgent } from '../agents/artDirectorAgent.js';
import { IllustratorAgent } from '../agents/illustratorAgent.js';
import { ChatCli } from '../interfaces/cli/chatCli.js';
import {
  type IllustrationPlan,
  type RenderedImage,
  type StoryBrief,
  type StoryDraft,
} from '../protocols/storyProtocols.js';
import { FileSystemImageStore } from '../utils/imageStore.js';
import type { ImageStore } from '../utils/imageStore.js';
import { logger as defaultLogger } from '../shared/logger.js';

export interface MainWorkflowOptions {
  imageStore?: ImageStore;
  concierge?: ConciergeAgent;
  author?: AuthorAgent;
  artDirector?: ArtDirectorAgent;
  illustrator?: IllustratorAgent;
  log?: typeof defaultLogger;
}

export interface MainWorkflowResult {
  brief: StoryBrief;
  draft: StoryDraft;
  plan: IllustrationPlan;
  renders: RenderedImage[];
}

export class MainWorkflow {
  static async run(options: MainWorkflowOptions = {}): Promise<MainWorkflowResult> {
    const log = options.log ?? defaultLogger;
    const imageStore = options.imageStore ?? new FileSystemImageStore();
    const concierge = options.concierge ?? new ConciergeAgent(log);
    const author = options.author ?? new AuthorAgent(log);
    const artDirector = options.artDirector ?? new ArtDirectorAgent(log);
    const illustrator = options.illustrator ?? new IllustratorAgent(log);

    const brief = await MainWorkflow.collectBrief(concierge);
    const draft = await author.draft(brief);
    const plan = await artDirector.plan(draft);
    const renders = await illustrator.render(draft.title, plan, imageStore);

    log.info({ title: draft.title, planned: plan.pages.length, rendered: renders.length }, 'Main workflow completed run');

    return { brief, draft, plan, renders };
  }

  private static async collectBrief(concierge: ConciergeAgent): Promise<StoryBrief> {
    const chat = concierge.createChat();
    const cli = new ChatCli(chat, ConciergeAgent.EXIT_TOKEN, 'Concierge');
    return cli.run();
  }
}
