import { Command } from 'commander';
import { runBrief } from '../../core/pipeline';
import { createSpinner } from '../output/progress';
import { displayBrief } from '../output/display';

export const briefCommand = new Command('brief')
  .description('Extract a StoryBrief from a prompt')
  .argument('<prompt>', 'Story idea or description')
  .option('-o, --output <path>', 'Output file path for JSON')
  .action(async (prompt: string, options: { output?: string }) => {
    const spinner = createSpinner();
    spinner.start('Extracting story brief...');

    try {
      const brief = await runBrief(prompt);
      spinner.succeed('Brief extracted');

      displayBrief(brief);

      if (options.output) {
        const fs = await import('fs/promises');
        await fs.writeFile(options.output, JSON.stringify(brief, null, 2));
        console.log(`\nBrief saved to: ${options.output}`);
      }
    } catch (error) {
      spinner.fail('Failed to extract brief');
      console.error(error);
      process.exit(1);
    }
  });
