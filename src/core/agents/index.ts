import type {
  StoryBrief,
  StoryWithPlot,
  StoryWithProse,
  Prose,
  VisualDirection,
  Story,
  RenderedBook,
  // Legacy types (to be removed)
  StoryBlurb,
  Manuscript,
} from '../schemas';

/**
 * Generic agent type: async function from Input to Output
 */
export type Agent<Input, Output> = (input: Input) => Promise<Output>;

/**
 * Pipeline agent types with concrete input/output (NEW composed types)
 */
export type AuthorAgentType = Agent<StoryWithPlot, Prose>;
export type IllustratorAgentType = Agent<StoryWithProse, VisualDirection>;

/**
 * LEGACY agent types (to be removed after full migration)
 */
export type AuthorAgent = Agent<StoryBlurb, Manuscript>;
export type IllustratorAgent = Agent<Manuscript, Story>;

/**
 * Progress callback for pipeline steps
 */
export type OnStepProgress = (step: string, status: 'start' | 'complete' | 'error', data?: unknown) => void;

// Re-export agents
export { authorAgent } from './author';
export { illustratorAgent } from './illustrator';
export { renderPage, renderPageMock, createBook, filterStoryForPage } from './renderer';

// Chat intake agents (StoryBrief)
export { interpreterAgent } from './interpreter';
export { conversationAgent, type Message, type MessageRole } from './conversation';

// Blurb iteration agents (StoryBlurb)
export { blurbGeneratorAgent } from './blurb-generator';
export { blurbConversationAgent, type BlurbMessage } from './blurb-conversation';
export { blurbInterpreterAgent } from './blurb-interpreter';
