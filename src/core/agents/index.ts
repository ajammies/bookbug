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
export { visualsAgent, styleGuideAgent, pageVisualsAgent, type PageVisualsInput, type StylePreset } from './visuals';
export { characterDesignAgent, generateCharacterDesigns } from './character-design';
export { renderPage, renderPageMock, createBook, filterStoryForPage } from './renderer';

// Progress messages for CLI display
export { progressMessagesAgent } from './progress-messages';

// Plot generation agent (PlotStructure)
export { plotAgent } from './plot';

// Intake agent (unified conversation + extraction)
export {
  intakeAgent,
  type IntakeAgentOptions,
  type IntakeAgentResult,
  type IntakeMessage,
  type IntakeMode,
} from './intake-agent';

// Re-export IntakeMessage as Message for backward compatibility with pipeline
export type { IntakeMessage as Message } from './intake-agent';
export type MessageRole = 'user' | 'assistant';
export { createIntakeTools, type IntakeState, type IntakeTools, type ToolResult } from './intake-tools';

// Generic extractor (outputs ExtractionResult<T>)
export { extract, type ExtractionResult, type ExtractOptions } from './extractor';

// Image quality analysis (outputs ImageQualityResult)
export { imageQualityAgent, type ImageQualityOptions, type ImageInput } from './image-quality';

// Prompt condenser for image generation (outputs plain text prompt)
export { promptCondenserAgent } from './prompt-condenser';
