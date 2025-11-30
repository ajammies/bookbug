import { input, select, Separator } from '@inquirer/prompts';
import ora from 'ora';
import type { StoryBrief, StoryWithPlot } from '../../core/schemas';
import { plotAgent } from '../../core/agents/plot';
import {
  plotConversationAgent,
  type BlurbMessage,
} from '../../core/agents/plot-conversation';
import { plotInterpreterAgent } from '../../core/agents/plot-interpreter';

/**
 * LLM-driven plot iteration flow
 *
 * 1. Generate initial plot beats from StoryBrief
 * 2. Compose StoryWithPlot = { ...brief, plot: PlotStructure }
 * 3. Present to user with chips for improvements
 * 4. Apply changes and iterate until approved
 */
export async function runPlotIntake(brief: StoryBrief): Promise<StoryWithPlot> {
  console.log('\nLet\'s plan your story\'s plot beats!\n');

  // Step 1: Generate initial plot structure
  const spinner = ora('Creating plot outline...').start();
  const plot = await plotAgent(brief);
  spinner.stop();

  // Step 2: Compose StoryWithPlot
  let currentStory: StoryWithPlot = { ...brief, plot };

  const history: BlurbMessage[] = [];

  // Step 3: Iterate until approved
  while (true) {
    const responseSpinner = ora('Preparing...').start();
    const response = await plotConversationAgent(currentStory, history);
    responseSpinner.stop();

    if (response.isApproved) {
      console.log('\nPlot approved! Moving on to writing...\n');
      return currentStory;
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

    // Apply changes - interpreter returns new PlotStructure
    const updateSpinner = ora('Updating plot...').start();
    const updatedPlot = await plotInterpreterAgent(finalAnswer, currentStory);
    currentStory = { ...currentStory, plot: updatedPlot };
    updateSpinner.stop();

    // Update history
    history.push(
      { role: 'assistant', content: response.message },
      { role: 'user', content: finalAnswer }
    );
  }
}
