import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { runPipeline, runPipelineIncremental, type PipelineState } from '../../core/pipeline';
import { displayBook } from '../output/display';
import { createOutputManager } from '../utils/output';
import { createLoggerToFolder } from '../../core/utils/logger';
import { createCliUI } from '../../utils/cli';
import { manuscriptAgent } from '../../core/agents';

export const createCommand = new Command('create')
  .description('Create a complete children\'s book')
  .option('-o, --output <path>', 'Output directory for generated files')
  .option('--no-save', 'Disable automatic artifact saving')
  .option('-p, --parallel', 'Run visual generation and rendering in parallel (faster but may hit rate limits)')
  .option('-m, --manuscript <path>', 'Path to manuscript file (skips intake and prose generation)')
  .action(async (options: { output?: string; save?: boolean; parallel?: boolean; manuscript?: string }) => {
    const ui = createCliUI();

    try {
      console.log('\n📚 Let\'s create a children\'s book!\n');

      const outputManager = await createOutputManager('untitled');
      const logger = createLoggerToFolder(outputManager.folder);

      console.log(`Story folder: ${outputManager.folder}`);

      let book;

      if (options.manuscript) {
        ui.progress('Reading manuscript...');
        let manuscriptContent: string;
        try {
          manuscriptContent = await readFile(options.manuscript, 'utf-8');
        } catch (err) {
          const error = err as NodeJS.ErrnoException;
          if (error.code === 'ENOENT') {
            throw new Error(`Manuscript file not found: ${options.manuscript}`);
          }
          throw new Error(`Failed to read manuscript: ${error.message}`);
        }

        if (!manuscriptContent.trim()) {
          throw new Error('Manuscript file is empty');
        }

        ui.progress('Extracting story from manuscript...');
        const { story, proseSetup, prosePages } = await manuscriptAgent(manuscriptContent, { logger });

        logger?.info(
          { title: story.title, pageCount: prosePages.length },
          'Manuscript parsed, proceeding to visual generation'
        );

        const state: PipelineState = {
          story,
          proseSetup,
          prosePages,
        };

        const result = await runPipelineIncremental(state, {
          ui,
          logger,
          outputManager: options.save !== false ? outputManager : undefined,
          parallel: options.parallel,
        });

        book = result.book;
      } else {
        const result = await runPipeline({
          ui,
          logger,
          outputManager: options.save !== false ? outputManager : undefined,
          parallel: options.parallel,
        });

        book = result.book;
      }

      ui.succeed('Book complete!');
      displayBook(book);
      console.log(`\nAll files saved to: ${outputManager.folder}`);
    } catch (error) {
      ui.fail('Pipeline failed');
      console.error(error);
      process.exit(1);
    }
  });
