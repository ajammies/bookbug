import { Command } from 'commander';
import { runManuscript } from '../../core/pipeline';
import { StoryBriefSchema } from '../../core/schemas';
import { createSpinner } from '../output/progress';
import { displayManuscript } from '../output/display';

export const writeCommand = new Command('write')
  .description('Write a manuscript from a StoryBrief')
  .argument('<brief-file>', 'Path to StoryBrief JSON file')
  .option('-o, --output <path>', 'Output file path for JSON')
  .action(async (briefFile: string, options: { output?: string }) => {
    const spinner = createSpinner();

    try {
      // Load and validate brief
      spinner.start('Loading brief...');
      const fs = await import('fs/promises');
      const briefJson = await fs.readFile(briefFile, 'utf-8');
      const brief = StoryBriefSchema.parse(JSON.parse(briefJson));
      spinner.succeed('Brief loaded');

      // Generate manuscript
      spinner.start('Writing manuscript...');
      const manuscript = await runManuscript(brief);
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
