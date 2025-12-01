import { Command } from 'commander';
import ora from 'ora';
import {
  StoryBriefSchema,
  hasCompleteBrief,
  type PartialStory,
  type StoryBrief,
} from '../../core/schemas';
import { extractorAgent, conversationAgent, type Message } from '../../core/agents';
import { listStyles } from '../../core/services/style-loader';
import { displayBrief } from '../output/display';
import { createOutputManager } from '../utils/output';
import { showSelector } from '../../utils/cli';

/**
 * Run story intake conversation to gather a complete brief
 */
const runIntake = async (initialPrompt?: string): Promise<StoryBrief> => {
  let story: PartialStory = {};
  const history: Message[] = [];
  const availableStyles = await listStyles();

  // Process initial prompt if provided
  if (initialPrompt) {
    const spinner = ora('Understanding your story...').start();
    story = await extractorAgent(initialPrompt, story, { availableStyles });
    spinner.stop();

    history.push(
      { role: 'assistant', content: 'Tell me about your story!' },
      { role: 'user', content: initialPrompt }
    );
  }

  // Conversation loop until brief is complete
  while (!hasCompleteBrief(story)) {
    const spinner = ora('Thinking...').start();
    const response = await conversationAgent(story, history, { availableStyles });
    spinner.stop();

    if (response.isComplete) break;

    const userInput = await showSelector({
      question: response.question,
      options: response.options,
    });

    const updateSpinner = ora('Processing...').start();
    story = await extractorAgent(userInput, story, { availableStyles });
    updateSpinner.stop();

    history.push(
      { role: 'assistant', content: response.question },
      { role: 'user', content: userInput }
    );
  }

  const result = StoryBriefSchema.safeParse(story);
  if (!result.success) {
    throw new Error('Brief is incomplete: ' + result.error.message);
  }
  return result.data;
};

export const briefCommand = new Command('brief')
  .description('Create a StoryBrief through conversational chat')
  .argument('[prompt]', 'Optional initial story idea (can also provide interactively)')
  .option('-o, --output <path>', 'Custom output folder path')
  .action(async (prompt: string | undefined, options: { output?: string }) => {
    try {
      console.log('\n📚 Let\'s create a story brief!\n');

      const brief = await runIntake(prompt);

      displayBrief(brief);

      // Save to story folder (custom path or auto-generated)
      const outputManager = await createOutputManager(brief.title, options.output);
      await outputManager.saveBrief(brief);
      console.log(`\nBrief saved to: ${outputManager.folder}/brief.json`);
    } catch (error) {
      console.error('Failed to create brief:', error);
      process.exit(1);
    }
  });
