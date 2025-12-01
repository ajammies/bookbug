import ora from 'ora';
import type { StoryBrief, StoryWithPlot } from '../../core/schemas';
import { plotAgent } from '../../core/agents/plot';
import {
  plotConversationAgent,
  type PlotMessage,
} from '../../core/agents/plot-conversation';
import { plotInterpreterAgent } from '../../core/agents/plot-interpreter';
import { showSelector } from '../../utils/cli';

/**
 * LLM-driven plot iteration flow
 *
 * 1. Generate initial plot beats from StoryBrief
 * 2. Compose StoryWithPlot = { ...brief, plot: PlotStructure }
 * 3. Present to user with options for improvements
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

  const history: PlotMessage[] = [];

  // Step 3: Iterate until approved
  while (true) {
    const responseSpinner = ora('Preparing...').start();
    const response = await plotConversationAgent(currentStory, history);
    responseSpinner.stop();

    if (response.isComplete) {
      console.log('\nPlot approved! Moving on to writing...\n');
      return currentStory;
    }

    // Display message and options
    console.log(`\n${response.message}\n`);

    const finalAnswer = await showSelector({
      question: 'What would you like to do?',
      options: response.options,
    });

    // Apply changes - interpreter returns partial updates
    const updateSpinner = ora('Updating story...').start();
    const updates = await plotInterpreterAgent(finalAnswer, currentStory);
    currentStory = { ...currentStory, ...updates };
    updateSpinner.stop();

    // Update history
    history.push(
      { role: 'assistant', content: response.message },
      { role: 'user', content: finalAnswer }
    );
  }
}
