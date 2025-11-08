import { AuthorAgent } from '../agents/authorAgent.js';
import { ArtDirectorAgent } from '../agents/artDirectorAgent.js';
import { IllustratorAgent } from '../agents/illustratorAgent.js';
import { StoryBriefSchema } from '../protocols/storyProtocols.js';
import { logger as defaultLogger } from '../shared/logger.js';
export class BriefToBookWorkflow {
    imageStore;
    log;
    author;
    artDirector;
    illustrator;
    constructor(imageStore, author = new AuthorAgent(), artDirector = new ArtDirectorAgent(), illustrator = new IllustratorAgent(), log = defaultLogger) {
        this.imageStore = imageStore;
        this.log = log;
        this.author = author;
        this.artDirector = artDirector;
        this.illustrator = illustrator;
    }
    async run(options) {
        const brief = StoryBriefSchema.parse(options.brief);
        const draft = await this.author.draft(brief);
        const plan = await this.artDirector.plan(draft);
        const renders = await this.illustrator.render(draft.title, plan, this.imageStore);
        this.log.info({ title: draft.title }, 'Bypass workflow completed run');
        return { draft, plan, renders };
    }
}
//# sourceMappingURL=briefToBookWorkflow.js.map