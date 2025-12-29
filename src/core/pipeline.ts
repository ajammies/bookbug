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
  type StylePreset,
} from './agents';
import { draftAgent, type DraftMessage } from './agents/draft-agent';
import { type DraftState } from './schemas/draft-tools';
import { type StoryDraft } from './schemas/draft';
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

// Re-export DraftMessage as Message for backward compatibility
export type Message = DraftMessage;

/**
 * Pipeline state - single type throughout pipeline.
 * draft is optional (absent until draft stage completes).
 * history flows through the pipeline so context isn't lost.
 */
export interface PipelineState {
  // Conversation history
  history: Message[];

  // Draft (progressively filled during draft stage)
  draft?: Partial<StoryDraft>;

  // Legacy: brief/plot for backward compatibility with incremental pipeline
  brief?: StoryBrief;
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

// ============================================================================
// Stage Functions (pure, easy to delete)
// ============================================================================

/**
 * Convert StoryDraft to StoryBrief + PlotStructure for downstream pipeline.
 * This bridges the unified draft schema to the existing composed types.
 */
const convertDraftToStoryWithPlot = (draft: StoryDraft): { brief: StoryBrief; plot: PlotStructure } => {
  const brief: StoryBrief = {
    title: draft.title,
    storyArc: draft.storyArc,
    setting: draft.setting,
    characters: draft.characters,
    ageRange: draft.ageRange ?? { min: 4, max: 8 }, // Default age range
    pageCount: draft.pageCount,
    tone: draft.tone,
    moral: draft.moral,
    interests: draft.interests,
    customInstructions: draft.customInstructions,
    stylePreset: draft.stylePreset,
  };

  const plot: PlotStructure = {
    storyArcSummary: draft.storyArc,
    plotBeats: draft.plotBeats,
    allowCreativeLiberty: draft.allowCreativeLiberty,
    characters: draft.characters, // Pass through for visual descriptions
  };

  return { brief, plot };
};

/**
 * Draft stage: Gather story details through single progressive conversation.
 * Pure function: (state, options) → state
 * Skips if brief and plot already exist.
 *
 * Uses the unified draft agent with tool calling for
 * combined conversation + extraction in a single loop.
 */
export const runDraftStage = async (
  state: PipelineState,
  options: StageOptions
): Promise<PipelineState> => {
  // Skip if already have brief and plot
  if (state.brief && state.plot) return state;

  const { ui, logger } = options;
  const availableStyles = await listStyles();

  // Initialize draft state (or continue from existing draft)
  const draftState: DraftState = {
    draft: state.draft ?? {},
    isComplete: false,
  };

  // Use existing history or start fresh
  let history: DraftMessage[] = state.history.length > 0
    ? state.history
    : [{ role: 'assistant', content: 'Let\'s create a children\'s book!' }];

  logger?.info({ stage: 'draft' }, 'Starting draft stage');

  while (!draftState.isComplete) {
    ui.progress('Thinking...');
    const result = await draftAgent(draftState, history, {
      availableStyles,
      logger,
    });

    // Update state from agent
    draftState.draft = result.draft;
    draftState.isComplete = result.isComplete;

    // If complete, break out of loop
    if (result.isComplete) {
      logger?.debug({ stage: 'draft' }, 'Agent signaled completion');
      break;
    }

    // If no question, something went wrong - break to avoid infinite loop
    if (!result.question || !result.options) {
      logger?.warn({ stage: 'draft' }, 'Agent returned no question - forcing completion');
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

  // Convert draft to brief + plot for downstream compatibility
  const { brief, plot } = convertDraftToStoryWithPlot(draftState.draft as StoryDraft);

  logger?.info(
    { stage: 'draft', title: brief.title, beatCount: plot.plotBeats?.length ?? 0 },
    'Draft stage complete'
  );

  return {
    ...state,
    draft: draftState.draft,
    brief,
    plot,
    history,
  };
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
// Composable pipelines
// ============================================================================

export const generateProse = async (story: StoryWithPlot, logger?: Logger): Promise<StoryWithProse> => {
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

  if (!state.brief) throw new Error('PipelineState requires brief to run pipeline');
  if (!state.plot) throw new Error('PipelineState requires plot to run pipeline');

  const story = assembleStoryWithPlot(state.brief, state.plot);
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
  const characters = story.plot.characters ?? story.characters;
  const characterDesigns = state.characterDesigns ?? await generateCharacterDesigns(characters, styleGuide, options);
  if (outputManager && !state.characterDesigns) {
    for (const design of characterDesigns) await outputManager.saveCharacterDesign(design);
  }

  // Page processing
  const prosePages = [...(state.prosePages ?? [])];
  const illustratedPages = [...(state.illustratedPages ?? [])];
  const renderedPages = [...(state.renderedPages ?? [])];
  let heroPage = state.heroPage ?? renderedPages[0];

  for (let pageNumber = renderedPages.length + 1; pageNumber <= story.pageCount; pageNumber++) {
    logger?.debug({ pageNumber, totalPages: story.pageCount }, 'Processing page');

    ui?.progress(`Writing page ${pageNumber}...`);
    const prosePage = await prosePageAgent({ story, proseSetup, pageNumber, previousPages: prosePages, logger });
    prosePages.push(prosePage);

    ui?.progress(`Directing page ${pageNumber}...`);
    const illustratedPage = await pageVisualsAgent({ story, styleGuide, pageNumber, prosePage, logger });
    illustratedPages.push(illustratedPage);

    // Save visuals incrementally after each page
    if (outputManager) {
      await outputManager.saveVisuals({ style: styleGuide, illustratedPages });
    }

    ui?.progress(`Rendering page ${pageNumber}...`);
    const currentStory: ComposedStory = {
      ...story,
      prose: assembleProse(proseSetup, prosePages),
      visuals: assembleVisuals(styleGuide, illustratedPages),
      characterDesigns,
    };

    // Build render options with quality check if enabled
    const renderOptions = {
      format,
      heroPageUrl: heroPage?.url,
      logger,
      qualityCheck: qualityCheck?.enabled ? { threshold: qualityCheck.threshold, maxRetries: qualityCheck.maxRetries } : undefined,
    };

    const renderedPage = await renderPage(currentStory, pageNumber, renderOptions);
    renderedPages.push(renderedPage);
    if (!heroPage) heroPage = renderedPage;

    // Save quality result if available
    if (outputManager && renderedPage.quality) {
      await outputManager.saveQualityResult(pageNumber, renderedPage.quality);
    }

    // Save failed attempts for debugging
    if (outputManager && renderedPage.failedAttempts) {
      for (let i = 0; i < renderedPage.failedAttempts.length; i++) {
        const failed = renderedPage.failedAttempts[i]!;
        await outputManager.saveFailedImage(pageNumber, i + 1, failed.url);
        await outputManager.saveQualityResult(pageNumber, failed.quality, i + 1);
      }
    }

    if (outputManager) await outputManager.savePageImage(renderedPage);
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
 * User provides story details during draft conversation.
 *
 * @param options - Pipeline options including ui for user interaction
 */
export const runPipeline = async (
  options: RunPipelineOptions
): Promise<{ story: ComposedStory; book: RenderedBook }> => {
  const { ui, outputManager, format = 'square-large', logger, stylePreset: optionsPreset } = options;

  let state: PipelineState = { history: [] };

  // Run draft stage (gathers brief + plot through single conversation)
  state = await runDraftStage(state, { ui, logger });

  // Save brief and plot
  if (state.brief) {
    await outputManager?.saveBrief(state.brief);
  }
  if (state.brief && state.plot) {
    const storyWithPlot = assembleStoryWithPlot(state.brief, state.plot);
    await outputManager?.savePlot(storyWithPlot);
  }

  const stylePreset = optionsPreset ?? (state.brief?.stylePreset ? await loadStylePreset(state.brief.stylePreset) : undefined);

  return runPipelineIncremental(state, { ui, outputManager, format, logger, stylePreset });
};

// ============================================================================
// Re-exports for CLI convenience
// ============================================================================

export { renderPage, renderPageMock, createBook } from './agents';
