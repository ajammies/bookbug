import { input, select, Separator } from '@inquirer/prompts';
import ora from 'ora';
import type { StoryBrief, StoryBlurb } from '../../core/schemas';
import { blurbGeneratorAgent } from '../../core/agents/blurb-generator';
import {
  blurbConversationAgent,
  type BlurbMessage,
} from '../../core/agents/blurb-conversation';
import { blurbInterpreterAgent } from '../../core/agents/blurb-interpreter';
import { detectApproval } from '../../core/agents/approval-detector';

/**
 * LLM-driven blurb iteration flow
 *
 * 1. Generate initial plot beats from StoryBrief
 * 2. Present to user with chips for improvements
 * 3. Apply changes and iterate until approved
 */
export async function runBlurbIntake(brief: StoryBrief): Promise<StoryBlurb> {
  console.log('\nLet\'s plan your story\'s plot beats!\n');

  // Step 1: Generate initial blurb
  const spinner = ora('Creating plot outline...').start();
  let currentBlurb = await blurbGeneratorAgent(brief);
  spinner.stop();

  const history: BlurbMessage[] = [];

  // Step 2: Iterate until approved
  while (true) {
    const responseSpinner = ora('Preparing...').start();
    const response = await blurbConversationAgent(currentBlurb, history);
    responseSpinner.stop();

    if (response.isApproved) {
      console.log('\nPlot approved! Moving on to writing...\n');
      return currentBlurb;
    }

    // Display message and chips
    console.log(`\n${response.message}\n`);

    const choices = [
      ...response.chips.map(chip => ({ name: chip, value: chip })),
      new Separator(),
      { name: 'Enter custom feedback', value: '__CUSTOM__' },
    ];

    const answer = await select({
      message: 'What would you like to do?',
      choices,
    });

    const finalAnswer = answer === '__CUSTOM__'
      ? await input({ message: 'Your feedback:' })
      : answer;

    // Use LLM to detect if user approved (handles natural language variations)
    const approvalSpinner = ora('Processing...').start();
    const isApproval = await detectApproval(finalAnswer);
    approvalSpinner.stop();

    if (isApproval) {
      console.log('\nPlot approved! Moving on to writing...\n');
      return currentBlurb;
    }

    // Apply changes
    const updateSpinner = ora('Updating plot...').start();
    currentBlurb = await blurbInterpreterAgent(finalAnswer, currentBlurb);
    updateSpinner.stop();

    // Update history
    history.push(
      { role: 'assistant', content: response.message },
      { role: 'user', content: finalAnswer }
    );
  }
}
