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
  PartialStory,
} from './schemas';
import {
  hasCompleteBrief,
  hasCompletePlot,
  StoryBriefSchema,
  StoryWithPlotSchema,
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
  extractorAgent,
  conversationAgent,
  plotAgent,
  plotConversationAgent,
  plotInterpreterAgent,
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

/**
 * StageState: State passed between pipeline stages.
 * Each stage is a pure function: (state, options) → state
 */
export interface StageState {
  story: PartialStory;
  history: Message[];
}

export interface PipelineOptions {
  ui?: PipelineUI;
  outputManager?: StoryOutputManager;
  format?: BookFormatKey;
  logger?: Logger;
  stylePreset?: StylePreset;
}

export interface StageOptions {
  ui: PipelineUI;
  logger?: Logger;
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

// ============================================================================
// Stage Functions (pure, easy to delete)
// ============================================================================

/**
 * Intake stage: Gather story brief through conversation.
 * Pure function: (state, options) → state
 * Skips if story already has complete brief.
 */
export const runIntakeStage = async (
  state: StageState,
  options: StageOptions
): Promise<StageState> => {
  if (hasCompleteBrief(state.story)) return state;

  const { ui, logger } = options;
  const availableStyles = await listStyles();
  let { story, history } = state;

  // Initial greeting if no history
  if (history.length === 0) {
    history = [{ role: 'assistant', content: 'Let\'s create a children\'s book!' }];
  }

  while (!hasCompleteBrief(story)) {
    ui.progress('Thinking...');
    const response = await conversationAgent(story, history, { availableStyles });

    if (response.isComplete) break;

    // ui.prompt auto-stops spinner before showing selector
    const answer = await ui.prompt({ question: response.question, options: response.options });

    ui.progress('Processing...');
    story = await extractorAgent(answer, story, { availableStyles, logger });
    history = [...history, { role: 'assistant', content: response.question }, { role: 'user', content: answer }];
  }

  return { story, history };
};

/**
 * Plot stage: Generate and refine plot structure.
 * Pure function: (state, options) → state
 * Skips if story already has complete plot.
 */
export const runPlotStage = async (
  state: StageState,
  options: StageOptions
): Promise<StageState> => {
  if (hasCompletePlot(state.story)) return state;

  const { ui, logger } = options;
  let { story, history } = state;

  // Validate brief before plot generation
  const briefResult = StoryBriefSchema.safeParse(story);
  if (!briefResult.success) {
    throw new Error('Cannot generate plot: brief is incomplete');
  }
  const brief = briefResult.data;

  // Generate initial plot
  ui.progress('Creating plot outline...');
  const plot = await plotAgent(brief);
  story = { ...story, plot };

  // Convert Message history to PlotMessage for plot conversation
  const plotHistory: PlotMessage[] = [];

  while (true) {
    ui.progress('Preparing...');
    const storyWithPlot = StoryWithPlotSchema.parse(story);
    const response = await plotConversationAgent(storyWithPlot, plotHistory);

    if (response.isComplete) break;

    // ui.prompt auto-stops spinner before showing selector
    const answer = await ui.prompt({ question: response.message, options: response.options });

    ui.progress('Updating story...');
    const updates = await plotInterpreterAgent(answer, storyWithPlot);
    story = { ...story, ...updates };
    plotHistory.push({ role: 'assistant', content: response.message }, { role: 'user', content: answer });
  }

  // Merge plot history back into main history
  const newHistory: Message[] = [
    ...history,
    ...plotHistory.map((m): Message => ({ role: m.role, content: m.content })),
  ];

  return { story, history: newHistory };
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
  const { ui, outputManager, format = 'square-large', stylePreset: optionsPreset } = options;

  if (!state.plot) throw new Error('PipelineState requires plot to run pipeline');

  const story = assembleStoryWithPlot(state.brief, state.plot);
  const stylePreset = optionsPreset ?? (story.stylePreset ? await loadStylePreset(story.stylePreset) : undefined);

  // Setup phase
  ui?.progress('Creating style guide...');
  const styleGuide = state.styleGuide ?? await styleGuideAgent(story, stylePreset);

  ui?.progress('Setting up prose...');
  const proseSetup = state.proseSetup ?? await proseSetupAgent(story);

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
    ui?.progress(`Writing page ${pageNumber}...`);
    const prosePage = await prosePageAgent({ story, proseSetup, pageNumber, previousPages: prosePages });
    prosePages.push(prosePage);

    ui?.progress(`Directing page ${pageNumber}...`);
    const illustratedPage = await pageVisualsAgent({ story, styleGuide, pageNumber, prosePage });
    illustratedPages.push(illustratedPage);

    ui?.progress(`Rendering page ${pageNumber}...`);
    const currentStory: ComposedStory = {
      ...story,
      prose: assembleProse(proseSetup, prosePages),
      visuals: assembleVisuals(styleGuide, illustratedPages),
      characterDesigns,
    };
    const renderedPage = await renderPage(currentStory, pageNumber, { format, heroPageUrl: heroPage?.url });
    renderedPages.push(renderedPage);
    if (!heroPage) heroPage = renderedPage;
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
 * Run the complete pipeline from any starting point.
 * Automatically skips completed stages based on input state.
 *
 * @param initialStory - PartialStory to start from (empty for new story)
 * @param options - Pipeline options including ui for user interaction
 */
export const runPipeline = async (
  initialStory: PartialStory,
  options: RunPipelineOptions
): Promise<{ story: ComposedStory; book: RenderedBook }> => {
  const { ui, outputManager, format = 'square-large', logger, stylePreset: optionsPreset } = options;

  let state: StageState = { story: initialStory, history: [] };

  // Run intake stage (skips if brief is complete)
  state = await runIntakeStage(state, { ui, logger });

  // Save brief if we have an output manager
  const brief = StoryBriefSchema.parse(state.story);
  await outputManager?.saveBrief(brief);

  // Run plot stage (skips if plot is complete)
  state = await runPlotStage(state, { ui, logger });

  // Save plot
  const storyWithPlot = StoryWithPlotSchema.parse(state.story);
  await outputManager?.savePlot(storyWithPlot);

  // Continue with incremental pipeline for prose/visuals/render
  const pipelineState: PipelineState = {
    brief: storyWithPlot,
    plot: storyWithPlot.plot,
  };

  const stylePreset = optionsPreset ?? (storyWithPlot.stylePreset ? await loadStylePreset(storyWithPlot.stylePreset) : undefined);

  return runPipelineIncremental(pipelineState, { ui, outputManager, format, logger, stylePreset });
};

// ============================================================================
// Re-exports for CLI convenience
// ============================================================================

export { renderPage, renderPageMock, createBook } from './agents';
