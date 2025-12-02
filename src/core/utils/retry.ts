/**
 * Retry utilities
 */

import type { Logger } from './logger';

/** Sleep helper for rate limit delays */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  /** Extract retry-after seconds from error, overrides exponential backoff */
  getRetryAfter?: (error: unknown) => number | null;
  logger?: Logger;
}

/**
 * Retry a function with exponential backoff.
 * Pure utility - no business logic, just retry mechanics.
 * If getRetryAfter returns a value, uses that instead of exponential backoff.
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry = () => true,
    getRetryAfter,
    logger,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Use retry-after from error if available, otherwise exponential backoff
      const retryAfterMs = getRetryAfter?.(error);
      const delayMs = retryAfterMs ?? Math.min(initialDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      logger?.warn({ attempt, delayMs, error: (error as Error).message }, 'Retrying after error');
      await sleep(delayMs);
    }
  }

  throw lastError;
};
