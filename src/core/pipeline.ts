import type {
  StoryWithPlot,
  StoryWithProse,
  ComposedStory,
  Prose,
  VisualDirection,
  RenderedBook,
  BookFormatKey,
  RenderedPage,
  ProsePage,
  IllustratedPage,
} from './schemas';
import {
  proseAgent,
  visualsAgent,
  proseSetupAgent,
  prosePageAgent,
  styleGuideAgent,
  pageVisualsAgent,
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
  /** Callback after each page completes (prose + visuals + render) */
  onPageComplete?: (pageNumber: number, page: RenderedPage) => void;
}

/**
 * Execute the pipeline from StoryWithPlot to rendered book
 *
 * Incremental pipeline flow (page-by-page):
 *   1. StyleGuide + ProseSetup generated upfront (once)
 *   2. For each page: prose → visuals → render
 *   3. Assemble final ComposedStory and RenderedBook
 */
export async function executePipeline(
  storyWithPlot: StoryWithPlot,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const { onProgress, stopAfter, outputManager, onPageComplete } = options;

  // Step 1: Generate style guide and prose setup upfront (once)
  onProgress?.('setup', 'start');
  const [styleGuide, proseSetup] = await Promise.all([
    styleGuideAgent(storyWithPlot),
    proseSetupAgent(storyWithPlot),
  ]);
  onProgress?.('setup', 'complete', { styleGuide, proseSetup });

  // Step 2: Generate all prose pages
  const prosePages: ProsePage[] = [];
  for (let i = 0; i < storyWithPlot.pageCount; i++) {
    const pageNumber = i + 1;
    const prosePage = await prosePageAgent({
      story: storyWithPlot,
      proseSetup,
      pageNumber,
      previousPages: [...prosePages],
    });
    prosePages.push(prosePage);
  }

  // Assemble Prose
  const prose: Prose = {
    logline: proseSetup.logline,
    theme: proseSetup.theme,
    styleNotes: proseSetup.styleNotes,
    pages: prosePages,
  };
  const storyWithProse: StoryWithProse = { ...storyWithPlot, prose };

  // Check stopAfter for prose
  if (stopAfter === 'prose') {
    if (outputManager) {
      await outputManager.saveProse(storyWithProse);
    }
    onProgress?.('prose', 'complete', prose);
    return { stage: 'prose', storyWithPlot, prose };
  }

  // Step 3: Generate all illustrated pages
  const illustratedPages: IllustratedPage[] = [];
  for (let i = 0; i < storyWithPlot.pageCount; i++) {
    const pageNumber = i + 1;
    const illustratedPage = await pageVisualsAgent({
      story: storyWithPlot,
      styleGuide,
      pageNumber,
      prosePage: prosePages[i]!,
    });
    illustratedPages.push(illustratedPage);
  }

  // Assemble VisualDirection
  const visuals: VisualDirection = { style: styleGuide, illustratedPages };

  // Check stopAfter for visuals
  if (stopAfter === 'visuals') {
    if (outputManager) {
      await outputManager.saveStory({ ...storyWithProse, visuals });
    }
    onProgress?.('visuals', 'complete', visuals);
    return { stage: 'visuals', storyWithProse, visuals };
  }

  // Step 4: Render each page
  const renderedPages: RenderedPage[] = [];
  const story: ComposedStory = { ...storyWithProse, visuals };

  for (let i = 0; i < storyWithPlot.pageCount; i++) {
    const pageNumber = i + 1;
    onProgress?.(`page-${pageNumber}`, 'start');

    const renderedPage = await renderPage(story, pageNumber);
    renderedPages.push(renderedPage);

    onProgress?.(`page-${pageNumber}`, 'complete', renderedPage);
    onPageComplete?.(pageNumber, renderedPage);
  }

  // Step 5: Assemble final book
  const book = createBook(story, renderedPages);

  // Save final artifacts
  if (outputManager) {
    await outputManager.saveProse(storyWithProse);
    await outputManager.saveStory(story);
    await outputManager.saveBook(book);
  }

  onProgress?.('complete', 'complete', book);

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
