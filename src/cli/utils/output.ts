import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  StoryBrief,
  StoryBlurb,
  Manuscript,
  Story,
  Book,
} from '../../core/schemas';
import { generateStoryFolder } from './naming';

const OUTPUT_DIR = './output';

/**
 * Manages saving story artifacts to a folder structure
 */
export interface StoryOutputManager {
  /** Full path to the story folder */
  folder: string;
  /** Save StoryBrief to brief.json */
  saveBrief(brief: StoryBrief): Promise<void>;
  /** Save StoryBlurb to blurb.json */
  saveBlurb(blurb: StoryBlurb): Promise<void>;
  /** Save Manuscript to manuscript.json */
  saveManuscript(manuscript: Manuscript): Promise<void>;
  /** Save Story to story.json */
  saveStory(story: Story): Promise<void>;
  /** Save Book to book.json */
  saveBook(book: Book): Promise<void>;
}

/**
 * Create a new output manager with a generated folder name
 * @param title - Story title used to generate folder name
 * @param customPath - Optional custom folder path (overrides auto-generation)
 */
export const createOutputManager = async (
  title: string,
  customPath?: string
): Promise<StoryOutputManager> => {
  const folder = customPath ?? path.join(OUTPUT_DIR, generateStoryFolder(title));
  await fs.mkdir(folder, { recursive: true });
  await fs.mkdir(path.join(folder, 'assets'), { recursive: true });
  return createManager(folder);
};

/**
 * Load an output manager for an existing folder
 * Detects the story folder from an artifact file path
 */
export const loadOutputManager = async (
  artifactPath: string
): Promise<StoryOutputManager> => {
  const folder = path.dirname(artifactPath);
  // Verify it's a valid story folder (contains at least one artifact)
  const files = await fs.readdir(folder);
  const hasArtifact = files.some((f) =>
    ['brief.json', 'blurb.json', 'manuscript.json', 'story.json', 'book.json'].includes(f)
  );
  if (!hasArtifact) {
    throw new Error(`Not a valid story folder: ${folder}`);
  }
  return createManager(folder);
};

/**
 * Check if a path is inside an existing story folder
 */
export const isStoryFolder = async (filePath: string): Promise<boolean> => {
  try {
    const folder = path.dirname(filePath);
    const files = await fs.readdir(folder);
    return files.some((f) =>
      ['brief.json', 'blurb.json', 'manuscript.json', 'story.json', 'book.json'].includes(f)
    );
  } catch {
    return false;
  }
};

const createManager = (folder: string): StoryOutputManager => {
  const saveJson = async (filename: string, data: unknown): Promise<void> => {
    await fs.writeFile(
      path.join(folder, filename),
      JSON.stringify(data, null, 2)
    );
  };

  return {
    folder,
    saveBrief: (brief) => saveJson('brief.json', brief),
    saveBlurb: (blurb) => saveJson('blurb.json', blurb),
    saveManuscript: (manuscript) => saveJson('manuscript.json', manuscript),
    saveStory: (story) => saveJson('story.json', story),
    saveBook: (book) => saveJson('book.json', book),
  };
};
