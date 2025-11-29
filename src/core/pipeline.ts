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
  type ArtDirectionPreset,
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
  artDirectionPreset?: ArtDirectionPreset;
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

  const pages = await processPages<RenderedPage>(totalPages, async (pageNumber, previousPages) => {
    emitThinking(`Rendering page ${pageNumber} of ${totalPages}...`, logger, onThinking);
    onProgress?.(`render-page-${pageNumber}`, 'start');

    const page = mock
      ? renderPageMock(pageNumber)
      : await renderPage(story, pageNumber, { format, previousPages });

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
  const { onProgress, onThinking, outputManager, format, logger, artDirectionPreset } = options;

  emitThinking(`Starting pipeline for "${storyWithPlot.title}"...`, logger, onThinking);

  // Generate style guide and character designs
  onProgress?.('setup', 'start');
  emitThinking(artDirectionPreset ? 'Applying style preset...' : 'Generating style guide...', logger, onThinking);
  const styleGuide = await styleGuideAgent(storyWithPlot, artDirectionPreset);
  const characterDesigns = await generateAndSaveCharacterDesigns(
    storyWithPlot,
    styleGuide,
    { onThinking, outputManager, logger }
  );
  onProgress?.('setup', 'complete');

  // Generate prose
  onProgress?.('prose', 'start');
  const storyWithProse = await generateProse(storyWithPlot, { onProgress, onThinking, logger });
  await outputManager?.saveProse(storyWithProse);
  onProgress?.('prose', 'complete');

  // Generate visuals
  onProgress?.('visuals', 'start');
  const storyWithVisuals = await generateVisuals(storyWithProse, { onProgress, onThinking, logger });
  // Add character designs to the composed story
  const story: ComposedStory = { ...storyWithVisuals, characterDesigns };

  // Debug: log character designs being added
  logger?.debug(
    { count: characterDesigns.length, designs: characterDesigns.map(d => ({ name: d.character.name, url: d.spriteSheetUrl })) },
    'Adding character designs to story'
  );

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
  const { onProgress, onThinking, outputManager, format = 'square-large', logger, artDirectionPreset } = options;

  emitThinking(`Starting incremental pipeline for "${storyWithPlot.title}"...`, logger, onThinking);

  // Setup phase: style guide + prose setup + character designs
  emitThinking(artDirectionPreset ? 'Applying style preset...' : 'Setting up style guide and prose...', logger, onThinking);
  onProgress?.('setup', 'start');
  const styleGuide = await styleGuideAgent(storyWithPlot, artDirectionPreset);
  const proseSetup = await proseSetupAgent(storyWithPlot);
  const characterDesigns = await generateAndSaveCharacterDesigns(
    storyWithPlot,
    styleGuide,
    { onThinking, outputManager, logger }
  );
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
      characterDesigns,
    };

    // Render this page
    emitThinking(`Rendering page ${pageNumber} of ${totalPages}...`, logger, onThinking);
    const renderedPage = await renderPage(currentStory, pageNumber, { format, previousPages: renderedPages });
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
