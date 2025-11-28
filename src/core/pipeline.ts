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
import { pRetry, RateLimitError, sleep } from './utils/retry';

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
  /** Callback when a retry is about to happen */
  onRetry?: (pageNumber: number, attempt: number, error: Error, delayMs: number) => void;
  /** Maximum retry attempts for image rendering (default: 5) */
  maxRetries?: number;
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
  const { onProgress, stopAfter, outputManager, onPageComplete, onRetry, maxRetries = 5 } = options;

  // Step 1: Generate style guide and prose setup upfront (once)
  onProgress?.('setup', 'start');
  const [styleGuide, proseSetup] = await Promise.all([
    styleGuideAgent(storyWithPlot),
    proseSetupAgent(storyWithPlot),
  ]);
  onProgress?.('setup', 'complete', { styleGuide, proseSetup });

  // Step 2: Process each page incrementally (prose → visuals → render)
  const prosePages: ProsePage[] = [];
  const illustratedPages: IllustratedPage[] = [];
  const renderedPages: RenderedPage[] = [];

  for (let i = 0; i < storyWithPlot.pageCount; i++) {
    const pageNumber = i + 1;
    onProgress?.(`page-${pageNumber}`, 'start');

    // Generate prose for this page
    const prosePage = await prosePageAgent({
      story: storyWithPlot,
      proseSetup,
      pageNumber,
      previousPages: [...prosePages],
    });
    prosePages.push(prosePage);

    // Skip visuals and render if stopAfter is 'prose'
    if (stopAfter === 'prose') {
      onProgress?.(`page-${pageNumber}`, 'complete', { prosePage });
      continue;
    }

    // Generate visuals for this page
    const illustratedPage = await pageVisualsAgent({
      story: storyWithPlot,
      styleGuide,
      pageNumber,
      prosePage,
    });
    illustratedPages.push(illustratedPage);

    // Skip render if stopAfter is 'visuals'
    if (stopAfter === 'visuals') {
      onProgress?.(`page-${pageNumber}`, 'complete', { prosePage, illustratedPage });
      continue;
    }

    // Build composed story for rendering (with pages so far)
    const currentProse: Prose = {
      logline: proseSetup.logline,
      theme: proseSetup.theme,
      styleNotes: proseSetup.styleNotes,
      pages: prosePages,
    };
    const currentVisuals: VisualDirection = { style: styleGuide, illustratedPages };
    const currentStory: ComposedStory = { ...storyWithPlot, prose: currentProse, visuals: currentVisuals };

    // Render this page (with retry for rate limits)
    const renderedPage = await pRetry(
      () => renderPage(currentStory, pageNumber),
      {
        retries: maxRetries,
        randomize: true,
        onFailedAttempt: async ({ error, attemptNumber }) => {
          const delayMs = error instanceof RateLimitError ? error.retryAfterMs : 0;
          onRetry?.(pageNumber, attemptNumber, error, delayMs);
          if (error instanceof RateLimitError) {
            await sleep(error.retryAfterMs);
          }
        },
      }
    );
    renderedPages.push(renderedPage);

    // Save image to disk immediately (before continuing to next page)
    if (outputManager) {
      await outputManager.savePageImage(renderedPage);
    }

    onProgress?.(`page-${pageNumber}`, 'complete', { prosePage, illustratedPage, renderedPage });
    onPageComplete?.(pageNumber, renderedPage);
  }

  // Assemble final outputs
  const prose: Prose = {
    logline: proseSetup.logline,
    theme: proseSetup.theme,
    styleNotes: proseSetup.styleNotes,
    pages: prosePages,
  };
  const visuals: VisualDirection = { style: styleGuide, illustratedPages };
  const storyWithProse: StoryWithProse = { ...storyWithPlot, prose };
  const story: ComposedStory = { ...storyWithProse, visuals };

  // Return early for partial runs
  if (stopAfter === 'prose') {
    if (outputManager) {
      await outputManager.saveProse(storyWithProse);
    }
    return { stage: 'prose', storyWithPlot, prose };
  }

  if (stopAfter === 'visuals') {
    if (outputManager) {
      await outputManager.saveStory(story);
    }
    return { stage: 'visuals', storyWithProse, visuals };
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
  config?: {
    mock?: boolean;
    format?: BookFormatKey;
    onPageRendered?: (page: RenderedPage) => void;
    onRetry?: (pageNumber: number, attempt: number, error: Error, delayMs: number) => void;
    maxRetries?: number;
  }
): Promise<RenderedBook> {
  const { mock = false, format = 'square-large', onPageRendered, onRetry, maxRetries = 5 } = config ?? {};

  const pages: RenderedPage[] = [];
  for (const storyPage of story.visuals.illustratedPages) {
    const page = mock
      ? renderPageMock(storyPage.pageNumber)
      : await pRetry(
          () => renderPage(story, storyPage.pageNumber, format),
          {
            retries: maxRetries,
            randomize: true,
            onFailedAttempt: async ({ error, attemptNumber }) => {
              const delayMs = error instanceof RateLimitError ? error.retryAfterMs : 0;
              onRetry?.(storyPage.pageNumber, attemptNumber, error, delayMs);
              if (error instanceof RateLimitError) {
                await sleep(error.retryAfterMs);
              }
            },
          }
        );
    pages.push(page);
    onPageRendered?.(page);
  }

  return createBook(story, pages, format);
}
