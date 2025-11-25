import { input, select, Separator } from '@inquirer/prompts';
import ora from 'ora';
import { StoryBriefSchema, type StoryBrief } from '../../core/schemas';
import {
  interpreterAgent,
  conversationAgent,
  type Message,
} from '../../core/agents';

/**
 * LLM-driven conversational story intake
 * Uses two agents:
 * - Interpreter: extracts StoryBrief fields from any user input
 * - Conversation: decides what to ask next based on current brief state
 */
export async function runStoryIntake(
  initialMessage?: string
): Promise<StoryBrief> {
  let currentBrief: Partial<StoryBrief> = {};
  const history: Message[] = [];

  console.log('\n📚 Let\'s create a children\'s book!\n');

  // Handle optional initial message (e.g., full story paste)
  if (initialMessage) {
    const spinner = ora('Understanding your story...').start();
    currentBrief = await interpreterAgent(initialMessage, currentBrief);
    spinner.stop();

    history.push(
      { role: 'assistant', content: 'Tell me about your story!' },
      { role: 'user', content: initialMessage }
    );
  }

  while (true) {
    // Get next question from conversation agent
    const spinner = ora('Thinking...').start();
    const response = await conversationAgent(currentBrief, history);
    spinner.stop();

    if (response.isComplete) {
      return buildFinalBrief(currentBrief);
    }

    // Display question and chips
    const choices = [
      ...response.chips.map(chip => ({ name: chip, value: chip })),
      new Separator(),
      { name: 'Enter custom response', value: '__CUSTOM__' },
    ];

    const answer = await select({
      message: response.question,
      choices,
    });

    const finalAnswer = answer === '__CUSTOM__'
      ? await input({ message: 'Your response:' })
      : answer;

    // Interpret user's answer and update brief
    const updateSpinner = ora('Processing...').start();
    currentBrief = await interpreterAgent(finalAnswer, currentBrief);
    updateSpinner.stop();

    // Update conversation history
    history.push(
      { role: 'assistant', content: response.question },
      { role: 'user', content: finalAnswer }
    );
  }
}

/**
 * Validates partial brief and returns complete StoryBrief
 * Throws if required fields are missing
 */
function buildFinalBrief(partial: Partial<StoryBrief>): StoryBrief {
  const result = StoryBriefSchema.safeParse(partial);

  if (!result.success) {
    throw new Error('Brief is incomplete: ' + result.error.message);
  }

  return result.data;
}
