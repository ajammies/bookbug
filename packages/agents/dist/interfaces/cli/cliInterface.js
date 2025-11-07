// Thin CLI adapter that lets a human chat with the concierge and then
// watches the main workflow coordinate the rest.
import { MainWorkflow } from '../../workflows/mainWorkflow.js';
import { FileSystemImageStore } from '../../utils/imageStore.js';
import { logger } from '@bookbug/shared';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export async function runCliInterface() {
    const workflow = new MainWorkflow(new FileSystemImageStore(), undefined, undefined, undefined, undefined, logger);
    const result = await workflow.run({ exitToken: '[READY_TO_EXTRACT]' });
    logger.info({
        title: result.draft.title,
        pages: result.draft.pages.length,
        renders: result.renders.length,
    }, 'Story generation complete');
}
const isDirectExecution = (() => {
    const entry = process.argv[1];
    if (!entry)
        return false;
    return fileURLToPath(import.meta.url) === path.resolve(entry);
})();
if (isDirectExecution) {
    runCliInterface().catch((error) => {
        logger.error({ err: error }, 'CLI interface crashed');
        process.exit(1);
    });
}
//# sourceMappingURL=cliInterface.js.map