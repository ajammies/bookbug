import { Command } from 'commander';
import { executePipeline } from '../../core/pipeline';
import { runStoryIntake } from '../prompts/story-intake';
import { runBlurbIntake } from '../prompts/blurb-intake';
import { createSpinner, formatStep } from '../output/progress';
import { displayBook } from '../output/display';

export const createCommand = new Command('create')
  .description('Create a complete children\'s book')
  .argument('[prompt]', 'Optional initial story idea (can also provide interactively)')
  .option('-o, --output <path>', 'Output directory for generated files')
  .action(async (prompt: string | undefined, options: { output?: string }) => {
    const spinner = createSpinner();

    try {
      // Step 1: Get StoryBrief via chat intake
      const brief = await runStoryIntake(prompt);

      // Step 2: Get StoryBlurb via plot iteration
      const blurb = await runBlurbIntake(brief);

      // Step 3: Run pipeline from blurb to book
      const result = await executePipeline(blurb, {
        onProgress: (step, status) => {
          if (status === 'start') {
            spinner.start(formatStep(step));
          } else if (status === 'complete') {
            spinner.succeed(formatStep(step, true));
          }
        },
      });

      displayBook(result.book);

      if (options.output) {
        // TODO: Write files to output directory
        console.log(`\nOutput would be written to: ${options.output}`);
      }
    } catch (error) {
      spinner.fail('Pipeline failed');
      console.error(error);
      process.exit(1);
    }
  });
