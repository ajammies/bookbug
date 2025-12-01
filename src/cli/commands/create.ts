import { Command } from 'commander';
import path from 'path';
import { runPipeline } from '../../core/pipeline';
import { displayBook } from '../output/display';
import { createOutputManager } from '../utils/output';
import { createLogger } from '../../core/utils/logger';
import { createCliUI } from '../../utils/cli';

export const createCommand = new Command('create')
  .description('Create a complete children\'s book')
  .option('-o, --output <path>', 'Output directory for generated files')
  .option('--no-save', 'Disable automatic artifact saving')
  .action(async (options: { output?: string; save?: boolean }) => {
    const ui = createCliUI();

    try {
      console.log('\n📚 Let\'s create a children\'s book!\n');

      const outputManager = await createOutputManager('untitled');
      const logger = createLogger({ title: 'create' });
      const logName = logger.bindings()?.name as string | undefined;
      const logPath = logName ? path.join(process.cwd(), 'logs', `${logName}.log`) : null;

      console.log(`Story folder: ${outputManager.folder}`);
      if (logPath) console.log(`Logging to: ${logPath}`);

      const { book } = await runPipeline({
        ui,
        logger,
        outputManager: options.save !== false ? outputManager : undefined,
      });

      ui.succeed('Book complete!');
      displayBook(book);
      console.log(`\nAll files saved to: ${outputManager.folder}`);
    } catch (error) {
      ui.fail('Pipeline failed');
      console.error(error);
      process.exit(1);
    }
  });
