import type { StoryBlurb, Manuscript, Story, RenderedBook, BookFormatKey, RenderedPage } from './schemas';
import {
  authorAgent,
  illustratorAgent,
  renderPage,
  renderPageMock,
  createBook,
  type OnStepProgress,
} from './agents';

/**
 * Pipeline result - discriminated union based on completion stage
 *
 * Use the `stage` field to determine which properties are available:
 * - 'manuscript': blurb + manuscript only
 * - 'story': blurb + manuscript + story
 * - 'book': all properties (complete pipeline)
 */
export type PipelineResult =
  | { stage: 'manuscript'; blurb: StoryBlurb; manuscript: Manuscript }
  | { stage: 'story'; blurb: StoryBlurb; manuscript: Manuscript; story: Story }
  | { stage: 'book'; blurb: StoryBlurb; manuscript: Manuscript; story: Story; book: RenderedBook };

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
 * Execute the pipeline from StoryBlurb to rendered book
 *
 * Pipeline flow:
 *   StoryBlurb → Author → Manuscript
 *   Manuscript → Illustrator → Story
 *   Story → Renderer → RenderedBook
 *
 * Note: StoryBlurb is created via:
 *   1. runStoryIntake (chat) → StoryBrief
 *   2. runBlurbIntake (iterate plot) → StoryBlurb
 */
export async function executePipeline(
  blurb: StoryBlurb,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const { onProgress, stopAfter } = options;

  // Step 1: Write manuscript from blurb
  onProgress?.('author', 'start');
  const manuscript = await authorAgent(blurb);
  onProgress?.('author', 'complete', manuscript);

  if (stopAfter === 'manuscript') {
    return { stage: 'manuscript', blurb, manuscript };
  }

  // Step 2: Illustrate visual story from manuscript
  onProgress?.('illustrator', 'start');
  const story = await illustratorAgent(manuscript);
  onProgress?.('illustrator', 'complete', story);

  if (stopAfter === 'story') {
    return { stage: 'story', blurb, manuscript, story };
  }

  // Step 3: Render book from story (generate all page images)
  onProgress?.('renderer', 'start');
  const pages: RenderedPage[] = [];
  for (const storyPage of story.pages) {
    const page = await renderPage(story, storyPage.pageNumber);
    pages.push(page);
  }
  const book = createBook(story, pages);
  onProgress?.('renderer', 'complete', book);

  return { stage: 'book', blurb, manuscript, story, book };
}

/**
 * Run individual pipeline steps (for CLI commands)
 */
export async function runManuscript(blurb: StoryBlurb): Promise<Manuscript> {
  return authorAgent(blurb);
}

export async function runStory(manuscript: Manuscript): Promise<Story> {
  return illustratorAgent(manuscript);
}

/**
 * Render a single page (re-export for CLI convenience)
 */
export { renderPage, renderPageMock, createBook } from './agents';

/**
 * Render all pages and create a book (convenience wrapper)
 */
export async function runBook(
  story: Story,
  config?: { mock?: boolean; format?: BookFormatKey; onPageRendered?: (page: RenderedPage) => void }
): Promise<RenderedBook> {
  const { mock = false, format = 'square-large', onPageRendered } = config ?? {};

  const pages: RenderedPage[] = [];
  for (const storyPage of story.pages) {
    const page = mock
      ? renderPageMock(storyPage.pageNumber)
      : await renderPage(story, storyPage.pageNumber, format);
    pages.push(page);
    onPageRendered?.(page);
  }

  return createBook(story, pages, format);
}
