import { input, select, Separator } from '@inquirer/prompts';
import ora from 'ora';
import type { StoryBrief, StoryWithPlot } from '../../core/schemas';
import { plotAgent } from '../../core/agents/plot';
import {
  plotConversationAgent,
  type BlurbMessage,
} from '../../core/agents/plot-conversation';
import { plotInterpreterAgent } from '../../core/agents/plot-interpreter';
import { blurbConfirmationAgent } from '../../core/agents/blurb-confirmation';

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
  let plot = await plotAgent(brief);
  spinner.stop();

  // Step 2: Blurb confirmation - agent handles all logic, CLI just displays
  console.log(`\nHere's the essence of your story:\n`);
  console.log(`"${plot.storyArcSummary}"\n`);

  let blurbSpinner = ora('Preparing options...').start();
  let blurbResponse = await blurbConfirmationAgent(brief, plot);
  blurbSpinner.stop();

  while (!blurbResponse.isApproved) {
    console.log(`\n${blurbResponse.message}\n`);

    const answer = await select({
      message: 'What would you like to do?',
      choices: [
        ...blurbResponse.chips.map(chip => ({ name: chip, value: chip })),
        new Separator(),
        { name: 'Enter custom feedback', value: '__CUSTOM__' },
      ],
    });

    const userResponse = answer === '__CUSTOM__'
      ? await input({ message: 'Your feedback:' })
      : answer;

    // Agent handles everything: decision-making, plot regeneration, new chips
    blurbSpinner = ora('Processing...').start();
    blurbResponse = await blurbConfirmationAgent(brief, blurbResponse.plot, userResponse);
    blurbSpinner.stop();

    // Show updated essence if plot changed
    if (blurbResponse.plot.storyArcSummary !== plot.storyArcSummary) {
      plot = blurbResponse.plot;
      console.log(`\nUpdated essence:\n"${plot.storyArcSummary}"\n`);
    }
  }

  plot = blurbResponse.plot;

  // Step 3: Compose StoryWithPlot
  let currentStory: StoryWithPlot = { ...brief, plot };

  const history: BlurbMessage[] = [];

  // Step 4: Iterate until approved
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
