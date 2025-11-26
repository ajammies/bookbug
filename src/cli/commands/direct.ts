import { Command } from 'commander';
import { runStory } from '../../core/pipeline';
import { ManuscriptSchema } from '../../core/schemas';
import { createSpinner } from '../output/progress';
import { displayStory } from '../output/display';
import { loadOutputManager, isStoryFolder, createOutputManager } from '../utils/output';

export const directCommand = new Command('direct')
  .description('Create visual direction (Story) from a Manuscript')
  .argument('<manuscript-file>', 'Path to Manuscript JSON file')
  .option('-o, --output <path>', 'Output file path for JSON')
  .action(async (manuscriptFile: string, options: { output?: string }) => {
    const spinner = createSpinner();

    try {
      // Load and validate manuscript
      spinner.start('Loading manuscript...');
      const fs = await import('fs/promises');
      const manuscriptJson = await fs.readFile(manuscriptFile, 'utf-8');
      const manuscript = ManuscriptSchema.parse(JSON.parse(manuscriptJson));
      spinner.succeed('Manuscript loaded');

      // Generate story
      spinner.start('Creating visual direction...');
      const story = await runStory(manuscript);
      spinner.succeed('Visual direction complete');

      displayStory(story);

      // Save to story folder (detect existing or create new)
      const outputManager = await isStoryFolder(manuscriptFile)
        ? await loadOutputManager(manuscriptFile)
        : await createOutputManager(story.storyTitle);
      await outputManager.saveStory(story);
      console.log(`\nStory saved to: ${outputManager.folder}/story.json`);
    } catch (error) {
      spinner.fail('Failed to create visual direction');
      console.error(error);
      process.exit(1);
    }
  });
