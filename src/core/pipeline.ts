import type { StoryBrief, Manuscript, Story, Book } from './schemas';
import {
  authorAgent,
  directorAgent,
  illustratorAgent,
  type OnStepProgress,
} from './agents';

/**
 * Pipeline result containing all intermediate outputs
 */
export interface PipelineResult {
  brief: StoryBrief;
  manuscript: Manuscript;
  story: Story;
  book: Book;
}

/**
 * Pipeline options
 */
export interface PipelineOptions {
  /** Callback for progress updates */
  onProgress?: OnStepProgress;
  /** Stop after a specific step (for partial runs) */
  stopAfter?: 'manuscript' | 'story' | 'book';
}

/**
 * Execute the pipeline from StoryBrief to rendered book
 *
 * Pipeline flow:
 *   StoryBrief → Author → Manuscript
 *   Manuscript → Director → Story
 *   Story → Illustrator → Book
 *
 * Note: StoryBrief is created via chat intake (runStoryIntake) before calling this
 */
export async function executePipeline(
  brief: StoryBrief,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const { onProgress, stopAfter } = options;

  // Step 1: Write manuscript from brief
  onProgress?.('author', 'start');
  const manuscript = await authorAgent(brief);
  onProgress?.('author', 'complete', manuscript);

  if (stopAfter === 'manuscript') {
    return { brief, manuscript, story: null as any, book: null as any };
  }

  // Step 2: Direct visual story from manuscript
  onProgress?.('director', 'start');
  const story = await directorAgent(manuscript);
  onProgress?.('director', 'complete', story);

  if (stopAfter === 'story') {
    return { brief, manuscript, story, book: null as any };
  }

  // Step 3: Illustrate book from story
  onProgress?.('illustrator', 'start');
  const book = await illustratorAgent(story);
  onProgress?.('illustrator', 'complete', book);

  return { brief, manuscript, story, book };
}

/**
 * Run individual pipeline steps (for CLI commands)
 */
export async function runManuscript(brief: StoryBrief): Promise<Manuscript> {
  return authorAgent(brief);
}

export async function runStory(manuscript: Manuscript): Promise<Story> {
  return directorAgent(manuscript);
}

export async function runBook(story: Story): Promise<Book> {
  return illustratorAgent(story);
}
