import type {
  StoryWithPlot,
  StoryWithProse,
  Prose,
  VisualDirection,
} from '../schemas';

/**
 * Generic agent type: async function from Input to Output
 */
export type Agent<Input, Output> = (input: Input) => Promise<Output>;

/**
 * Pipeline agent types with concrete input/output (named after output)
 */
export type ProseAgentType = Agent<StoryWithPlot, Prose>;
export type VisualsAgentType = Agent<StoryWithProse, VisualDirection>;

/**
 * Progress callback for pipeline steps
 */
export type OnStepProgress = (step: string, status: 'start' | 'complete' | 'error', data?: unknown) => void;

// Re-export agents (named after their output)
export { proseAgent, proseSetupAgent, prosePageAgent, type ProsePageInput } from './prose';
export { visualsAgent, styleGuideAgent, pageVisualsAgent, type PageVisualsInput } from './visuals';
export { characterDesignAgent, generateCharacterDesigns } from './character-design';
export { renderPage, renderPageMock, createBook, filterStoryForPage } from './renderer';

// Chat intake agents (StoryBrief)
export { interpreterAgent } from './interpreter';
export { conversationAgent, type Message, type MessageRole } from './conversation';

// Plot iteration agents (PlotStructure)
export { plotAgent } from './plot';
export { plotConversationAgent, type BlurbMessage } from './plot-conversation';
export { plotInterpreterAgent } from './plot-interpreter';
