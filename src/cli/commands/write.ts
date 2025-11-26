import { Command } from 'commander';
import { runManuscript } from '../../core/pipeline';
import { StoryBlurbSchema } from '../../core/schemas';
import { createSpinner } from '../output/progress';
import { displayManuscript } from '../output/display';

export const writeCommand = new Command('write')
  .description('Write a manuscript from a StoryBlurb')
  .argument('<blurb-file>', 'Path to StoryBlurb JSON file')
  .option('-o, --output <path>', 'Output file path for JSON')
  .action(async (blurbFile: string, options: { output?: string }) => {
    const spinner = createSpinner();

    try {
      // Load and validate blurb
      spinner.start('Loading blurb...');
      const fs = await import('fs/promises');
      const blurbJson = await fs.readFile(blurbFile, 'utf-8');
      const blurb = StoryBlurbSchema.parse(JSON.parse(blurbJson));
      spinner.succeed('Blurb loaded');

      // Generate manuscript
      spinner.start('Writing manuscript...');
      const manuscript = await runManuscript(blurb);
      spinner.succeed('Manuscript written');

      displayManuscript(manuscript);

      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(manuscript, null, 2));
        console.log(`\nManuscript saved to: ${options.output}`);
      }
    } catch (error) {
      spinner.fail('Failed to write manuscript');
      console.error(error);
      process.exit(1);
    }
  });
