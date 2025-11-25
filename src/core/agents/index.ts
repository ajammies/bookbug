import type { StoryBrief, Manuscript, Story, Book } from '../schemas';

/**
 * Generic agent type: async function from Input to Output
 */
export type Agent<Input, Output> = (input: Input) => Promise<Output>;

/**
 * Pipeline agent types with concrete input/output
 */
export type BookBuilderAgent = Agent<string, StoryBrief>;
export type AuthorAgent = Agent<StoryBrief, Manuscript>;
export type DirectorAgent = Agent<Manuscript, Story>;
export type IllustratorAgent = Agent<Story, Book>;

/**
 * Progress callback for pipeline steps
 */
export type OnStepProgress = (step: string, status: 'start' | 'complete' | 'error', data?: unknown) => void;

// Re-export agents
export { bookBuilderAgent } from './book-builder';
export { authorAgent } from './author';
export { directorAgent } from './director';
export { illustratorAgent } from './illustrator';
