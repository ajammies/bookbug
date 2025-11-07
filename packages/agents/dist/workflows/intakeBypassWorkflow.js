import { AuthorAgent } from '../agents/authorAgent.js';
import { ArtDirectorAgent } from '../agents/artDirectorAgent.js';
import { IllustratorAgent } from '../agents/illustratorAgent.js';
import { StoryIntakeSchema } from '../protocols/storyProtocols.js';
import { logger as defaultLogger } from '@bookbug/shared';
export class IntakeBypassWorkflow {
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
        const intake = StoryIntakeSchema.parse(options.intake);
        const draft = await this.author.draft(intake);
        const plan = await this.artDirector.plan(draft);
        const renders = await this.illustrator.render(draft.title, plan, this.imageStore);
        this.log.info({ title: draft.title }, 'Bypass workflow completed run');
        return { draft, plan, renders };
    }
}
//# sourceMappingURL=intakeBypassWorkflow.js.map