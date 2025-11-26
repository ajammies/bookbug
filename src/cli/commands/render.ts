import { Command } from 'commander';
import { runBook } from '../../core/pipeline';
import { StorySchema } from '../../core/schemas';
import { createSpinner } from '../output/progress';
import { displayBook } from '../output/display';
import { loadOutputManager, isStoryFolder, createOutputManager } from '../utils/output';

export const renderCommand = new Command('render')
  .description('Render a Book from a Story (generate images)')
  .argument('<story-file>', 'Path to Story JSON file')
  .option('-o, --output <path>', 'Output directory for book files')
  .action(async (storyFile: string, options: { output?: string }) => {
    const spinner = createSpinner();

    try {
      // Load and validate story
      spinner.start('Loading story...');
      const fs = await import('fs/promises');
      const storyJson = await fs.readFile(storyFile, 'utf-8');
      const story = StorySchema.parse(JSON.parse(storyJson));
      spinner.succeed('Story loaded');

      // Generate book
      spinner.start('Rendering illustrations...');
      const book = await runBook(story);
      spinner.succeed('Illustrations complete');

      displayBook(book);

      // Save to story folder (detect existing or create new)
      const outputManager = await isStoryFolder(storyFile)
        ? await loadOutputManager(storyFile)
        : await createOutputManager(book.storyTitle);
      await outputManager.saveBook(book);
      console.log(`\nBook saved to: ${outputManager.folder}/book.json`);
    } catch (error) {
      spinner.fail('Failed to render book');
      console.error(error);
      process.exit(1);
    }
  });
