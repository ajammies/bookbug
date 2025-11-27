import { anthropic } from '@ai-sdk/anthropic';

/**
 * AI Model Configuration
 *
 * Centralized model configuration for all agents.
 * Change the model ID here to switch all agents at once.
 */

const DEFAULT_MODEL_ID = 'claude-sonnet-4-5-20250929';

/**
 * Get the configured model ID, with environment override support
 */
export const getModelId = (): string => {
  return process.env.BOOKBUG_MODEL_ID ?? DEFAULT_MODEL_ID;
};

/**
 * Get the configured Anthropic model instance
 *
 * Usage:
 * ```ts
 * import { getModel } from '../config';
 * const result = await generateObject({ model: getModel(), ... });
 * ```
 */
export const getModel = () => {
  return anthropic(getModelId());
};
