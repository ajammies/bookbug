import { Command } from 'commander';
import { executePipeline } from '../../core/pipeline';
import { runStoryIntake } from '../prompts/story-intake';
import { runPlotIntake } from '../prompts/plot-intake';
import { createSpinner, formatStep } from '../output/progress';
import { displayBook } from '../output/display';
import { createOutputManager, type StoryOutputManager } from '../utils/output';
import { createLogger } from '../../core/utils/logger';
import { getLogPath } from '../utils/log-tailer';

export const createCommand = new Command('create')
  .description('Create a complete children\'s book')
  .argument('[prompt]', 'Optional initial story idea (can also provide interactively)')
  .option('-o, --output <path>', 'Output directory for generated files')
  .option('--no-save', 'Disable automatic artifact saving')
  .action(async (prompt: string | undefined, options: { output?: string; save?: boolean }) => {
    const spinner = createSpinner();
    let outputManager: StoryOutputManager;

    // Create logger for file logging
    const logger = createLogger();
    const runId = logger.bindings()?.runId as string | undefined;
    const logPath = runId ? getLogPath(runId) : null;

    try {
      // Step 1: Get StoryBrief via chat intake
      const brief = await runStoryIntake(prompt);

      // Create output folder after we have a title
      outputManager = await createOutputManager(brief.title);
      await outputManager.saveBrief(brief);
      console.log(`\nStory folder created: ${outputManager.folder}`);
      if (logPath) {
        console.log(`Logging to: ${logPath}`);
      }

      // Step 2: Get StoryWithPlot via plot iteration
      const storyWithPlot = await runPlotIntake(brief);
      await outputManager.saveBlurb(storyWithPlot);

      // Step 3: Run pipeline from StoryWithPlot to book
      const { book } = await executePipeline(storyWithPlot, {
        logger,
        onProgress: (step, status) => {
          if (status === 'start') {
            spinner.start(formatStep(step));
          } else if (status === 'complete') {
            spinner.succeed(formatStep(step, true));
          }
        },
        onThinking: (msg) => {
          spinner.text = msg;
        },
        outputManager: options.save !== false ? outputManager : undefined,
      });

      displayBook(book);
      console.log(`\nAll files saved to: ${outputManager.folder}`);
    } catch (error) {
      spinner.fail('Pipeline failed');
      console.error(error);
      process.exit(1);
    }
  });
