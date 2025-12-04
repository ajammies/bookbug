import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { renderPage, renderPageMock, createBook } from '../../core/pipeline';
import { StorySchema, type BookFormatKey, type RenderedBook, type RenderedPage } from '../../core/schemas';
import type { ImageModel } from '../../core/services/image-generation';
import { createSpinner } from '../output/progress';
import { displayBook } from '../output/display';
import { createOutputManager, getOrCreateOutputManager } from '../utils/output';
import { loadJson, downloadFile } from '../../utils';

interface RenderOptions {
  output?: string;
  mock?: boolean;
  format?: BookFormatKey;
  model?: ImageModel;
}

export const renderCommand = new Command('render')
  .description('Render a Book from a Story (generate images)')
  .argument('<story-file>', 'Path to Story JSON file')
  .option('-o, --output <path>', 'Output directory for book files')
  .option('-m, --mock', 'Use mock images instead of real generation')
  .option('-f, --format <format>', 'Book format: square-small, square-large, landscape, portrait-small, portrait-large', 'square-large')
  .option('--model <model>', 'Image generation model: nano-banana (default), flux2-dev', 'nano-banana')
  .action(async (storyFile: string, options: RenderOptions) => {
    const spinner = createSpinner();

    try {
      // Load and validate story
      spinner.start('Loading story...');
      const story = StorySchema.parse(await loadJson(storyFile));
      spinner.succeed('Story loaded');

      // Set up output manager (custom path takes precedence)
      const outputManager = options.output
        ? await createOutputManager(story.title, options.output)
        : await getOrCreateOutputManager(storyFile, story.title);

      // Ensure assets folder exists
      const assetsFolder = path.join(outputManager.folder, 'assets');
      await fs.mkdir(assetsFolder, { recursive: true });

      // Render pages one at a time (images have temporary URLs from Replicate)
      const totalPages = story.visuals.illustratedPages.length;
      const format = options.format ?? 'square-large';
      const model = options.model ?? 'nano-banana';
      const pages: RenderedPage[] = [];
      let heroPage: RenderedPage | undefined;

      for (const storyPage of story.visuals.illustratedPages) {
        spinner.start(`Rendering page ${storyPage.pageNumber}/${totalPages}${options.mock ? ' (mock)' : ` [${model}]`}...`);

        const page = options.mock
          ? renderPageMock(storyPage.pageNumber)
          : await renderPage(story, storyPage.pageNumber, { format, heroPageUrl: heroPage?.url, model });

        pages.push(page);
        if (!heroPage) heroPage = page;
        spinner.succeed(`Rendered page ${storyPage.pageNumber}/${totalPages}`);
      }

      const book = createBook(story, pages, format);

      // Download images and save locally (skip in mock mode)
      let finalBook: RenderedBook;
      if (options.mock) {
        finalBook = book;
      } else {
        spinner.start('Downloading images...');
        finalBook = await downloadAndSaveImages(book, assetsFolder, (completed, total) => {
          spinner.text = `Downloading images... (${completed}/${total})`;
        });
        spinner.succeed('Images downloaded');
      }

      displayBook(finalBook);

      // Save book with local paths
      await outputManager.saveBook(finalBook);
      console.log(`\nBook saved to: ${outputManager.folder}/book.json`);
      if (!options.mock) {
        console.log(`Images saved to: ${assetsFolder}/`);
      }
    } catch (error) {
      spinner.fail('Failed to render book');
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Download images from temporary URLs and save to local disk.
 * Returns a new RenderedBook with updated local paths.
 */
async function downloadAndSaveImages(
  book: RenderedBook,
  assetsFolder: string,
  onProgress?: (completed: number, total: number) => void
): Promise<RenderedBook> {
  const updatedPages = [];
  const total = book.pages.length;

  for (const page of book.pages) {
    const filename = `page-${page.pageNumber}.png`;
    const localPath = path.join(assetsFolder, filename);

    try {
      // Download from temporary URL
      const imageBuffer = await downloadFile(page.url);
      await fs.writeFile(localPath, imageBuffer);

      // Update page with relative path
      updatedPages.push({
        pageNumber: page.pageNumber,
        url: `assets/${filename}`,
      });
    } catch (err) {
      console.warn(`\nWarning: Failed to download page ${page.pageNumber}: ${err}`);
      // Keep original URL if download fails
      updatedPages.push(page);
    }

    onProgress?.(updatedPages.length, total);
  }

  return {
    ...book,
    pages: updatedPages,
  };
}
