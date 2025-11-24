import { input, select, confirm } from '@inquirer/prompts';
import type { StoryBrief, StoryCharacter } from '../../core/schemas';

/**
 * Interactive wizard for collecting story information from the user
 * Uses @inquirer/prompts for terminal interaction
 */
export async function runStoryIntake(): Promise<Partial<StoryBrief>> {
  console.log('\n📚 Let\'s create a children\'s book!\n');

  const title = await input({
    message: 'What is your story title?',
    default: 'Untitled Story',
  });

  const storyArc = await input({
    message: 'What is the main theme or arc of the story?',
    default: 'A journey of discovery',
  });

  const setting = await input({
    message: 'Where does the story take place?',
    default: 'A magical forest',
  });

  const ageMin = await select({
    message: 'Minimum target age?',
    choices: [
      { name: '2 years', value: 2 },
      { name: '3 years', value: 3 },
      { name: '4 years', value: 4 },
      { name: '5 years', value: 5 },
      { name: '6 years', value: 6 },
    ],
    default: 4,
  });

  const ageMax = await select({
    message: 'Maximum target age?',
    choices: [
      { name: '5 years', value: 5 },
      { name: '6 years', value: 6 },
      { name: '7 years', value: 7 },
      { name: '8 years', value: 8 },
      { name: '10 years', value: 10 },
      { name: '12 years', value: 12 },
    ],
    default: 7,
  });

  const pageCount = await select({
    message: 'How many pages?',
    choices: [
      { name: '12 pages (short)', value: 12 },
      { name: '24 pages (standard)', value: 24 },
      { name: '32 pages (longer)', value: 32 },
    ],
    default: 24,
  });

  // Collect characters
  const characters: StoryCharacter[] = [];
  let addMore = true;

  console.log('\n👥 Now let\'s add characters:\n');

  while (addMore) {
    const name = await input({
      message: 'Character name:',
    });

    const description = await input({
      message: `Describe ${name}:`,
    });

    const role = await select({
      message: `What is ${name}'s role?`,
      choices: [
        { name: 'Protagonist (main character)', value: 'protagonist' },
        { name: 'Mentor (guide/helper)', value: 'mentor' },
        { name: 'Friend/Sidekick', value: 'friend' },
        { name: 'Antagonist', value: 'antagonist' },
        { name: 'Supporting character', value: 'supporting' },
      ],
    });

    characters.push({
      name,
      description,
      role,
      traits: [],
      notes: [],
    });

    addMore = await confirm({
      message: 'Add another character?',
      default: characters.length < 2,
    });
  }

  const tone = await input({
    message: 'What tone should the story have?',
    default: 'warm and playful',
  });

  const moral = await input({
    message: 'Is there a moral or lesson? (optional)',
    default: '',
  });

  return {
    title,
    storyArc,
    setting,
    ageRange: { min: ageMin, max: ageMax },
    pageCount,
    characters,
    tone: tone || undefined,
    moral: moral || undefined,
    interests: [],
    customInstructions: [],
  };
}
