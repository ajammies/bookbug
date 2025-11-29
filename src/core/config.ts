import { anthropic } from '@ai-sdk/anthropic';

/**
 * AI Model Configuration
 *
 * Centralized model configuration for all agents.
 * - Default model: claude-sonnet-4-5 (higher quality)
 * - Fast model: claude-haiku-4-5 (faster TTFT, good for streaming)
 */

const DEFAULT_MODEL_ID = 'claude-sonnet-4-5-20250929';
const FAST_MODEL_ID = 'claude-haiku-4-5-20251001';

/**
 * Get the configured model ID, with environment override support
 */
export const getModelId = (): string => {
  return process.env.BOOKBUG_MODEL_ID ?? DEFAULT_MODEL_ID;
};

/**
 * Get the configured Anthropic model instance (default quality)
 */
export const getModel = () => {
  return anthropic(getModelId());
};

/**
 * Get the fast Anthropic model instance (faster TTFT, good for streaming)
 * Used for prose and visuals where we want responsive streaming updates.
 */
export const getFastModel = () => {
  return anthropic(process.env.BOOKBUG_FAST_MODEL_ID ?? FAST_MODEL_ID);
};
