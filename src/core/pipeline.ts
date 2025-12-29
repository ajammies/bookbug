import type {
  Story,
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
  type StylePreset,
} from './agents';
import { intakeAgent, type IntakeMessage } from './agents/intake-agent';
import { type StoryState } from './schemas/story-tools';
import { StorySchema } from './schemas/story';
import type { StoryOutputManager } from '../cli/utils/output';
import type { Logger } from './utils/logger';
import { loadStylePreset, listStyles } from './services/style-loader';

// ============================================================================
// Types
// ============================================================================

/**
 * PipelineUI: Interface for user interaction during pipeline execution.
 * Passed via dependency injection - pipeline doesn't know about CLI specifics.
 */
export interface PipelineUI {
  /** Show a progress indicator with message */
  progress: (message: string) => void;
  /** Show selector for user input (should auto-stop any spinner) */
  prompt: (config: { question: string; options: string[] }) => Promise<string>;
}


export interface QualityCheckOptions {
  /** Enable quality checking (default: false) */
  enabled?: boolean;
  /** Quality threshold 0-100 (default: 70) */
  threshold?: number;
  /** Max retries on failure (default: 2) */
  maxRetries?: number;
}

export interface PipelineOptions {
  ui?: PipelineUI;
  outputManager?: StoryOutputManager;
  format?: BookFormatKey;
  logger?: Logger;
  stylePreset?: StylePreset;
  /** Quality checking options for rendered images */
  qualityCheck?: QualityCheckOptions;
}

export interface StageOptions {
  ui: PipelineUI;
  logger?: Logger;
}

// Re-export IntakeMessage as Message for backward compatibility
export type Message = IntakeMessage;

/**
 * Pipeline state - single type throughout pipeline.
 * story is the Story (unified schema with all story details).
 */
export interface PipelineState {
  // Story (progressively filled, then complete)
  story?: Story;

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

// ============================================================================
// Stage Functions (pure, easy to delete)
// ============================================================================

/**
 * Intake stage: Gather story details through single progressive conversation.
 * Pure function: (state, options) → state
 * Skips if story already exists.
 *
 * Uses the unified intake agent with tool calling for
 * combined conversation + extraction in a single loop.
 */
export const runIntakeStage = async (
  state: PipelineState,
  options: StageOptions
): Promise<PipelineState> => {
  // Skip if already have a complete story
  if (state.story) return state;

  const { ui, logger } = options;
  const availableStyles = await listStyles();

  // Initialize story state
  const storyState: StoryState = {
    story: {},
    isComplete: false,
  };

  // Conversation history is local to intake
  let history: IntakeMessage[] = [
    { role: 'assistant', content: 'Let\'s create a children\'s book!' },
  ];

  logger?.info({ stage: 'intake' }, 'Starting intake stage');

  while (!storyState.isComplete) {
    ui.progress('Thinking...');
    const result = await intakeAgent(storyState, history, {
      availableStyles,
      logger,
    });

    // Update state from agent
    storyState.story = result.story;
    storyState.isComplete = result.isComplete;

    // If complete, break out of loop
    if (result.isComplete) {
      logger?.debug({ stage: 'intake' }, 'Agent signaled completion');
      break;
    }

    // If no question, something went wrong - break to avoid infinite loop
    if (!result.question || !result.options) {
      logger?.warn({ stage: 'intake' }, 'Agent returned no question - forcing completion');
      break;
    }

    // Show question to user and get answer
    const answer = await ui.prompt({ question: result.question, options: result.options });

    // Add Q&A to history for next turn
    history = [
      ...history,
      { role: 'assistant', content: result.question },
      { role: 'user', content: answer },
    ];
  }

  // Parse and validate the completed story
  const story = StorySchema.parse(storyState.story);

  logger?.info(
    { stage: 'intake', title: story.title, beatCount: story.plotBeats?.length ?? 0 },
    'Intake stage complete'
  );

  return { ...state, story };
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

const assembleStoryWithProse = (story: Story, prose: Prose): StoryWithProse => ({
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
// Composable pipelines
// ============================================================================

export const generateProse = async (story: Story, logger?: Logger): Promise<StoryWithProse> => {
  const prose = await proseAgent(story, logger);
  return assembleStoryWithProse(story, prose);
};

export const generateVisuals = async (story: StoryWithProse, logger?: Logger): Promise<ComposedStory> => {
  const visuals = await visualsAgent(story, logger);
  return assembleComposedStory(story, visuals);
};

export const renderBook = async (
  story: ComposedStory,
  options: { format?: BookFormatKey; mock?: boolean; onStep?: (step: string) => void; outputManager?: StoryOutputManager } = {}
): Promise<RenderedBook> => {
  const { format = 'square-large', mock = false, onStep, outputManager } = options;
  const pages: RenderedPage[] = [];
  let heroPage: RenderedPage | undefined;

  for (const illustratedPage of story.visuals.illustratedPages) {
    const pageNumber = illustratedPage.pageNumber;
    onStep?.(`render-${pageNumber}`);

    const page = mock
      ? renderPageMock(pageNumber)
      : await renderPage(story, pageNumber, { format, heroPageUrl: heroPage?.url });

    pages.push(page);
    if (!heroPage) heroPage = page;
    if (outputManager) await outputManager.savePageImage(page);
  }

  return createBook(story, pages, format);
};

// ============================================================================
// Incremental pipeline (fill-in-the-nulls)
// ============================================================================

export const runPipelineIncremental = async (
  state: PipelineState,
  options: PipelineOptions = {}
): Promise<{ story: ComposedStory; book: RenderedBook }> => {
  const { ui, outputManager, format = 'square-large', stylePreset: optionsPreset, qualityCheck, logger } = options;

  if (!state.story) throw new Error('PipelineState requires story to run pipeline');

  const story = state.story;
  const stylePreset = optionsPreset ?? (story.stylePreset ? await loadStylePreset(story.stylePreset) : undefined);

  logger?.info({ stage: 'incremental', title: story.title, pageCount: story.pageCount }, 'Starting incremental pipeline');

  // Setup phase
  ui?.progress('Creating style guide...');
  const styleGuide = state.styleGuide ?? await styleGuideAgent(story, stylePreset, logger);

  // Save initial visuals (style guide only, no pages yet)
  if (outputManager && !state.styleGuide) {
    await outputManager.saveVisuals({ style: styleGuide, illustratedPages: [] });
  }

  ui?.progress('Setting up prose...');
  const proseSetup = state.proseSetup ?? await proseSetupAgent(story, logger);

  ui?.progress('Generating character designs...');
  const characters = story.characters;
  const characterDesigns = state.characterDesigns ?? await generateCharacterDesigns(characters, styleGuide, options);
  if (outputManager && !state.characterDesigns) {
    for (const design of characterDesigns) await outputManager.saveCharacterDesign(design);
  }

  // ============================================================================
  // Phase 1: Prose (sequential - needs previousPages context)
  // ============================================================================
  const prosePages = [...(state.prosePages ?? [])];
  const startPage = prosePages.length + 1;

  for (let pageNumber = startPage; pageNumber <= story.pageCount; pageNumber++) {
    ui?.progress(`Writing page ${pageNumber} of ${story.pageCount}...`);
    logger?.debug({ pageNumber, totalPages: story.pageCount }, 'Generating prose');
    const prosePage = await prosePageAgent({ story, proseSetup, pageNumber, previousPages: prosePages, logger });
    prosePages.push(prosePage);
  }

  // Save prose after all pages generated
  if (outputManager) {
    await outputManager.saveProse({ ...story, prose: assembleProse(proseSetup, prosePages) });
  }

  // ============================================================================
  // Phase 2: Visuals (parallel - each page independent)
  // ============================================================================
  const existingIllustratedPages = state.illustratedPages ?? [];
  const pagesToIllustrate = prosePages.slice(existingIllustratedPages.length);

  ui?.progress(`Directing ${pagesToIllustrate.length} pages in parallel...`);
  logger?.info({ count: pagesToIllustrate.length }, 'Starting parallel visual generation');

  const newIllustratedPages = await Promise.all(
    pagesToIllustrate.map((prosePage, i) => {
      const pageNumber = existingIllustratedPages.length + i + 1;
      return pageVisualsAgent({ story, styleGuide, pageNumber, prosePage, logger });
    })
  );

  const illustratedPages = [...existingIllustratedPages, ...newIllustratedPages];

  // Save visuals after all pages illustrated
  if (outputManager) {
    await outputManager.saveVisuals({ style: styleGuide, illustratedPages });
  }

  // ============================================================================
  // Phase 3: Render (parallel - heroPage first for consistency)
  // ============================================================================
  const existingRenderedPages = state.renderedPages ?? [];
  const renderedPages: RenderedPage[] = [...existingRenderedPages];
  let heroPage = state.heroPage ?? existingRenderedPages[0];

  // Build composed story for rendering
  const composedStory: ComposedStory = {
    ...story,
    prose: assembleProse(proseSetup, prosePages),
    visuals: assembleVisuals(styleGuide, illustratedPages),
    characterDesigns,
  };

  const renderOptions = {
    format,
    logger,
    qualityCheck: qualityCheck?.enabled ? { threshold: qualityCheck.threshold, maxRetries: qualityCheck.maxRetries } : undefined,
  };

  // Determine which pages still need rendering
  const startRenderPage = existingRenderedPages.length + 1;

  if (startRenderPage <= story.pageCount) {
    // Render heroPage first (page 1) if not already rendered
    if (!heroPage) {
      ui?.progress('Rendering hero page...');
      heroPage = await renderPage(composedStory, 1, renderOptions);
      renderedPages.push(heroPage);
      if (outputManager) await outputManager.savePageImage(heroPage);
    }

    // Render remaining pages in parallel
    const remainingPageNumbers = Array.from(
      { length: story.pageCount - renderedPages.length },
      (_, i) => renderedPages.length + i + 1
    );

    if (remainingPageNumbers.length > 0) {
      ui?.progress(`Rendering ${remainingPageNumbers.length} pages in parallel...`);
      logger?.info({ count: remainingPageNumbers.length }, 'Starting parallel render');

      const newRenderedPages = await Promise.all(
        remainingPageNumbers.map(pageNumber =>
          renderPage(composedStory, pageNumber, { ...renderOptions, heroPageUrl: heroPage?.url })
        )
      );

      // Sort by page number and add to list
      newRenderedPages.sort((a, b) => a.pageNumber - b.pageNumber);
      renderedPages.push(...newRenderedPages);

      // Save rendered pages
      if (outputManager) {
        for (const page of newRenderedPages) {
          await outputManager.savePageImage(page);
          if (page.quality) await outputManager.saveQualityResult(page.pageNumber, page.quality);
          if (page.failedAttempts) {
            for (let i = 0; i < page.failedAttempts.length; i++) {
              const failed = page.failedAttempts[i]!;
              await outputManager.saveFailedImage(page.pageNumber, i + 1, failed.url);
              await outputManager.saveQualityResult(page.pageNumber, failed.quality, i + 1);
            }
          }
        }
      }
    }
  }

  // Assemble final outputs
  const prose = assembleProse(proseSetup, prosePages);
  const visuals = assembleVisuals(styleGuide, illustratedPages);
  const finalStory = assembleComposedStory(assembleStoryWithProse(story, prose), visuals, characterDesigns);
  const book = createBook(finalStory, renderedPages, format);

  await outputManager?.saveProse({ ...story, prose });
  await outputManager?.saveStory(finalStory);
  await outputManager?.saveBook(book);

  logger?.info({ stage: 'incremental', pageCount: renderedPages.length }, 'Incremental pipeline complete');
  return { story: finalStory, book };
};

// ============================================================================
// Unified Pipeline Entry Point
// ============================================================================

/** Options for runPipeline - requires ui for interactive stages */
export interface RunPipelineOptions extends PipelineOptions {
  ui: PipelineUI;
}

/**
 * Run the complete pipeline from scratch.
 * User provides story details during intake conversation.
 *
 * @param options - Pipeline options including ui for user interaction
 */
export const runPipeline = async (
  options: RunPipelineOptions
): Promise<{ story: ComposedStory; book: RenderedBook }> => {
  const { ui, outputManager, format = 'square-large', logger, stylePreset: optionsPreset } = options;

  let state: PipelineState = {};

  // Run intake stage (gathers story through single conversation)
  state = await runIntakeStage(state, { ui, logger });

  // Save story after intake (intermediate checkpoint)
  if (state.story) {
    await outputManager?.saveStory(state.story as ComposedStory);
  }

  const stylePreset = optionsPreset ?? (state.story?.stylePreset ? await loadStylePreset(state.story.stylePreset) : undefined);

  return runPipelineIncremental(state, { ui, outputManager, format, logger, stylePreset });
};

// ============================================================================
// Re-exports for CLI convenience
// ============================================================================

export { renderPage, renderPageMock, createBook } from './agents';
