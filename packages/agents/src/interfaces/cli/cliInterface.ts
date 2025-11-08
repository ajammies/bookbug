// Thin CLI adapter that lets a human chat with the concierge and then
// watches the main workflow coordinate the rest.
import { MainWorkflow } from '../../workflows/mainWorkflow.js';
import { FileSystemImageStore } from '../../utils/imageStore.js';
import '../../config/loadEnv.js';
import { logger } from '../../shared/logger.js';
import { CLIChat } from '../chat/cliChat.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export async function runCliInterface(): Promise<void> {
  const chat = new CLIChat('Concierge');
  const result = await MainWorkflow.run({ imageStore: new FileSystemImageStore(), log: logger, chat });

  logger.info(
    {
      title: result.draft.title,
      pages: result.draft.pages.length,
      renders: result.renders.length,
    },
    'Story generation complete'
  );
}

const isDirectExecution = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(import.meta.url) === path.resolve(entry);
})();

if (isDirectExecution) {
  runCliInterface().catch((error) => {
    logger.error({ err: error }, 'CLI interface crashed');
    process.exit(1);
  });
}
