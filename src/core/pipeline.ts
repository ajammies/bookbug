import type { StoryBlurb, Manuscript, Story, Book, BookFormatKey, RenderedPage } from './schemas';
import {
  authorAgent,
  directorAgent,
  renderPage,
  renderPageMock,
  createBook,
  type OnStepProgress,
} from './agents';

/**
 * Pipeline result containing all intermediate outputs
 */
export interface PipelineResult {
  blurb: StoryBlurb;
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
 * Execute the pipeline from StoryBlurb to rendered book
 *
 * Pipeline flow:
 *   StoryBlurb → Author → Manuscript
 *   Manuscript → Director → Story
 *   Story → Illustrator → Book
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
    return { blurb, manuscript, story: null as any, book: null as any };
  }

  // Step 2: Direct visual story from manuscript
  onProgress?.('director', 'start');
  const story = await directorAgent(manuscript);
  onProgress?.('director', 'complete', story);

  if (stopAfter === 'story') {
    return { blurb, manuscript, story, book: null as any };
  }

  // Step 3: Illustrate book from story (render all pages)
  onProgress?.('illustrator', 'start');
  const pages: RenderedPage[] = [];
  for (const storyPage of story.pages) {
    const page = await renderPage(story, storyPage.pageNumber);
    pages.push(page);
  }
  const book = createBook(story, pages);
  onProgress?.('illustrator', 'complete', book);

  return { blurb, manuscript, story, book };
}

/**
 * Run individual pipeline steps (for CLI commands)
 */
export async function runManuscript(blurb: StoryBlurb): Promise<Manuscript> {
  return authorAgent(blurb);
}

export async function runStory(manuscript: Manuscript): Promise<Story> {
  return directorAgent(manuscript);
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
): Promise<Book> {
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
