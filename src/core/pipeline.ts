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
 * Prompt configuration for user interaction
 */
export interface PromptConfig {
  question: string;
  options: string[];
}

/**
 * Callback for prompting user during intake/plot stages
 * Returns the user's response string
 */
export type PromptUser = (config: PromptConfig) => Promise<string>;

export interface PipelineOptions {
  onStep?: OnStep;
  outputManager?: StoryOutputManager;
  format?: BookFormatKey;
  logger?: Logger;
  stylePreset?: StylePreset;
}

/**
 * Extended options for unified pipeline that includes intake/plot stages
 */
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
// Unified Pipeline Stages
// ============================================================================

/**
 * Stage state - story + conversation history that flows between stages
 */
interface StageState {
  story: PartialStory;
  history: Message[];
}

/**
 * Intake stage: Gather story brief through conversation
 * Skips if brief is already complete
 */
const runIntakeStage = async (
  state: StageState,
  options: { promptUser: PromptUser; onStep?: OnStep; logger?: Logger }
): Promise<StageState> => {
  if (hasCompleteBrief(state.story)) {
    options.onStep?.('intake-skip');
    return state;
  }

  options.onStep?.('intake');
  const availableStyles = await listStyles();
  let { story, history } = state;

  while (!hasCompleteBrief(story)) {
    const response = await conversationAgent(story, history, { availableStyles });

    if (response.isComplete) break;

    const userInput = await options.promptUser({
      question: response.question,
      options: response.options,
    });

    story = await extractorAgent(userInput, story, { availableStyles, logger: options.logger });

    history = [
      ...history,
      { role: 'assistant', content: response.question },
      { role: 'user', content: userInput },
    ];
  }

  return { story, history };
};

/**
 * Plot stage: Generate and refine plot structure
 * Skips if plot is already complete
 * Receives history from intake stage for context
 */
const runPlotStage = async (
  state: StageState,
  options: { promptUser: PromptUser; onStep?: OnStep; logger?: Logger }
): Promise<StageState> => {
  if (hasCompletePlot(state.story)) {
    options.onStep?.('plot-skip');
    return state;
  }

  options.onStep?.('plot-generate');

  // Need complete brief to generate plot
  if (!hasCompleteBrief(state.story)) {
    throw new Error('Cannot run plot stage without complete brief');
  }

  let { story, history } = state;

  // Generate initial plot if missing
  if (!story.plot) {
    const plot = await plotAgent(story as StoryBrief);
    story = { ...story, plot };
  }

  // Plot conversation loop - uses history from intake for context
  const plotHistory: PlotMessage[] = history.map(m => ({
    role: m.role,
    content: m.content,
  }));

  while (true) {
    options.onStep?.('plot-refine');
    const response = await plotConversationAgent(story as StoryWithPlot, plotHistory);

    if (response.isComplete) break;

    const userInput = await options.promptUser({
      question: response.message,
      options: response.options,
    });

    // Use extractor to apply changes (it handles plot fields)
    story = await extractorAgent(userInput, story, { logger: options.logger });

    plotHistory.push(
      { role: 'assistant', content: response.message },
      { role: 'user', content: userInput }
    );
  }

  // Update combined history
  const newHistory: Message[] = plotHistory.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  return { story, history: newHistory };
};

/**
 * Unified pipeline: Runs all stages from any starting point
 *
 * Pass any partial story - pipeline runs only missing stages:
 * - Empty/partial brief → runs intake conversation
 * - Complete brief, no plot → generates and refines plot
 * - Complete brief + plot → skips to prose/visuals/render
 *
 * Conversation history flows between intake and plot stages,
 * giving plot context about what user told us during intake.
 */
export const runPipeline = async (
  initialInput: string | PartialStory,
  options: UnifiedPipelineOptions
): Promise<{ story: ComposedStory; book: RenderedBook }> => {
  const { promptUser, onStep, outputManager, format = 'square-large', logger, stylePreset: optionsPreset } = options;

  // Start with initial story state
  const availableStyles = await listStyles();
  let state: StageState = {
    story: typeof initialInput === 'string'
      ? await extractorAgent(initialInput, {}, { availableStyles, logger })
      : initialInput,
    history: [],
  };

  // Run intake stage (conversation if brief incomplete)
  state = await runIntakeStage(state, { promptUser, onStep, logger });

  // Run plot stage (generate + refine if plot incomplete)
  state = await runPlotStage(state, { promptUser, onStep, logger });

  // At this point we have a complete StoryWithPlot
  if (!hasCompletePlot(state.story)) {
    throw new Error('Pipeline error: story should have complete plot at this point');
  }

  // Convert to PipelineState for incremental processing
  const pipelineState: PipelineState = {
    brief: state.story as StoryBrief,
    plot: state.story.plot,
    // Include any other artifacts that might have been extracted
    proseSetup: state.story.prose ? {
      logline: state.story.prose.logline,
      theme: state.story.prose.theme,
      styleNotes: state.story.prose.styleNotes,
    } : undefined,
    prosePages: state.story.prose?.pages,
    characterDesigns: state.story.characterDesigns,
  };

  // Run remaining stages (prose, visuals, render)
  return runPipelineIncremental(pipelineState, { onStep, outputManager, format, logger, stylePreset: optionsPreset });
};

// ============================================================================
// Re-exports for CLI convenience
// ============================================================================

export { renderPage, renderPageMock, createBook } from './agents';
