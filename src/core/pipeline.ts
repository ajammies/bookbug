import type {
  StoryBrief,
  PlotStructure,
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
  CharacterDesign,
} from './schemas';
import {
  proseAgent,
  proseSetupAgent,
  prosePageAgent,
  visualsAgent,
  styleGuideAgent,
  pageVisualsAgent,
  generateCharacterDesigns,
  renderPage,
  renderPageMock,
  createBook,
  type OnStepProgress,
  type StylePreset,
} from './agents';
import type { StoryOutputManager } from '../cli/utils/output';
import { type Logger, logThinking } from './utils/logger';
import { loadStylePreset } from './services/style-loader';

// ============================================================================
// Types
// ============================================================================

export interface PipelineOptions {
  onProgress?: OnStepProgress;
  onThinking?: (message: string) => void;
  outputManager?: StoryOutputManager;
  format?: BookFormatKey;
  logger?: Logger;
  stylePreset?: StylePreset;
}

/**
 * Pipeline state - pass what exists, pipeline fills in what's missing.
 * Enables both fresh runs (only brief) and resume (partial artifacts).
 */
export interface PipelineState {
  // Foundation (brief required to start)
  brief: StoryBrief;
  plot?: PlotStructure;

  // Setup artifacts
  styleGuide?: VisualStyleGuide;
  proseSetup?: ProseSetup;
  characterDesigns?: CharacterDesign[];

  // Content (per-page)
  prosePages?: ProsePage[];
  illustratedPages?: IllustratedPage[];

  // Rendered
  renderedPages?: RenderedPage[];
  heroPage?: RenderedPage;
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

const assembleComposedStory = (
  story: StoryWithProse,
  visuals: VisualDirection,
  characterDesigns?: CharacterDesign[]
): ComposedStory => ({
  ...story,
  visuals,
  characterDesigns,
});

const assembleStoryWithPlot = (brief: StoryBrief, plot: PlotStructure): StoryWithPlot => ({
  ...brief,
  plot,
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
// Character design generation
// ============================================================================

interface CharacterDesignOptions {
  onThinking?: (msg: string) => void;
  outputManager?: StoryOutputManager;
  logger?: Logger;
}

/**
 * Generate character sprite sheets and save to disk
 * Returns designs with original Replicate URLs (for API calls)
 * Files are saved locally but URLs are preserved for image generation
 */
const generateAndSaveCharacterDesigns = async (
  story: StoryWithPlot,
  styleGuide: VisualStyleGuide,
  options: CharacterDesignOptions = {}
): Promise<CharacterDesign[]> => {
  const { onThinking, outputManager, logger } = options;

  emitThinking('Generating character sprite sheets...', logger, onThinking);
  // Prefer plot.characters (may have been modified during plot intake) over brief characters
  const characters = story.plot.characters ?? story.characters;
  const designs = await generateCharacterDesigns(
    characters,
    styleGuide,
    { logger, onProgress: onThinking }
  );

  if (outputManager) {
    emitThinking('Saving character sprite sheets...', logger, onThinking);
    for (const design of designs) {
      await outputManager.saveCharacterDesign(design);
    }
  }

  return designs;
};

// ============================================================================
// Composable pipelines
// ============================================================================

/**
 * Generate prose for a story (StoryWithPlot → StoryWithProse)
 *
 * Uses single-call proseAgent to minimize API requests and avoid rate limits.
 */
export const generateProse = async (
  story: StoryWithPlot,
  options: { onProgress?: OnStepProgress; onThinking?: (msg: string) => void; logger?: Logger } = {}
): Promise<StoryWithProse> => {
  const { onProgress, onThinking, logger } = options;

  emitThinking('Writing story prose...', logger, onThinking);
  onProgress?.('prose', 'start');
  const prose = await proseAgent(story, logger);
  onProgress?.('prose', 'complete');

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
  const visuals = await visualsAgent(story, logger);
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
  let heroPage: RenderedPage | undefined;

  const pages = await processPages<RenderedPage>(totalPages, async (pageNumber, renderedPages) => {
    emitThinking(`Rendering page ${pageNumber} of ${totalPages}...`, logger, onThinking);
    onProgress?.(`render-page-${pageNumber}`, 'start');

    const page = mock
      ? renderPageMock(pageNumber)
      : await renderPage(story, pageNumber, {
          format,
          heroPageUrl: heroPage?.url,
          lastPage: renderedPages[renderedPages.length - 1],
        });

    if (!heroPage) heroPage = page;

    if (outputManager) {
      await outputManager.savePageImage(page);
    }

    onProgress?.(`render-page-${pageNumber}`, 'complete');
    return page;
  });

  return createBook(story, pages, format);
};

// ============================================================================
// Incremental pipeline (fill-in-the-nulls)
// ============================================================================

/**
 * Run pipeline incrementally: use what exists, generate what's missing.
 * Processes each page fully (prose → visuals → render) before moving to next.
 */
export const runPipelineIncremental = async (
  state: PipelineState,
  options: PipelineOptions = {}
): Promise<{ story: ComposedStory; book: RenderedBook }> => {
  const { onProgress, onThinking, outputManager, format = 'square-large', logger, stylePreset: optionsPreset } = options;

  // Require plot to proceed
  if (!state.plot) {
    throw new Error('PipelineState requires plot to run pipeline');
  }

  const storyWithPlot = assembleStoryWithPlot(state.brief, state.plot);
  emitThinking(`Starting pipeline for "${storyWithPlot.title}"...`, logger, onThinking);

  // Load style preset
  const stylePreset = optionsPreset
    ?? (storyWithPlot.stylePreset ? await loadStylePreset(storyWithPlot.stylePreset) : undefined);

  // Setup: use existing or generate
  onProgress?.('setup', 'start');

  const styleGuide = state.styleGuide ?? await (async () => {
    emitThinking(stylePreset ? `Applying style: ${storyWithPlot.stylePreset ?? 'preset'}...` : 'Generating style guide...', logger, onThinking);
    return styleGuideAgent(storyWithPlot, stylePreset);
  })();

  const proseSetup = state.proseSetup ?? await proseSetupAgent(storyWithPlot);

  const characterDesigns = state.characterDesigns ?? await generateAndSaveCharacterDesigns(
    storyWithPlot,
    styleGuide,
    { onThinking, outputManager, logger }
  );

  onProgress?.('setup', 'complete');

  // Page processing: use existing pages, generate remaining
  const prosePages = [...(state.prosePages ?? [])];
  const illustratedPages = [...(state.illustratedPages ?? [])];
  const renderedPages = [...(state.renderedPages ?? [])];
  let heroPage = state.heroPage ?? renderedPages[0];

  const startPage = renderedPages.length + 1;
  const totalPages = storyWithPlot.pageCount;

  for (let pageNumber = startPage; pageNumber <= totalPages; pageNumber++) {
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
      characterDesigns,
    };

    // Render this page
    emitThinking(`Rendering page ${pageNumber} of ${totalPages}...`, logger, onThinking);
    const renderedPage = await renderPage(currentStory, pageNumber, {
      format,
      heroPageUrl: heroPage?.url,
      lastPage: renderedPages[renderedPages.length - 1],
    });
    renderedPages.push(renderedPage);
    if (!heroPage) heroPage = renderedPage;

    // Save incrementally
    if (outputManager) {
      await outputManager.savePageImage(renderedPage);
    }

    onProgress?.(`page-${pageNumber}`, 'complete');
  }

  // Assemble final outputs
  const prose = assembleProse(proseSetup, prosePages);
  const visuals = assembleVisuals(styleGuide, illustratedPages);
  const story = assembleComposedStory(assembleStoryWithProse(storyWithPlot, prose), visuals, characterDesigns);
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
