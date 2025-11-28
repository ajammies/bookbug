import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { executePipeline, runVisuals, runBook } from '../../core/pipeline';
import {
  StoryWithPlotSchema,
  StoryWithProseSchema,
  StorySchema,
  type BookFormatKey,
} from '../../core/schemas';
import { createSpinner, formatStep } from '../output/progress';
import { displayBook } from '../output/display';
import { loadOutputManager } from '../utils/output';

const OUTPUT_DIR = './output';

type ResumeStage = 'blurb' | 'prose' | 'story' | 'complete';

interface StoryFolderInfo {
  folder: string;
  stage: ResumeStage;
  latestFile: string;
}

/**
 * Find the latest story folder in output directory
 */
const findLatestStoryFolder = async (): Promise<string | null> => {
  try {
    const entries = await fs.readdir(OUTPUT_DIR, { withFileTypes: true });
    const folders = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
      .reverse(); // Most recent first (timestamp in name)

    const latest = folders[0];
    if (!latest) return null;
    return path.join(OUTPUT_DIR, latest);
  } catch {
    return null;
  }
};

/**
 * Detect which stage a story folder is at based on existing files
 */
const detectStage = async (folder: string): Promise<StoryFolderInfo> => {
  const files = await fs.readdir(folder);

  if (files.includes('book.json')) {
    return { folder, stage: 'complete', latestFile: path.join(folder, 'book.json') };
  }
  if (files.includes('story.json')) {
    return { folder, stage: 'story', latestFile: path.join(folder, 'story.json') };
  }
  if (files.includes('prose.json')) {
    return { folder, stage: 'prose', latestFile: path.join(folder, 'prose.json') };
  }
  if (files.includes('blurb.json')) {
    return { folder, stage: 'blurb', latestFile: path.join(folder, 'blurb.json') };
  }

  throw new Error(`No resumable artifacts found in ${folder}`);
};

export const resumeCommand = new Command('resume')
  .description('Resume creating a story from where it left off')
  .argument('[folder]', 'Story folder path (defaults to latest)')
  .option('-f, --format <format>', 'Book format for rendering', 'square-large')
  .option('-m, --mock', 'Use mock images instead of real generation')
  .action(async (folderArg: string | undefined, options: { format: BookFormatKey; mock?: boolean }) => {
    const spinner = createSpinner();

    try {
      // Find story folder
      const folder = folderArg ?? (await findLatestStoryFolder());
      if (!folder) {
        console.error('No story folders found in output/');
        process.exit(1);
      }

      // Detect current stage
      spinner.start('Detecting story progress...');
      const info = await detectStage(folder);
      spinner.succeed(`Found story at: ${info.folder}`);

      const outputManager = await loadOutputManager(info.latestFile);

      switch (info.stage) {
        case 'complete': {
          console.log('\n✅ Story is already complete!');
          const bookJson = await fs.readFile(path.join(folder, 'book.json'), 'utf-8');
          const book = JSON.parse(bookJson);
          displayBook(book);
          break;
        }

        case 'story': {
          // Has story.json, just needs rendering
          console.log('\n📍 Resuming from: story.json (rendering images)');
          const storyJson = await fs.readFile(info.latestFile, 'utf-8');
          const story = StorySchema.parse(JSON.parse(storyJson));

          spinner.start('Rendering book...');
          const book = await runBook(story, {
            mock: options.mock,
            format: options.format,
            onPageRendered: (page) => {
              spinner.text = `Rendered page ${page.pageNumber}/${story.visuals.illustratedPages.length}`;
            },
          });
          spinner.succeed('Book rendered');

          await outputManager.saveBook(book);
          displayBook(book);
          console.log(`\nBook saved to: ${folder}/book.json`);
          break;
        }

        case 'prose': {
          // Has prose.json, needs visuals + render
          console.log('\n📍 Resuming from: prose.json (visual direction + rendering)');
          const proseJson = await fs.readFile(info.latestFile, 'utf-8');
          const storyWithProse = StoryWithProseSchema.parse(JSON.parse(proseJson));

          spinner.start('Creating visual direction...');
          const visuals = await runVisuals(storyWithProse);
          spinner.succeed('Visual direction complete');

          const story = { ...storyWithProse, visuals };
          await outputManager.saveStory(story);

          spinner.start('Rendering book...');
          const book = await runBook(story, {
            mock: options.mock,
            format: options.format,
            onPageRendered: (page) => {
              spinner.text = `Rendered page ${page.pageNumber}/${story.visuals.illustratedPages.length}`;
            },
          });
          spinner.succeed('Book rendered');

          await outputManager.saveBook(book);
          displayBook(book);
          console.log(`\nBook saved to: ${folder}/book.json`);
          break;
        }

        case 'blurb': {
          // Has blurb.json, run full incremental pipeline
          console.log('\n📍 Resuming from: blurb.json (prose + visuals + rendering)');
          const blurbJson = await fs.readFile(info.latestFile, 'utf-8');
          const storyWithPlot = StoryWithPlotSchema.parse(JSON.parse(blurbJson));

          const result = await executePipeline(storyWithPlot, {
            onProgress: (step, status) => {
              if (status === 'start') {
                spinner.start(formatStep(step));
              } else if (status === 'complete') {
                spinner.succeed(formatStep(step, true));
              }
            },
            outputManager,
            onPageComplete: (pageNumber) => {
              console.log(`  ✓ Page ${pageNumber} complete`);
            },
          });

          if (result.stage !== 'book') {
            throw new Error('Pipeline did not complete');
          }

          displayBook(result.book);
          console.log(`\nAll files saved to: ${folder}`);
          break;
        }
      }
    } catch (error) {
      spinner.fail('Resume failed');
      console.error(error);
      process.exit(1);
    }
  });
