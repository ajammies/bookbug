import type {
  StoryWithPlot,
  StoryWithProse,
  ComposedStory,
  Prose,
  VisualDirection,
  RenderedBook,
  BookFormatKey,
  RenderedPage,
} from './schemas';
import {
  proseAgent,
  visualsAgent,
  renderPage,
  renderPageMock,
  createBook,
  type OnStepProgress,
} from './agents';
import type { StoryOutputManager } from '../cli/utils/output';

/**
 * Pipeline result - discriminated union based on completion stage
 * Uses composed types for the functional pipeline.
 */
export type PipelineResult =
  | { stage: 'prose'; storyWithPlot: StoryWithPlot; prose: Prose }
  | { stage: 'visuals'; storyWithProse: StoryWithProse; visuals: VisualDirection }
  | { stage: 'book'; story: ComposedStory; book: RenderedBook };

/**
 * Pipeline options
 */
export interface PipelineOptions {
  /** Callback for progress updates */
  onProgress?: OnStepProgress;
  /** Stop after a specific step (for partial runs) */
  stopAfter?: 'prose' | 'visuals' | 'book';
  /** Output manager - if provided, saves artifacts at each stage */
  outputManager?: StoryOutputManager;
}

/**
 * Execute the pipeline from StoryWithPlot to rendered book
 *
 * Pipeline flow (functional composition):
 *   StoryWithPlot → proseAgent → Prose
 *   StoryWithProse → visualsAgent → VisualDirection
 *   ComposedStory → Renderer → RenderedBook
 */
export async function executePipeline(
  storyWithPlot: StoryWithPlot,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const { onProgress, stopAfter, outputManager } = options;

  // Step 1: Write prose from story with plot
  onProgress?.('prose', 'start');
  const prose = await proseAgent(storyWithPlot);
  onProgress?.('prose', 'complete', prose);

  // Compose StoryWithProse
  const storyWithProse: StoryWithProse = { ...storyWithPlot, prose };

  // Save prose stage
  if (outputManager) {
    await outputManager.saveProse(storyWithProse);
  }

  if (stopAfter === 'prose') {
    return { stage: 'prose', storyWithPlot, prose };
  }

  // Step 2: Create visual direction from story with prose
  onProgress?.('visuals', 'start');
  const visuals = await visualsAgent(storyWithProse);
  onProgress?.('visuals', 'complete', visuals);

  // Compose full Story
  const story: ComposedStory = { ...storyWithProse, visuals };

  // Save story stage
  if (outputManager) {
    await outputManager.saveStory(story);
  }

  if (stopAfter === 'visuals') {
    return { stage: 'visuals', storyWithProse, visuals };
  }

  // Step 3: Render book from story (generate all page images)
  onProgress?.('renderer', 'start');
  const pages: RenderedPage[] = [];
  for (const storyPage of story.visuals.illustratedPages) {
    const page = await renderPage(story, storyPage.pageNumber);
    pages.push(page);
  }
  const book = createBook(story, pages);
  onProgress?.('renderer', 'complete', book);

  // Save book stage
  if (outputManager) {
    await outputManager.saveBook(book);
  }

  return { stage: 'book', story, book };
}

/**
 * Run individual pipeline steps (for CLI commands)
 */
export async function runProse(storyWithPlot: StoryWithPlot): Promise<Prose> {
  return proseAgent(storyWithPlot);
}

export async function runVisuals(storyWithProse: StoryWithProse): Promise<VisualDirection> {
  return visualsAgent(storyWithProse);
}

/**
 * Render a single page (re-export for CLI convenience)
 */
export { renderPage, renderPageMock, createBook } from './agents';

/**
 * Render all pages and create a book (convenience wrapper)
 */
export async function runBook(
  story: ComposedStory,
  config?: { mock?: boolean; format?: BookFormatKey; onPageRendered?: (page: RenderedPage) => void }
): Promise<RenderedBook> {
  const { mock = false, format = 'square-large', onPageRendered } = config ?? {};

  const pages: RenderedPage[] = [];
  for (const storyPage of story.visuals.illustratedPages) {
    const page = mock
      ? renderPageMock(storyPage.pageNumber)
      : await renderPage(story, storyPage.pageNumber, format);
    pages.push(page);
    onPageRendered?.(page);
  }

  return createBook(story, pages, format);
}
