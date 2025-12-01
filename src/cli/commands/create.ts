import { Command } from 'commander';
import path from 'path';
import { runPipeline, type OnStep, type PromptConfig } from '../../core/pipeline';
import { createSpinner } from '../output/progress';
import { displayBook } from '../output/display';
import { createOutputManager, type StoryOutputManager } from '../utils/output';
import { showSelector } from '../../utils/cli';
import { createLogger } from '../../core/utils/logger';

const promptUser = (config: PromptConfig): Promise<string> =>
  showSelector({ question: config.question, options: config.options });

const STEP_MESSAGES: Record<string, string> = {
  'intake': 'Gathering story details...',
  'intake-skip': 'Story details complete, skipping intake...',
  'plot-generate': 'Creating plot outline...',
  'plot-refine': 'Refining plot...',
  'plot-skip': 'Plot complete, skipping...',
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
    let outputManager: StoryOutputManager | undefined;

    try {
      console.log('\n📚 Let\'s create a children\'s book!\n');

      const logger = createLogger({ title: 'bookbug' });
      const logName = logger.bindings()?.name as string | undefined;
      const logPath = logName ? path.join(process.cwd(), 'logs', `${logName}.log`) : null;
      if (logPath) console.log(`Logging to: ${logPath}\n`);

      const onStep: OnStep = (step) => {
        // Don't show spinner for skip messages, just log
        if (step.includes('-skip')) {
          console.log(`✓ ${stepMessage(step)}`);
        } else {
          spinner.start(stepMessage(step));
        }
      };

      const { story, book } = await runPipeline(prompt ?? '', {
        logger,
        onStep,
        promptUser,
        outputManager: undefined, // Will be set after we have a title
      });

      // Create output manager with final title and save everything
      outputManager = await createOutputManager(story.title);
      console.log(`\nStory folder created: ${outputManager.folder}`);

      if (options.save !== false) {
        await outputManager.saveBrief(story);
        await outputManager.savePlot(story);
        await outputManager.saveProse(story);
        await outputManager.saveStory(story);
        await outputManager.saveBook(book);
        for (const page of book.pages) {
          await outputManager.savePageImage(page);
        }
        if (story.characterDesigns) {
          for (const design of story.characterDesigns) {
            await outputManager.saveCharacterDesign(design);
          }
        }
      }

      spinner.succeed('Book complete!');
      displayBook(book);
      console.log(`\nAll files saved to: ${outputManager.folder}`);
    } catch (error) {
      spinner.fail('Pipeline failed');
      console.error(error);
      process.exit(1);
    }
  });
