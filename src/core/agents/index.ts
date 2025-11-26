import type { StoryBrief, StoryBlurb, Manuscript, Story, Book } from '../schemas';

/**
 * Generic agent type: async function from Input to Output
 */
export type Agent<Input, Output> = (input: Input) => Promise<Output>;

/**
 * Pipeline agent types with concrete input/output
 */
export type AuthorAgent = Agent<StoryBlurb, Manuscript>;
export type DirectorAgent = Agent<Manuscript, Story>;
export type IllustratorAgent = Agent<Story, Book>;

/**
 * Progress callback for pipeline steps
 */
export type OnStepProgress = (step: string, status: 'start' | 'complete' | 'error', data?: unknown) => void;

// Re-export agents
export { authorAgent } from './author';
export { directorAgent } from './director';
export { illustratorAgent, type IllustratorConfig } from './illustrator';

// Chat intake agents (StoryBrief)
export { interpreterAgent } from './interpreter';
export { conversationAgent, type Message, type MessageRole } from './conversation';

// Blurb iteration agents (StoryBlurb)
export { blurbGeneratorAgent } from './blurb-generator';
export { blurbConversationAgent, type BlurbMessage } from './blurb-conversation';
export { blurbInterpreterAgent } from './blurb-interpreter';
