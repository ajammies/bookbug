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
  VisualStyleGuide,
  ProseSetup,
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

// ============================================================================
// Types
// ============================================================================

export type PipelineResult =
  | { stage: 'prose'; storyWithPlot: StoryWithPlot; prose: Prose }
  | { stage: 'visuals'; storyWithProse: StoryWithProse; visuals: VisualDirection }
  | { stage: 'book'; story: ComposedStory; book: RenderedBook };

export interface PipelineOptions {
  onProgress?: OnStepProgress;
  stopAfter?: 'prose' | 'visuals' | 'book';
  outputManager?: StoryOutputManager;
  onPageComplete?: (pageNumber: number, page: RenderedPage) => void;
  onRetry?: (pageNumber: number, attempt: number, error: Error, delayMs: number) => void;
  maxRetries?: number;
}

export interface RenderOptions {
  format?: BookFormatKey;
  maxRetries?: number;
  outputManager?: StoryOutputManager;
  onRetry?: (pageNumber: number, attempt: number, error: Error, delayMs: number) => void;
  onPageRendered?: (page: RenderedPage) => void;
}

// ============================================================================
// Pure helpers
// ============================================================================

const assembleProse = (setup: ProseSetup, pages: ProsePage[]): Prose => ({
  logline: setup.logline,
  theme: setup.theme,
  styleNotes: setup.styleNotes,
  pages,
});

const assembleVisuals = (style: VisualStyleGuide, pages: IllustratedPage[]): VisualDirection => ({
  style,
  illustratedPages: pages,
});

// ============================================================================
// Render with retry (shared logic)
// ============================================================================

const renderWithRetry = async (
  story: ComposedStory,
  pageNumber: number,
  options: RenderOptions = {}
): Promise<RenderedPage> => {
  const { format = 'square-large', maxRetries = 5, outputManager, onRetry } = options;

  const page = await pRetry(
    () => renderPage(story, pageNumber, format),
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

  if (outputManager) {
    await outputManager.savePageImage(page);
  }

  return page;
};

// ============================================================================
// Pipeline execution
// ============================================================================

export async function executePipeline(
  storyWithPlot: StoryWithPlot,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const { onProgress, stopAfter, outputManager, onPageComplete, onRetry, maxRetries = 5 } = options;

  // Setup phase: generate style guide and prose setup in parallel
  onProgress?.('setup', 'start');
  const [styleGuide, proseSetup] = await Promise.all([
    styleGuideAgent(storyWithPlot),
    proseSetupAgent(storyWithPlot),
  ]);
  onProgress?.('setup', 'complete', { styleGuide, proseSetup });

  // Page-by-page processing
  const prosePages: ProsePage[] = [];
  const illustratedPages: IllustratedPage[] = [];
  const renderedPages: RenderedPage[] = [];

  for (let i = 0; i < storyWithPlot.pageCount; i++) {
    const pageNumber = i + 1;
    onProgress?.(`page-${pageNumber}`, 'start');

    // Prose
    const prosePage = await prosePageAgent({
      story: storyWithPlot,
      proseSetup,
      pageNumber,
      previousPages: [...prosePages],
    });
    prosePages.push(prosePage);

    if (stopAfter === 'prose') {
      onProgress?.(`page-${pageNumber}`, 'complete', { prosePage });
      continue;
    }

    // Visuals
    const illustratedPage = await pageVisualsAgent({
      story: storyWithPlot,
      styleGuide,
      pageNumber,
      prosePage,
    });
    illustratedPages.push(illustratedPage);

    if (stopAfter === 'visuals') {
      onProgress?.(`page-${pageNumber}`, 'complete', { prosePage, illustratedPage });
      continue;
    }

    // Render
    const currentStory: ComposedStory = {
      ...storyWithPlot,
      prose: assembleProse(proseSetup, prosePages),
      visuals: assembleVisuals(styleGuide, illustratedPages),
    };

    const renderedPage = await renderWithRetry(currentStory, pageNumber, {
      maxRetries,
      outputManager,
      onRetry,
    });
    renderedPages.push(renderedPage);

    onProgress?.(`page-${pageNumber}`, 'complete', { prosePage, illustratedPage, renderedPage });
    onPageComplete?.(pageNumber, renderedPage);
  }

  // Assemble final outputs
  const prose = assembleProse(proseSetup, prosePages);
  const visuals = assembleVisuals(styleGuide, illustratedPages);
  const storyWithProse: StoryWithProse = { ...storyWithPlot, prose };
  const story: ComposedStory = { ...storyWithProse, visuals };

  // Early returns for partial runs
  if (stopAfter === 'prose') {
    await outputManager?.saveProse(storyWithProse);
    return { stage: 'prose', storyWithPlot, prose };
  }

  if (stopAfter === 'visuals') {
    await outputManager?.saveStory(story);
    return { stage: 'visuals', storyWithProse, visuals };
  }

  // Full completion
  const book = createBook(story, renderedPages);
  await outputManager?.saveProse(storyWithProse);
  await outputManager?.saveStory(story);
  await outputManager?.saveBook(book);

  onProgress?.('complete', 'complete', book);
  return { stage: 'book', story, book };
}

// ============================================================================
// Standalone functions for CLI
// ============================================================================

export const runProse = (storyWithPlot: StoryWithPlot): Promise<Prose> =>
  proseAgent(storyWithPlot);

export const runVisuals = (storyWithProse: StoryWithProse): Promise<VisualDirection> =>
  visualsAgent(storyWithProse);

export async function runBook(
  story: ComposedStory,
  options: RenderOptions & { mock?: boolean } = {}
): Promise<RenderedBook> {
  const { mock = false, format = 'square-large', onPageRendered, ...renderOpts } = options;

  const pages: RenderedPage[] = [];

  for (const storyPage of story.visuals.illustratedPages) {
    const page = mock
      ? renderPageMock(storyPage.pageNumber)
      : await renderWithRetry(story, storyPage.pageNumber, { format, ...renderOpts });

    pages.push(page);
    onPageRendered?.(page);
  }

  return createBook(story, pages, format);
}

// Re-exports for CLI convenience
export { renderPage, renderPageMock, createBook } from './agents';
