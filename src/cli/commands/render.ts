import { Command } from 'commander';
import { runBook } from '../../core/pipeline';
import { StorySchema, type BookFormatKey } from '../../core/schemas';
import { createSpinner } from '../output/progress';
import { displayBook } from '../output/display';
import { loadOutputManager, isStoryFolder, createOutputManager } from '../utils/output';

interface RenderOptions {
  output?: string;
  mock?: boolean;
  format?: BookFormatKey;
}

export const renderCommand = new Command('render')
  .description('Render a Book from a Story (generate images)')
  .argument('<story-file>', 'Path to Story JSON file')
  .option('-o, --output <path>', 'Output directory for book files')
  .option('-m, --mock', 'Use mock images instead of real generation')
  .option('-f, --format <format>', 'Book format: square-small, square-large, landscape, portrait-small, portrait-large', 'square-large')
  .action(async (storyFile: string, options: RenderOptions) => {
    const spinner = createSpinner();

    try {
      // Load and validate story
      spinner.start('Loading story...');
      const fs = await import('fs/promises');
      const storyJson = await fs.readFile(storyFile, 'utf-8');
      const story = StorySchema.parse(JSON.parse(storyJson));
      spinner.succeed('Story loaded');

      // Generate book
      const totalPages = story.pages.length;
      spinner.start(`Rendering ${totalPages} pages${options.mock ? ' (mock mode)' : ''}...`);

      const book = await runBook(story, {
        mock: options.mock,
        format: options.format,
      });
      spinner.succeed(`Rendered ${totalPages} pages`);

      displayBook(book);

      // Save to story folder (detect existing or create new)
      const outputManager = options.output
        ? await createOutputManager(book.storyTitle, options.output)
        : await isStoryFolder(storyFile)
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
