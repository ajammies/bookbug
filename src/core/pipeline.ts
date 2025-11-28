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
  proseSetupAgent,
  prosePageAgent,
  visualsAgent,
  styleGuideAgent,
  pageVisualsAgent,
  renderPage,
  renderPageMock,
  createBook,
  type OnStepProgress,
} from './agents';
import type { StoryOutputManager } from '../cli/utils/output';
import { type Logger, logThinking } from './utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface PipelineOptions {
  onProgress?: OnStepProgress;
  onThinking?: (message: string) => void;
  outputManager?: StoryOutputManager;
  format?: BookFormatKey;
  logger?: Logger;
}

/** Emit thinking status to both logger and callback */
const emitThinking = (
  message: string,
  logger?: Logger,
  onThinking?: (msg: string) => void
): void => {
  logThinking(logger, message);
  onThinking?.(message);
};

// ============================================================================
// Pure assembly functions
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

const assembleStoryWithProse = (story: StoryWithPlot, prose: Prose): StoryWithProse => ({
  ...story,
  prose,
});

const assembleComposedStory = (story: StoryWithProse, visuals: VisualDirection): ComposedStory => ({
  ...story,
  visuals,
});

// ============================================================================
// Pure page processors
// ============================================================================

const generateProsePage = (
  story: StoryWithPlot,
  proseSetup: ProseSetup,
  pageNumber: number,
  previousPages: ProsePage[]
): Promise<ProsePage> =>
  prosePageAgent({ story, proseSetup, pageNumber, previousPages });

const generateIllustratedPage = (
  story: StoryWithPlot,
  styleGuide: VisualStyleGuide,
  pageNumber: number,
  prosePage: ProsePage
): Promise<IllustratedPage> =>
  pageVisualsAgent({ story, styleGuide, pageNumber, prosePage });

// ============================================================================
// Sequential page accumulator
// ============================================================================

const processPages = async <T>(
  count: number,
  processor: (pageNumber: number, accumulated: T[]) => Promise<T>
): Promise<T[]> => {
  const results: T[] = [];
  for (let i = 0; i < count; i++) {
    const result = await processor(i + 1, [...results]);
    results.push(result);
  }
  return results;
};

// ============================================================================
// Composable pipelines
// ============================================================================

/**
 * Generate prose for a story (StoryWithPlot → StoryWithProse)
 */
export const generateProse = async (
  story: StoryWithPlot,
  options: { onProgress?: OnStepProgress; onThinking?: (msg: string) => void; logger?: Logger } = {}
): Promise<StoryWithProse> => {
  const { onProgress, onThinking, logger } = options;

  emitThinking('Establishing story voice...', logger, onThinking);
  onProgress?.('prose-setup', 'start');
  const proseSetup = await proseSetupAgent(story);
  onProgress?.('prose-setup', 'complete');

  const prosePages = await processPages<ProsePage>(story.pageCount, async (pageNumber, previous) => {
    emitThinking(`Writing page ${pageNumber} of ${story.pageCount}...`, logger, onThinking);
    onProgress?.(`prose-page-${pageNumber}`, 'start');
    const page = await generateProsePage(story, proseSetup, pageNumber, previous);
    onProgress?.(`prose-page-${pageNumber}`, 'complete');
    return page;
  });

  const prose = assembleProse(proseSetup, prosePages);
  return assembleStoryWithProse(story, prose);
};

/**
 * Generate visuals for a story (StoryWithProse → ComposedStory)
 *
 * Uses single-call visualsAgent to minimize API requests and avoid rate limits.
 */
export const generateVisuals = async (
  story: StoryWithProse,
  options: { onProgress?: OnStepProgress; onThinking?: (msg: string) => void; logger?: Logger } = {}
): Promise<ComposedStory> => {
  const { onProgress, onThinking, logger } = options;

  emitThinking('Creating visual direction...', logger, onThinking);
  onProgress?.('visuals', 'start');
  const visuals = await visualsAgent(story);
  onProgress?.('visuals', 'complete');

  return assembleComposedStory(story, visuals);
};

/**
 * Render a book (ComposedStory → RenderedBook)
 */
export const renderBook = async (
  story: ComposedStory,
  options: {
    format?: BookFormatKey;
    mock?: boolean;
    onProgress?: OnStepProgress;
    onThinking?: (msg: string) => void;
    outputManager?: StoryOutputManager;
    logger?: Logger;
  } = {}
): Promise<RenderedBook> => {
  const { format = 'square-large', mock = false, onProgress, onThinking, outputManager, logger } = options;
  const totalPages = story.visuals.illustratedPages.length;

  const pages = await processPages<RenderedPage>(totalPages, async (pageNumber) => {
    emitThinking(`Rendering page ${pageNumber} of ${totalPages}...`, logger, onThinking);
    onProgress?.(`render-page-${pageNumber}`, 'start');

    const page = mock
      ? renderPageMock(pageNumber)
      : await renderPage(story, pageNumber, format);

    if (outputManager) {
      await outputManager.savePageImage(page);
    }

    onProgress?.(`render-page-${pageNumber}`, 'complete');
    return page;
  });

  return createBook(story, pages, format);
};

// ============================================================================
// Full pipeline (chains all three)
// ============================================================================

/**
 * Run the complete pipeline: StoryWithPlot → RenderedBook
 */
export const executePipeline = async (
  storyWithPlot: StoryWithPlot,
  options: PipelineOptions = {}
): Promise<{ story: ComposedStory; book: RenderedBook }> => {
  const { onProgress, onThinking, outputManager, format, logger } = options;

  emitThinking(`Starting pipeline for "${storyWithPlot.title}"...`, logger, onThinking);

  // Generate prose
  onProgress?.('prose', 'start');
  const storyWithProse = await generateProse(storyWithPlot, { onProgress, onThinking, logger });
  await outputManager?.saveProse(storyWithProse);
  onProgress?.('prose', 'complete');

  // Generate visuals
  onProgress?.('visuals', 'start');
  const story = await generateVisuals(storyWithProse, { onProgress, onThinking, logger });
  await outputManager?.saveStory(story);
  onProgress?.('visuals', 'complete');

  // Render book
  onProgress?.('render', 'start');
  const book = await renderBook(story, { format, outputManager, onProgress, onThinking, logger });
  await outputManager?.saveBook(book);
  onProgress?.('render', 'complete');

  return { story, book };
};

// ============================================================================
// Incremental pipeline (processes each page fully before moving to next)
// ============================================================================

/**
 * Process pages incrementally: prose → visuals → render for each page
 * Useful for long-running jobs where you want to save progress as you go
 */
export const executeIncrementalPipeline = async (
  storyWithPlot: StoryWithPlot,
  options: PipelineOptions = {}
): Promise<{ story: ComposedStory; book: RenderedBook }> => {
  const { onProgress, onThinking, outputManager, format = 'square-large', logger } = options;

  emitThinking(`Starting incremental pipeline for "${storyWithPlot.title}"...`, logger, onThinking);

  // Setup phase: style guide + prose setup sequentially to avoid rate limits
  emitThinking('Setting up style guide and prose...', logger, onThinking);
  onProgress?.('setup', 'start');
  const styleGuide = await styleGuideAgent(storyWithPlot);
  const proseSetup = await proseSetupAgent(storyWithPlot);
  onProgress?.('setup', 'complete');

  // Process each page completely before moving to next
  const prosePages: ProsePage[] = [];
  const illustratedPages: IllustratedPage[] = [];
  const renderedPages: RenderedPage[] = [];

  for (let i = 0; i < storyWithPlot.pageCount; i++) {
    const pageNumber = i + 1;
    const totalPages = storyWithPlot.pageCount;
    onProgress?.(`page-${pageNumber}`, 'start');

    // Prose for this page
    emitThinking(`Writing prose for page ${pageNumber} of ${totalPages}...`, logger, onThinking);
    const prosePage = await generateProsePage(storyWithPlot, proseSetup, pageNumber, prosePages);
    prosePages.push(prosePage);

    // Visuals for this page
    emitThinking(`Creating visuals for page ${pageNumber} of ${totalPages}...`, logger, onThinking);
    const illustratedPage = await generateIllustratedPage(storyWithPlot, styleGuide, pageNumber, prosePage);
    illustratedPages.push(illustratedPage);

    // Build current story state for rendering
    const currentStory: ComposedStory = {
      ...storyWithPlot,
      prose: assembleProse(proseSetup, prosePages),
      visuals: assembleVisuals(styleGuide, illustratedPages),
    };

    // Render this page
    emitThinking(`Rendering page ${pageNumber} of ${totalPages}...`, logger, onThinking);
    const renderedPage = await renderPage(currentStory, pageNumber, format);
    renderedPages.push(renderedPage);

    // Save incrementally
    if (outputManager) {
      await outputManager.savePageImage(renderedPage);
    }

    onProgress?.(`page-${pageNumber}`, 'complete');
  }

  // Assemble final outputs
  const prose = assembleProse(proseSetup, prosePages);
  const visuals = assembleVisuals(styleGuide, illustratedPages);
  const story = assembleComposedStory(assembleStoryWithProse(storyWithPlot, prose), visuals);
  const book = createBook(story, renderedPages, format);

  // Save final artifacts
  await outputManager?.saveProse({ ...storyWithPlot, prose });
  await outputManager?.saveStory(story);
  await outputManager?.saveBook(book);

  return { story, book };
};

// ============================================================================
// Re-exports for CLI convenience
// ============================================================================

export { renderPage, renderPageMock, createBook } from './agents';
