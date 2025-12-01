import { Command } from 'commander';
import path from 'path';
import ora from 'ora';
import { runPipeline, type OnStep } from '../../core/pipeline';
import { extractorAgent } from '../../core/agents';
import { listStyles } from '../../core/services/style-loader';
import type { PartialStory } from '../../core/schemas';
import { createSpinner } from '../output/progress';
import { displayBook } from '../output/display';
import { createOutputManager } from '../utils/output';
import { createLogger } from '../../core/utils/logger';
import { showSelector } from '../../utils/cli';

const STEP_MESSAGES: Record<string, string> = {
  // Note: intake/plot don't use spinners (interactive stages)
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

    try {
      console.log('\n📚 Let\'s create a children\'s book!\n');

      // Create output manager with temporary name, will be updated when we have title
      const outputManager = await createOutputManager('untitled');
      const logger = createLogger({ title: 'create' });
      const logName = logger.bindings()?.name as string | undefined;
      const logPath = logName ? path.join(process.cwd(), 'logs', `${logName}.log`) : null;

      console.log(`Story folder: ${outputManager.folder}`);
      if (logPath) console.log(`Logging to: ${logPath}`);

      // If user provided initial prompt, extract story details from it
      let initialStory: PartialStory = {};
      if (prompt?.trim()) {
        const extractSpinner = ora('Understanding your story...').start();
        const availableStyles = await listStyles();
        initialStory = await extractorAgent(prompt, {}, { availableStyles, logger });
        extractSpinner.stop();
      }

      const onStep: OnStep = (step) => spinner.start(stepMessage(step));

      const { book } = await runPipeline(initialStory, {
        promptUser: showSelector,
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
