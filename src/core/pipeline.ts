import type { StoryBrief, Manuscript, Story, Book } from './schemas';
import {
  bookBuilderAgent,
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
  stopAfter?: 'brief' | 'manuscript' | 'story' | 'book';
}

/**
 * Execute the full pipeline from user prompt to rendered book
 *
 * Pipeline flow:
 *   userPrompt → BookBuilder → StoryBrief
 *   StoryBrief → Author → Manuscript
 *   Manuscript → Director → Story
 *   Story → Illustrator → Book
 */
export async function executePipeline(
  userPrompt: string,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const { onProgress, stopAfter } = options;

  // Step 1: Build brief from prompt
  onProgress?.('book-builder', 'start');
  const brief = await bookBuilderAgent(userPrompt);
  onProgress?.('book-builder', 'complete', brief);

  if (stopAfter === 'brief') {
    return { brief, manuscript: null as any, story: null as any, book: null as any };
  }

  // Step 2: Write manuscript from brief
  onProgress?.('author', 'start');
  const manuscript = await authorAgent(brief);
  onProgress?.('author', 'complete', manuscript);

  if (stopAfter === 'manuscript') {
    return { brief, manuscript, story: null as any, book: null as any };
  }

  // Step 3: Direct visual story from manuscript
  onProgress?.('director', 'start');
  const story = await directorAgent(manuscript);
  onProgress?.('director', 'complete', story);

  if (stopAfter === 'story') {
    return { brief, manuscript, story, book: null as any };
  }

  // Step 4: Illustrate book from story
  onProgress?.('illustrator', 'start');
  const book = await illustratorAgent(story);
  onProgress?.('illustrator', 'complete', book);

  return { brief, manuscript, story, book };
}

/**
 * Run individual pipeline steps (for CLI commands)
 */
export async function runBrief(userPrompt: string): Promise<StoryBrief> {
  return bookBuilderAgent(userPrompt);
}

export async function runManuscript(brief: StoryBrief): Promise<Manuscript> {
  return authorAgent(brief);
}

export async function runStory(manuscript: Manuscript): Promise<Story> {
  return directorAgent(manuscript);
}

export async function runBook(story: Story): Promise<Book> {
  return illustratorAgent(story);
}
