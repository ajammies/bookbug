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

export type OnStep = (step: string) => void;

/**
 * PromptUser: Callback for user interaction (dependency injection).
 * Pipeline doesn't know about CLI - receives this callback.
 */
export type PromptUser = (config: { question: string; options: string[] }) => Promise<string>;

/**
 * StageState: State passed between pipeline stages.
 * Each stage is a pure function: (state, options) → state
 */
export interface StageState {
  story: PartialStory;
  history: Message[];
}

export interface PipelineOptions {
  onStep?: OnStep;
  outputManager?: StoryOutputManager;
  format?: BookFormatKey;
  logger?: Logger;
  stylePreset?: StylePreset;
}

export interface StageOptions {
  promptUser: PromptUser;
  onStep?: OnStep;
  logger?: Logger;
}

export interface UnifiedPipelineOptions extends PipelineOptions {
  promptUser: PromptUser;
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

  const { promptUser, onStep, logger } = options;
  const availableStyles = await listStyles();
  let { story, history } = state;

  onStep?.('intake');

  // Initial greeting if no history
  if (history.length === 0) {
    history = [{ role: 'assistant', content: 'Let\'s create a children\'s book!' }];
  }

  while (!hasCompleteBrief(story)) {
    const response = await conversationAgent(story, history, { availableStyles });

    if (response.isComplete) break;

    const answer = await promptUser({ question: response.question, options: response.options });

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

  const { promptUser, onStep, logger } = options;
  let { story, history } = state;

  onStep?.('plot');

  // Validate brief before plot generation
  const briefResult = StoryBriefSchema.safeParse(story);
  if (!briefResult.success) {
    throw new Error('Cannot generate plot: brief is incomplete');
  }
  const brief = briefResult.data;

  // Generate initial plot
  const plot = await plotAgent(brief);
  story = { ...story, plot };

  // Convert Message history to PlotMessage for plot conversation
  const plotHistory: PlotMessage[] = [];

  while (true) {
    // Validate for plot conversation
    const storyWithPlot = StoryWithPlotSchema.parse(story);
    const response = await plotConversationAgent(storyWithPlot, plotHistory);

    if (response.isComplete) break;

    const answer = await promptUser({ question: response.message, options: response.options });

    // Apply changes using plotInterpreterAgent
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
  options: { format?: BookFormatKey; mock?: boolean; onStep?: OnStep; outputManager?: StoryOutputManager } = {}
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
  const { onStep, outputManager, format = 'square-large', stylePreset: optionsPreset } = options;

  if (!state.plot) throw new Error('PipelineState requires plot to run pipeline');

  const story = assembleStoryWithPlot(state.brief, state.plot);
  const stylePreset = optionsPreset ?? (story.stylePreset ? await loadStylePreset(story.stylePreset) : undefined);

  // Setup phase
  onStep?.('style-guide');
  const styleGuide = state.styleGuide ?? await styleGuideAgent(story, stylePreset);

  onStep?.('prose-setup');
  const proseSetup = state.proseSetup ?? await proseSetupAgent(story);

  onStep?.('character-designs');
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
    onStep?.(`page-${pageNumber}-prose`);
    const prosePage = await prosePageAgent({ story, proseSetup, pageNumber, previousPages: prosePages });
    prosePages.push(prosePage);

    onStep?.(`page-${pageNumber}-visuals`);
    const illustratedPage = await pageVisualsAgent({ story, styleGuide, pageNumber, prosePage });
    illustratedPages.push(illustratedPage);

    onStep?.(`page-${pageNumber}-render`);
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

/**
 * Run the complete pipeline from any starting point.
 * Automatically skips completed stages based on input state.
 *
 * @param initialInput - String (initial message) or PartialStory (resume state)
 * @param options - Pipeline options including promptUser callback
 */
export const runPipeline = async (
  initialInput: string | PartialStory,
  options: UnifiedPipelineOptions
): Promise<{ story: ComposedStory; book: RenderedBook }> => {
  const { promptUser, onStep, outputManager, format = 'square-large', logger, stylePreset: optionsPreset } = options;

  // Initialize state from input
  const initialStory: PartialStory = typeof initialInput === 'string'
    ? {}
    : initialInput;
  const initialHistory: Message[] = typeof initialInput === 'string' && initialInput.trim()
    ? [{ role: 'assistant', content: 'Let\'s create a children\'s book!' }, { role: 'user', content: initialInput }]
    : [];

  // If we have an initial message, run extraction first
  let state: StageState = { story: initialStory, history: initialHistory };
  if (typeof initialInput === 'string' && initialInput.trim()) {
    const availableStyles = await listStyles();
    state.story = await extractorAgent(initialInput, state.story, { availableStyles, logger });
  }

  // Run intake stage (skips if brief is complete)
  state = await runIntakeStage(state, { promptUser, onStep, logger });

  // Save brief if we have an output manager
  const brief = StoryBriefSchema.parse(state.story);
  await outputManager?.saveBrief(brief);

  // Run plot stage (skips if plot is complete)
  state = await runPlotStage(state, { promptUser, onStep, logger });

  // Save plot
  const storyWithPlot = StoryWithPlotSchema.parse(state.story);
  await outputManager?.savePlot(storyWithPlot);

  // Continue with incremental pipeline for prose/visuals/render
  const pipelineState: PipelineState = {
    brief: storyWithPlot,
    plot: storyWithPlot.plot,
  };

  const stylePreset = optionsPreset ?? (storyWithPlot.stylePreset ? await loadStylePreset(storyWithPlot.stylePreset) : undefined);

  return runPipelineIncremental(pipelineState, { onStep, outputManager, format, logger, stylePreset });
};

// ============================================================================
// Re-exports for CLI convenience
// ============================================================================

export { renderPage, renderPageMock, createBook } from './agents';
