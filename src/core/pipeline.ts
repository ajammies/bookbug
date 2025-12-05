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
import { StoryBriefSchema } from './schemas';
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
  briefExtractorAgent,
  conversationAgent,
  plotAgent,
  plotConversationAgent,
  plotExtractorAgent,
  type StylePreset,
  type Message,
  type PlotMessage,
} from './agents';
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

/**
 * Pipeline state - single type throughout pipeline.
 * brief/plot are optional (absent until their stage completes).
 * history flows between stages so context isn't lost.
 */
export interface PipelineState {
  // Conversation history (flows intake → plot)
  history: Message[];

  // Brief (undefined until intake completes, then complete)
  brief?: StoryBrief;

  // Plot (undefined until plot stage completes)
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
 * Intake stage: Gather story brief through conversation.
 * Pure function: (state, options) → state
 * Skips if brief already exists.
 */
export const runIntakeStage = async (
  state: PipelineState,
  options: StageOptions
): Promise<PipelineState> => {
  if (state.brief) return state;

  const { ui, logger } = options;
  const availableStyles = await listStyles();
  let { history } = state;
  let workingBrief: Partial<StoryBrief> = {};
  let missingFields: string[] = [];

  // Initial greeting if no history
  if (history.length === 0) {
    history = [{ role: 'assistant', content: 'Let\'s create a children\'s book!' }];
  }

  logger?.info({ stage: 'intake' }, 'Starting intake stage');

  while (!StoryBriefSchema.safeParse(workingBrief).success) {
    ui.progress('Thinking...');
    const response = await conversationAgent(workingBrief, history, { availableStyles, missingFields, logger });

    // Only accept completion if brief is valid
    if (response.isComplete && StoryBriefSchema.safeParse(workingBrief).success) break;

    // ui.prompt auto-stops spinner before showing selector
    const answer = await ui.prompt({ question: response.question, options: response.options });

    ui.progress('Processing...');
    // Extract from Q&A pair (focused extraction is more reliable)
    const result = await briefExtractorAgent(response.question, answer, workingBrief, { availableStyles, logger });
    workingBrief = result.brief;
    missingFields = result.missingFields;
    history = [...history, { role: 'assistant', content: response.question }, { role: 'user', content: answer }];
  }

  const brief = StoryBriefSchema.parse(workingBrief);
  logger?.info({ stage: 'intake', title: brief.title }, 'Intake stage complete');
  return { ...state, brief, history };
};

/**
 * Plot stage: Generate and refine plot structure.
 * Pure function: (state, options) → state
 * Skips if plot already exists.
 */
export const runPlotStage = async (
  state: PipelineState,
  options: StageOptions
): Promise<PipelineState> => {
  if (state.plot) return state;

  const { ui, logger } = options;
  let { history } = state;

  if (!state.brief) {
    throw new Error('Cannot generate plot: brief is missing');
  }
  const brief = state.brief;

  logger?.info({ stage: 'plot', title: brief.title }, 'Starting plot stage');

  // Generate initial plot
  ui.progress('Creating plot outline...');
  let plot = await plotAgent(brief, logger);

  // Convert Message history to PlotMessage for plot conversation
  // History from intake flows in so plot agent sees any plot details mentioned
  const plotHistory: PlotMessage[] = history.map((m): PlotMessage => ({ role: m.role, content: m.content }));

  while (true) {
    ui.progress('Preparing...');
    const storyWithPlot = assembleStoryWithPlot(brief, plot);
    const response = await plotConversationAgent(storyWithPlot, plotHistory, logger);

    if (response.isComplete) break;

    // ui.prompt auto-stops spinner before showing selector
    const answer = await ui.prompt({ question: response.message, options: response.options });

    ui.progress('Updating story...');
    // Pass Q&A pair for focused interpretation
    const messageWithContext = `Question: ${response.message}\nAnswer: ${answer}`;
    const updates = await plotExtractorAgent(messageWithContext, storyWithPlot, logger);
    if (updates.plot) plot = updates.plot;
    plotHistory.push({ role: 'assistant', content: response.message }, { role: 'user', content: answer });
  }

  // Merge plot history back into main history
  const newHistory: Message[] = plotHistory.map((m): Message => ({ role: m.role, content: m.content }));

  logger?.info({ stage: 'plot', beatCount: plot.plotBeats.length }, 'Plot stage complete');
  return { ...state, plot, history: newHistory };
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
 * User provides story details during intake conversation.
 *
 * @param options - Pipeline options including ui for user interaction
 */
export const runPipeline = async (
  options: RunPipelineOptions
): Promise<{ story: ComposedStory; book: RenderedBook }> => {
  const { ui, outputManager, format = 'square-large', logger, stylePreset: optionsPreset } = options;

  let state: PipelineState = { history: [] };

  // Run intake stage (gathers brief through conversation)
  state = await runIntakeStage(state, { ui, logger });

  // Save brief if we have an output manager
  if (state.brief) {
    await outputManager?.saveBrief(state.brief);
  }

  // Run plot stage (generates and refines plot)
  state = await runPlotStage(state, { ui, logger });

  // Save plot
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
