import { Command } from 'commander';
import { executePipeline } from '../../core/pipeline';
import type { Manuscript, Story, Book } from '../../core/schemas';
import { runStoryIntake } from '../prompts/story-intake';
import { runBlurbIntake } from '../prompts/blurb-intake';
import { createSpinner, formatStep } from '../output/progress';
import { displayBook } from '../output/display';
import { createOutputManager, type StoryOutputManager } from '../utils/output';

export const createCommand = new Command('create')
  .description('Create a complete children\'s book')
  .argument('[prompt]', 'Optional initial story idea (can also provide interactively)')
  .option('-o, --output <path>', 'Output directory for generated files')
  .action(async (prompt: string | undefined, options: { output?: string }) => {
    const spinner = createSpinner();
    let outputManager: StoryOutputManager;

    try {
      // Step 1: Get StoryBrief via chat intake
      const brief = await runStoryIntake(prompt);

      // Create output folder after we have a title
      outputManager = await createOutputManager(brief.title);
      await outputManager.saveBrief(brief);
      console.log(`\nStory folder created: ${outputManager.folder}`);

      // Step 2: Get StoryBlurb via plot iteration
      const blurb = await runBlurbIntake(brief);
      await outputManager.saveBlurb(blurb);

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

      // Save all artifacts (pipeline always completes to 'book' stage here)
      if (result.stage !== 'book') {
        throw new Error('Pipeline did not complete');
      }
      await outputManager.saveManuscript(result.manuscript);
      await outputManager.saveStory(result.story);
      await outputManager.saveBook(result.book);

      displayBook(result.book);
      console.log(`\nAll files saved to: ${outputManager.folder}`);
    } catch (error) {
      spinner.fail('Pipeline failed');
      console.error(error);
      process.exit(1);
    }
  });
