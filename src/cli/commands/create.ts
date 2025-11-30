import { Command } from 'commander';
import path from 'path';
import { executePipeline } from '../../core/pipeline';
import { progressMessagesAgent } from '../../core/agents';
import { runStoryIntake } from '../prompts/story-intake';
import { runPlotIntake } from '../prompts/plot-intake';
import { createSpinner, createPipelineProgress } from '../output/progress';
import { displayBook } from '../output/display';
import { createOutputManager, type StoryOutputManager } from '../utils/output';
import { createLogger } from '../../core/utils/logger';

export const createCommand = new Command('create')
  .description('Create a complete children\'s book')
  .argument('[prompt]', 'Optional initial story idea (can also provide interactively)')
  .option('-o, --output <path>', 'Output directory for generated files')
  .option('--no-save', 'Disable automatic artifact saving')
  .action(async (prompt: string | undefined, options: { output?: string; save?: boolean }) => {
    const spinner = createSpinner();
    let outputManager: StoryOutputManager;

    try {
      // Step 1: Get StoryBrief via chat intake (includes art style selection)
      const brief = await runStoryIntake(prompt);

      // Create output folder and logger after we have a title
      outputManager = await createOutputManager(brief.title);
      const logger = createLogger({ title: brief.title });
      const logName = logger.bindings()?.name as string | undefined;
      const logPath = logName ? path.join(process.cwd(), 'logs', `${logName}.log`) : null;

      await outputManager.saveBrief(brief);
      console.log(`\nStory folder created: ${outputManager.folder}`);
      if (logPath) {
        console.log(`Logging to: ${logPath}`);
      }

      // Step 2: Get StoryWithPlot via plot iteration
      const storyWithPlot = await runPlotIntake(brief);
      await outputManager.savePlot(storyWithPlot);

      // Step 3: Generate witty progress messages for prose/visuals phases
      spinner.start('Preparing witty progress messages...');
      const progressMessages = await progressMessagesAgent(storyWithPlot, logger);
      spinner.succeed('Progress messages ready');

      // Step 4: Run pipeline from StoryWithPlot to book
      const { onProgress, onThinking } = createPipelineProgress({
        spinner,
        progressMessages,
      });

      const { book } = await executePipeline(storyWithPlot, {
        logger,
        onProgress,
        onThinking,
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
