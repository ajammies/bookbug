import { Command } from 'commander';
import { executePipeline } from '../../core/pipeline';
import { runStoryIntake } from '../prompts/story-intake';
import { runPlotIntake } from '../prompts/plot-intake';
import { createSpinner, formatStep } from '../output/progress';
import { displayBook } from '../output/display';
import { createOutputManager, type StoryOutputManager } from '../utils/output';
import * as fs from 'fs/promises';
import * as path from 'path';

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

      // Step 2: Get StoryWithPlot via plot iteration
      const storyWithPlot = await runPlotIntake(brief);
      await outputManager.saveBlurb(storyWithPlot);

      // Step 3: Run pipeline from StoryWithPlot to book
      const result = await executePipeline(storyWithPlot, {
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
      // Save the composed story
      await fs.writeFile(
        path.join(outputManager.folder, 'story.json'),
        JSON.stringify(result.story, null, 2)
      );
      await outputManager.saveBook(result.book);

      displayBook(result.book);
      console.log(`\nAll files saved to: ${outputManager.folder}`);
    } catch (error) {
      spinner.fail('Pipeline failed');
      console.error(error);
      process.exit(1);
    }
  });
