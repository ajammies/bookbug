import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  StoryBrief,
  StoryWithPlot,
  StoryWithProse,
  Story,
  RenderedBook,
  RenderedPage,
  CharacterDesign,
} from '../../core/schemas';
import { createStoryFolderName } from './naming';
import { downloadFile } from '../../utils';

const OUTPUT_DIR = './output';
const ARTIFACT_FILES = ['brief.json', 'blurb.json', 'prose.json', 'story.json', 'book.json'];

const saveJson = (folder: string, filename: string, data: unknown): Promise<void> =>
  fs.writeFile(path.join(folder, filename), JSON.stringify(data, null, 2));

/**
 * Manages saving story artifacts to a folder structure
 */
export interface StoryOutputManager {
  /** Full path to the story folder */
  folder: string;
  /** Save StoryBrief to brief.json */
  saveBrief(brief: StoryBrief): Promise<void>;
  /** Save StoryWithPlot to blurb.json (composed brief + plot) */
  saveBlurb(story: StoryWithPlot): Promise<void>;
  /** Save StoryWithProse to prose.json (composed brief + plot + prose) */
  saveProse(story: StoryWithProse): Promise<void>;
  /** Save Story to story.json */
  saveStory(story: Story): Promise<void>;
  /** Save RenderedBook to book.json */
  saveBook(book: RenderedBook): Promise<void>;
  /** Save a single page image to assets folder (downloads from URL) */
  savePageImage(page: RenderedPage): Promise<string>;
  /** Save a character design sprite sheet to assets/characters folder */
  saveCharacterDesign(design: CharacterDesign): Promise<string>;
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
  const folder = customPath ?? path.join(OUTPUT_DIR, createStoryFolderName(title));
  await fs.mkdir(folder, { recursive: true });
  await fs.mkdir(path.join(folder, 'assets'), { recursive: true });
  await fs.mkdir(path.join(folder, 'assets', 'characters'), { recursive: true });
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
  const hasArtifact = files.some((f) => ARTIFACT_FILES.includes(f));
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
    return files.some((f) => ARTIFACT_FILES.includes(f));
  } catch {
    return false;
  }
};

/** Slugify a name for use in filenames */
const slugify = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const createManager = (folder: string): StoryOutputManager => ({
  folder,
  saveBrief: (brief) => saveJson(folder, 'brief.json', brief),
  saveBlurb: (blurb) => saveJson(folder, 'blurb.json', blurb),
  saveProse: (story) => saveJson(folder, 'prose.json', story),
  saveStory: (story) => saveJson(folder, 'story.json', story),
  saveBook: (book) => saveJson(folder, 'book.json', book),
  savePageImage: async (page: RenderedPage): Promise<string> => {
    const imageBuffer = await downloadFile(page.url);
    const filename = `page-${page.pageNumber}.png`;
    const imagePath = path.join(folder, 'assets', filename);
    await fs.writeFile(imagePath, imageBuffer);
    return imagePath;
  },
  saveCharacterDesign: async (design: CharacterDesign): Promise<string> => {
    const imageBuffer = await downloadFile(design.spriteSheetUrl);
    const filename = `${slugify(design.character.name)}.png`;
    const imagePath = path.join(folder, 'assets', 'characters', filename);
    await fs.writeFile(imagePath, imageBuffer);
    return `assets/characters/${filename}`;
  },
});

/**
 * Get existing output manager or create new one
 */
export const getOrCreateOutputManager = async (
  filePath: string,
  fallbackTitle: string
): Promise<StoryOutputManager> =>
  (await isStoryFolder(filePath))
    ? loadOutputManager(filePath)
    : createOutputManager(fallbackTitle);
