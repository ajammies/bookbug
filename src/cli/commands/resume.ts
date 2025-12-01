import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { runPipelineIncremental, runPipeline, renderBook, type PipelineState, type OnStep } from '../../core/pipeline';
import {
  StoryBriefSchema,
  StoryWithPlotSchema,
  StoryWithProseSchema,
  StorySchema,
  RenderedBookSchema,
  type BookFormatKey,
} from '../../core/schemas';
import { createSpinner } from '../output/progress';
import { displayBook } from '../output/display';
import { loadOutputManager } from '../utils/output';
import { loadJson } from '../../utils';
import { showSelector } from '../../utils/cli';

const OUTPUT_DIR = './output';

type ResumeStage = 'brief' | 'plot' | 'prose' | 'story' | 'complete';

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
  if (files.includes('story.json')) return { folder, stage: 'story', latestFile: path.join(folder, 'story.json') };
  if (files.includes('prose.json')) return { folder, stage: 'prose', latestFile: path.join(folder, 'prose.json') };
  if (files.includes('plot.json')) return { folder, stage: 'plot', latestFile: path.join(folder, 'plot.json') };
  if (files.includes('brief.json')) return { folder, stage: 'brief', latestFile: path.join(folder, 'brief.json') };
  throw new Error(`No resumable artifacts found in ${folder}`);
};

const loadPipelineState = async (folder: string): Promise<PipelineState | null> => {
  const files = await fs.readdir(folder);

  if (files.includes('story.json')) {
    const story = StorySchema.parse(await loadJson(path.join(folder, 'story.json')));
    return {
      brief: story,
      plot: story.plot,
      styleGuide: story.visuals.style,
      proseSetup: { logline: story.prose.logline, theme: story.prose.theme, styleNotes: story.prose.styleNotes },
      characterDesigns: story.characterDesigns,
      prosePages: story.prose.pages,
      illustratedPages: story.visuals.illustratedPages,
    };
  }

  if (files.includes('prose.json')) {
    const storyWithProse = StoryWithProseSchema.parse(await loadJson(path.join(folder, 'prose.json')));
    return {
      brief: storyWithProse,
      plot: storyWithProse.plot,
      proseSetup: { logline: storyWithProse.prose.logline, theme: storyWithProse.prose.theme, styleNotes: storyWithProse.prose.styleNotes },
      prosePages: storyWithProse.prose.pages,
    };
  }

  if (files.includes('plot.json')) {
    const storyWithPlot = StoryWithPlotSchema.parse(await loadJson(path.join(folder, 'plot.json')));
    return { brief: storyWithPlot, plot: storyWithPlot.plot };
  }

  return null;
};

const stepMessage = (step: string): string => {
  const messages: Record<string, string> = {
    'style-guide': 'Creating style guide...',
    'prose-setup': 'Setting up prose...',
    'character-designs': 'Generating character designs...',
  };
  if (messages[step]) return messages[step];
  const match = step.match(/^(?:page-(\d+)-(.+)|render-(\d+))$/);
  if (match?.[3]) return `Rendering page ${match[3]}...`;
  if (match?.[1] && match[2]) {
    const phaseNames: Record<string, string> = { prose: 'Writing', visuals: 'Directing', render: 'Rendering' };
    return `${phaseNames[match[2]] ?? match[2]} page ${match[1]}...`;
  }
  return `${step}...`;
};

export const resumeCommand = new Command('resume')
  .description('Resume creating a story from where it left off')
  .argument('[folder]', 'Story folder path (defaults to latest)')
  .option('-f, --format <format>', 'Book format for rendering', 'square-large')
  .option('-m, --mock', 'Use mock images instead of real generation')
  .action(async (folderArg: string | undefined, options: { format: BookFormatKey; mock?: boolean }) => {
    const spinner = createSpinner();

    try {
      const folder = folderArg ?? (await findLatestStoryFolder());
      if (!folder) {
        console.error('No story folders found in output/');
        process.exit(1);
      }

      spinner.start('Detecting story progress...');
      const info = await detectStage(folder);
      spinner.succeed(`Found story at: ${info.folder}`);

      const outputManager = await loadOutputManager(info.latestFile);
      const onStep: OnStep = (step) => spinner.start(stepMessage(step));

      switch (info.stage) {
        case 'complete': {
          console.log('\n✅ Story is already complete!');
          const book = RenderedBookSchema.parse(await loadJson(path.join(folder, 'book.json')));
          displayBook(book);
          break;
        }

        case 'story': {
          console.log('\n📍 Resuming from: story.json (rendering images)');
          const story = StorySchema.parse(await loadJson(info.latestFile));
          const book = await renderBook(story, { mock: options.mock, format: options.format, outputManager, onStep });
          spinner.succeed('Book rendered');
          await outputManager.saveBook(book);
          displayBook(book);
          console.log(`\nBook saved to: ${folder}/book.json`);
          break;
        }

        case 'prose':
        case 'plot': {
          console.log(`\n📍 Resuming from: ${info.stage}.json`);
          const pipelineState = await loadPipelineState(folder);
          if (!pipelineState) throw new Error('Failed to load pipeline state');
          const result = await runPipelineIncremental(pipelineState, { onStep, outputManager, format: options.format });
          spinner.succeed('Book complete!');
          displayBook(result.book);
          console.log(`\nAll files saved to: ${folder}`);
          break;
        }

        case 'brief': {
          console.log('\n📍 Resuming from: brief.json');
          const brief = StoryBriefSchema.parse(await loadJson(info.latestFile));
          // Wrap showSelector to stop spinner before user interaction (defensive)
          const promptUser = async (config: { question: string; options: string[] }) => {
            spinner.stop();
            return showSelector(config);
          };
          // Use runPipeline which handles plot generation and conversation
          const result = await runPipeline(brief, {
            promptUser,
            onStep,
            outputManager,
            format: options.format,
          });
          spinner.succeed('Book complete!');
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
