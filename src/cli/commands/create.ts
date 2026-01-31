import { Command } from 'commander';
import { runPipeline } from '../../core/pipeline';
import { displayBook } from '../output/display';
import { createOutputManager } from '../utils/output';
import { createLoggerToFolder } from '../../core/utils/logger';
import { createCliUI } from '../../utils/cli';

export const createCommand = new Command('create')
  .description('Create a complete children\'s book')
  .option('-o, --output <path>', 'Output directory for generated files')
  .option('--no-save', 'Disable automatic artifact saving')
  .option('-p, --parallel', 'Run visual generation and rendering in parallel (faster but may hit rate limits)')
  .action(async (options: { output?: string; save?: boolean; parallel?: boolean }) => {
    const ui = createCliUI();

    try {
      console.log('\n📚 Let\'s create a children\'s book!\n');

      const outputManager = await createOutputManager('untitled');
      const logger = createLoggerToFolder(outputManager.folder);

      console.log(`Story folder: ${outputManager.folder}`);

      const { book } = await runPipeline({
        ui,
        logger,
        outputManager: options.save !== false ? outputManager : undefined,
        parallel: options.parallel,
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
