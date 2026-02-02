import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { runPipelineIncremental, renderBook, type PipelineState } from '../../core/pipeline';
import {
  StoryWithProseSchema,
  StorySchema,
  ComposedStorySchema,
  RenderedBookSchema,
  type BookFormatKey,
  type Story,
  type RenderedPage,
} from '../../core/schemas';
import { displayBook } from '../output/display';
import { loadOutputManager } from '../utils/output';
import { loadJson } from '../../utils';
import { createCliUI } from '../../utils/cli';

const OUTPUT_DIR = './output';

type ResumeStage = 'draft' | 'prose' | 'story' | 'complete';

interface StoryFolderInfo {
  folder: string;
  stage: ResumeStage;
  latestFile: string;
}

const findLatestStoryFolder = async (): Promise<string | null> => {
  try {
    const entries = await fs.readdir(OUTPUT_DIR, { withFileTypes: true });
    const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    if (folders.length === 0) return null;

    const foldersWithTimes = await Promise.all(
      folders.map(async (name) => {
        const stat = await fs.stat(path.join(OUTPUT_DIR, name));
        return { name, mtime: stat.mtimeMs };
      })
    );
    foldersWithTimes.sort((a, b) => b.mtime - a.mtime);
    return foldersWithTimes[0] ? path.join(OUTPUT_DIR, foldersWithTimes[0].name) : null;
  } catch {
    return null;
  }
};

const detectStage = async (folder: string): Promise<StoryFolderInfo> => {
  const files = await fs.readdir(folder);
  if (files.includes('book.json')) return { folder, stage: 'complete', latestFile: path.join(folder, 'book.json') };
  if (files.includes('story.json')) {
    // Check if story.json has prose/visuals (composed) or just base story
    const data = await loadJson(path.join(folder, 'story.json')) as Record<string, unknown>;
    const isComposed = 'prose' in data && 'visuals' in data;
    if (isComposed) {
      return { folder, stage: 'story', latestFile: path.join(folder, 'story.json') };
    }
    // When we have separate files (prose.json, visuals.json), use 'prose' stage
    // which goes through runPipelineIncremental that correctly loads all files
    if (files.includes('prose.json') || files.includes('visuals.json')) {
      return { folder, stage: 'prose', latestFile: path.join(folder, 'story.json') };
    }
    return { folder, stage: 'draft', latestFile: path.join(folder, 'story.json') };
  }
  if (files.includes('prose.json')) return { folder, stage: 'prose', latestFile: path.join(folder, 'prose.json') };
  // plot.json and brief.json are legacy - treat as draft stage
  if (files.includes('plot.json')) return { folder, stage: 'draft', latestFile: path.join(folder, 'plot.json') };
  if (files.includes('brief.json')) return { folder, stage: 'draft', latestFile: path.join(folder, 'brief.json') };
  throw new Error(`No resumable artifacts found in ${folder}`);
};

/**
 * Scan assets folder for existing rendered pages (page-N.png files)
 * Returns RenderedPage entries sorted by page number
 */
const scanRenderedPages = async (folder: string): Promise<RenderedPage[]> => {
  const assetsPath = path.join(folder, 'assets');
  try {
    const files = await fs.readdir(assetsPath);
    const pageFiles = files.filter(f => /^page-\d+\.png$/.test(f));

    const pages: RenderedPage[] = pageFiles.map(filename => {
      const pageNumber = parseInt(filename.match(/page-(\d+)\.png/)![1]!, 10);
      const localPath = path.join(assetsPath, filename);
      return {
        pageNumber,
        url: `file://${localPath}`,
      };
    });

    // Sort by page number
    pages.sort((a, b) => a.pageNumber - b.pageNumber);
    return pages;
  } catch {
    // Assets folder doesn't exist or can't be read
    return [];
  }
};

const loadPipelineState = async (folder: string): Promise<PipelineState | null> => {
  const files = await fs.readdir(folder);

  if (files.includes('story.json')) {
    // Try to parse as ComposedStory first (has prose/visuals), fallback to base Story
    const data = await loadJson(path.join(folder, 'story.json')) as Record<string, unknown>;
    const story = StorySchema.parse(data);

    // Check if it has prose/visuals (composed story)
    const hasExtras = 'prose' in data && 'visuals' in data;
    if (hasExtras) {
      const composed = data as { prose: { logline: string; theme: string; styleNotes?: string; pages: unknown[] }; visuals: { style: unknown; illustratedPages: unknown[] }; characterDesigns?: unknown[] };

      // Scan for existing rendered pages in assets folder
      const renderedPages = await scanRenderedPages(folder);

      return {
        story,
        styleGuide: composed.visuals.style as import('../../core/schemas').VisualStyleGuide,
        proseSetup: { logline: composed.prose.logline, theme: composed.prose.theme, styleNotes: composed.prose.styleNotes },
        characterDesigns: composed.characterDesigns as import('../../core/schemas').CharacterDesign[],
        prosePages: composed.prose.pages as import('../../core/schemas').ProsePage[],
        illustratedPages: composed.visuals.illustratedPages as import('../../core/schemas').IllustratedPage[],
        renderedPages: renderedPages.length > 0 ? renderedPages : undefined,
        heroPage: renderedPages[0],
      };
    }

    // Check for separate prose.json and visuals.json files
    const state: PipelineState = { story };

    if (files.includes('prose.json')) {
      const proseData = await loadJson(path.join(folder, 'prose.json')) as Record<string, unknown>;
      if ('prose' in proseData) {
        const prose = proseData.prose as { logline: string; theme: string; styleNotes?: string; pages: unknown[] };
        state.proseSetup = { logline: prose.logline, theme: prose.theme, styleNotes: prose.styleNotes };
        state.prosePages = prose.pages as import('../../core/schemas').ProsePage[];
      }
    }

    if (files.includes('visuals.json')) {
      const visualsData = await loadJson(path.join(folder, 'visuals.json')) as Record<string, unknown>;
      if ('style' in visualsData) {
        state.styleGuide = visualsData.style as import('../../core/schemas').VisualStyleGuide;
      }
      if ('illustratedPages' in visualsData) {
        const pages = visualsData.illustratedPages as import('../../core/schemas').IllustratedPage[];
        if (pages.length > 0) {
          state.illustratedPages = pages;
        }
      }
    }

    // Scan for existing rendered pages in assets folder
    const renderedPages = await scanRenderedPages(folder);
    if (renderedPages.length > 0) {
      state.renderedPages = renderedPages;
      state.heroPage = renderedPages[0];
    }

    return state;
  }

  if (files.includes('prose.json')) {
    const storyWithProse = StoryWithProseSchema.parse(await loadJson(path.join(folder, 'prose.json')));
    const renderedPages = await scanRenderedPages(folder);
    return {
      story: storyWithProse,
      proseSetup: { logline: storyWithProse.prose.logline, theme: storyWithProse.prose.theme, styleNotes: storyWithProse.prose.styleNotes },
      prosePages: storyWithProse.prose.pages,
      renderedPages: renderedPages.length > 0 ? renderedPages : undefined,
      heroPage: renderedPages[0],
    };
  }

  if (files.includes('plot.json')) {
    const story = StorySchema.parse(await loadJson(path.join(folder, 'plot.json')));
    return { story };
  }

  // Legacy brief.json - need to run through draft stage (not supported in simplified pipeline)
  if (files.includes('brief.json')) {
    console.warn('Warning: brief.json is a legacy format. Please re-run the draft stage.');
    return null;
  }

  return null;
};

export const resumeCommand = new Command('resume')
  .description('Resume creating a story from where it left off')
  .argument('[folder]', 'Story folder path (defaults to latest)')
  .option('-f, --format <format>', 'Book format for rendering', 'square-large')
  .option('-m, --mock', 'Use mock images instead of real generation')
  .option('-p, --parallel', 'Run visual generation and rendering in parallel (faster but may hit rate limits)')
  .action(async (folderArg: string | undefined, options: { format: BookFormatKey; mock?: boolean; parallel?: boolean }) => {
    const ui = createCliUI();

    try {
      const folder = folderArg ?? (await findLatestStoryFolder());
      if (!folder) {
        console.error('No story folders found in output/');
        process.exit(1);
      }

      ui.progress('Detecting story progress...');
      const info = await detectStage(folder);
      ui.succeed(`Found story at: ${info.folder}`);

      const outputManager = await loadOutputManager(info.latestFile);

      switch (info.stage) {
        case 'complete': {
          console.log('\n✅ Story is already complete!');
          const book = RenderedBookSchema.parse(await loadJson(path.join(folder, 'book.json')));
          displayBook(book);
          break;
        }

        case 'story': {
          console.log('\n📍 Resuming from: story.json (rendering images)');
          const story = ComposedStorySchema.parse(await loadJson(info.latestFile));
          const onStep = (step: string) => ui.progress(`Rendering page ${step.replace('render-', '')}...`);
          const book = await renderBook(story, { mock: options.mock, format: options.format, outputManager, onStep });
          ui.succeed('Book rendered');
          await outputManager.saveBook(book);
          displayBook(book);
          console.log(`\nBook saved to: ${folder}/book.json`);
          break;
        }

        case 'prose':
        case 'draft': {
          console.log(`\n📍 Resuming from: ${info.latestFile.split('/').pop()}`);
          const pipelineState = await loadPipelineState(folder);
          if (!pipelineState) throw new Error('Failed to load pipeline state');
          const result = await runPipelineIncremental(pipelineState, { ui, outputManager, format: options.format, parallel: options.parallel });
          ui.succeed('Book complete!');
          displayBook(result.book);
          console.log(`\nAll files saved to: ${folder}`);
          break;
        }
      }
    } catch (error) {
      ui.fail('Resume failed');
      console.error(error);
      process.exit(1);
    }
  });
