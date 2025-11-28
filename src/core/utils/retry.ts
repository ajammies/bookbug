/**
 * Retry utilities - re-exports p-retry with domain-specific error types
 */
export { default as pRetry, AbortError } from 'p-retry';

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

/** Sleep helper for rate limit delays */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
