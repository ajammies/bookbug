// MainWorkflow is the org chart in code: it routes work between concierge,
// author, art director, and illustrator nodes so callers see one simple interface.
import { ConciergeAgent, READY_TO_EXTRACT_TOKEN } from '../agents/conciergeAgent.js';
import { AuthorAgent } from '../agents/authorAgent.js';
import { ArtDirectorAgent } from '../agents/artDirectorAgent.js';
import { IllustratorAgent } from '../agents/illustratorAgent.js';
import { ChatCli } from '../interfaces/cli/chatCli.js';
import { logger as defaultLogger } from '@bookbug/shared';
export class MainWorkflow {
    concierge;
    author;
    artDirector;
    illustrator;
    imageStore;
    log;
    constructor(imageStore, concierge = new ConciergeAgent(), author = new AuthorAgent(), artDirector = new ArtDirectorAgent(), illustrator = new IllustratorAgent(), log = defaultLogger) {
        this.imageStore = imageStore;
        this.log = log;
        this.concierge = concierge;
        this.author = author;
        this.artDirector = artDirector;
        this.illustrator = illustrator;
    }
    async run(options) {
        const intake = await this.collectIntake(options.exitToken);
        const draft = await this.author.draft(intake);
        const plan = await this.artDirector.plan(draft);
        const renders = await this.illustrator.render(draft.title, plan, this.imageStore);
        this.log.info({ title: draft.title, planned: plan.pages.length, rendered: renders.length }, 'Main workflow completed run');
        return { intake, draft, plan, renders };
    }
    async collectIntake(exitToken) {
        const chat = this.concierge.createChat();
        const cli = new ChatCli(chat, exitToken ?? READY_TO_EXTRACT_TOKEN, 'Concierge');
        return cli.run();
    }
}
//# sourceMappingURL=mainWorkflow.js.map