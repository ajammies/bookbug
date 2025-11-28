/**
 * Retry utilities - thin wrapper around p-retry with rate limit support
 */
import pRetry, { AbortError, type RetryContext } from 'p-retry';

export { AbortError };

/**
 * Thrown on rate limit (429). Contains delay from retry-after header.
 */
export class RateLimitError extends Error {
  constructor(
    public retryAfterMs: number,
    message?: string
  ) {
    super(message ?? `Rate limited. Retry after ${retryAfterMs}ms`);
    this.name = 'RateLimitError';
  }
}

export interface RetryOptions {
  /** Number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Minimum delay between retries in ms (default: 1000) */
  minTimeout?: number;
  /** Maximum delay between retries in ms (default: 60000) */
  maxTimeout?: number;
  /** Callback before each retry */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Extract original error from p-retry's RetryContext */
const getOriginalError = (context: RetryContext): Error => context.error;

/** Check if error is a RateLimitError and return delay */
const getRateLimitDelay = (error: Error): number | null => {
  if (error instanceof RateLimitError) return error.retryAfterMs;
  if ('retryAfterMs' in error && typeof error.retryAfterMs === 'number') {
    return error.retryAfterMs;
  }
  return null;
};

/**
 * Execute a function with automatic retry and exponential backoff.
 *
 * Uses p-retry for exponential backoff with jitter.
 * Adds custom handling for RateLimitError to respect retry-after delays.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, minTimeout = 1000, maxTimeout = 60000, onRetry } = options;

  return pRetry(fn, {
    retries: maxRetries,
    minTimeout,
    maxTimeout,
    randomize: true,
    onFailedAttempt: async (failedAttempt) => {
      const originalError = getOriginalError(failedAttempt);
      const rateLimitDelay = getRateLimitDelay(originalError);

      if (rateLimitDelay !== null) {
        onRetry?.(failedAttempt.attemptNumber, originalError, rateLimitDelay);
        await sleep(rateLimitDelay);
      } else {
        onRetry?.(failedAttempt.attemptNumber, originalError, 0);
      }
    },
  });
}
