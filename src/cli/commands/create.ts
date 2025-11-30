import { Command } from 'commander';
import path from 'path';
import { runPipelineIncremental, type PipelineState, type OnStep } from '../../core/pipeline';
import { runStoryIntake } from '../prompts/story-intake';
import { runPlotIntake } from '../prompts/plot-intake';
import { createSpinner } from '../output/progress';
import { displayBook } from '../output/display';
import { createOutputManager, type StoryOutputManager } from '../utils/output';
import { createLogger } from '../../core/utils/logger';

const STEP_MESSAGES: Record<string, string> = {
  'style-guide': 'Creating style guide...',
  'prose-setup': 'Setting up prose...',
  'character-designs': 'Generating character designs...',
};

const stepMessage = (step: string): string => {
  if (STEP_MESSAGES[step]) return STEP_MESSAGES[step];
  const match = step.match(/^page-(\d+)-(.+)$/);
  if (match?.[1] && match[2]) {
    const phaseNames: Record<string, string> = { prose: 'Writing', visuals: 'Directing', render: 'Rendering' };
    return `${phaseNames[match[2]] ?? match[2]} page ${match[1]}...`;
  }
  return `${step}...`;
};

export const createCommand = new Command('create')
  .description('Create a complete children\'s book')
  .argument('[prompt]', 'Optional initial story idea (can also provide interactively)')
  .option('-o, --output <path>', 'Output directory for generated files')
  .option('--no-save', 'Disable automatic artifact saving')
  .action(async (prompt: string | undefined, options: { output?: string; save?: boolean }) => {
    const spinner = createSpinner();
    let outputManager: StoryOutputManager;

    try {
      const brief = await runStoryIntake(prompt);

      outputManager = await createOutputManager(brief.title);
      const logger = createLogger({ title: brief.title });
      const logName = logger.bindings()?.name as string | undefined;
      const logPath = logName ? path.join(process.cwd(), 'logs', `${logName}.log`) : null;

      await outputManager.saveBrief(brief);
      console.log(`\nStory folder created: ${outputManager.folder}`);
      if (logPath) console.log(`Logging to: ${logPath}`);

      const storyWithPlot = await runPlotIntake(brief);
      await outputManager.savePlot(storyWithPlot);

      const onStep: OnStep = (step) => spinner.start(stepMessage(step));

      const pipelineState: PipelineState = {
        brief: storyWithPlot,
        plot: storyWithPlot.plot,
      };

      const { book } = await runPipelineIncremental(pipelineState, {
        logger,
        onStep,
        outputManager: options.save !== false ? outputManager : undefined,
      });

      spinner.succeed('Book complete!');
      displayBook(book);
      console.log(`\nAll files saved to: ${outputManager.folder}`);
    } catch (error) {
      spinner.fail('Pipeline failed');
      console.error(error);
      process.exit(1);
    }
  });
