import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorySchema } from '../../core/schemas';
import { createSpinner } from '../output/progress';
import { displayBook } from '../output/display';
import { loadOutputManager, isStoryFolder, createOutputManager } from '../utils/output';
import { illustratorAgent, type IllustratorConfig } from '../../core/agents';
import { downloadImage } from '../../core/services/image-generation';

interface RenderOptions {
  output?: string;
  mock?: boolean;
  model?: 'flux-schnell' | 'sdxl' | 'nano-banana-pro';
  download?: boolean;
}

export const renderCommand = new Command('render')
  .description('Render a Book from a Story (generate images)')
  .argument('<story-file>', 'Path to Story JSON file')
  .option('-o, --output <path>', 'Output directory for book files')
  .option('-m, --mock', 'Use mock images instead of real generation')
  .option('--model <model>', 'Image model: flux-schnell (default), sdxl, nano-banana-pro')
  .option('-d, --download', 'Download images to local assets folder')
  .action(async (storyFile: string, options: RenderOptions) => {
    const spinner = createSpinner();

    try {
      // Load and validate story
      spinner.start('Loading story...');
      const storyJson = await fs.readFile(storyFile, 'utf-8');
      const story = StorySchema.parse(JSON.parse(storyJson));
      spinner.succeed('Story loaded');

      // Count total beats for progress
      const totalBeats = story.pages.reduce((sum, p) => sum + p.beats.length, 0);
      let completedBeats = 0;

      // Configure illustrator
      const config: IllustratorConfig = {
        mock: options.mock ?? false,
        model: options.model ?? 'flux-schnell',
        onImageGenerated: (pageNumber, beatOrder, _url) => {
          completedBeats++;
          spinner.text = `Rendering illustrations... (${completedBeats}/${totalBeats}) Page ${pageNumber}, Beat ${beatOrder}`;
        },
      };

      // Generate book
      spinner.start(`Rendering illustrations... (0/${totalBeats})`);
      const book = await illustratorAgent(story, config);
      spinner.succeed(`Rendered ${totalBeats} illustrations`);

      // Set up output manager
      const outputManager = options.output
        ? await createOutputManager(book.storyTitle, options.output)
        : await isStoryFolder(storyFile)
          ? await loadOutputManager(storyFile)
          : await createOutputManager(book.storyTitle);

      // Download images if requested
      if (options.download && !options.mock) {
        spinner.start('Downloading images...');
        let downloadedCount = 0;

        for (const page of book.pages) {
          for (const image of page.images) {
            try {
              const imageBuffer = await downloadImage(image.url);
              const filename = `${image.id}.png`;
              const imagePath = path.join(outputManager.folder, 'assets', filename);
              await fs.writeFile(imagePath, imageBuffer);

              // Update the image URL to local path
              image.url = `assets/${filename}`;
              downloadedCount++;
              spinner.text = `Downloading images... (${downloadedCount}/${totalBeats})`;
            } catch (err) {
              console.warn(`\nWarning: Failed to download image ${image.id}: ${err}`);
            }
          }
        }
        spinner.succeed(`Downloaded ${downloadedCount} images`);
      }

      // Save book
      await outputManager.saveBook(book);

      displayBook(book);
      console.log(`\nBook saved to: ${outputManager.folder}/book.json`);

      if (options.download && !options.mock) {
        console.log(`Images saved to: ${outputManager.folder}/assets/`);
      }
    } catch (error) {
      spinner.fail('Failed to render book');
      console.error(error);
      process.exit(1);
    }
  });
