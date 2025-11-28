/**
 * Retry utility with exponential backoff and rate limit handling
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay in milliseconds (default: 60000) */
  maxDelayMs?: number;
  /** Callback invoked before each retry */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

/**
 * Error thrown when a rate limit (429) is encountered.
 * Contains the delay to wait before retrying.
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

/**
 * Sleep for the specified duration
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Execute a function with automatic retry and exponential backoff.
 *
 * - For RateLimitError, uses the specified retryAfterMs delay
 * - For other errors, uses exponential backoff: baseDelayMs * 2^attempt
 *
 * @example
 * const result = await withRetry(
 *   () => fetchData(),
 *   {
 *     maxRetries: 5,
 *     onRetry: (attempt, error, delayMs) => {
 *       console.log(`Retry ${attempt}: ${error.message}. Waiting ${delayMs}ms...`);
 *     }
 *   }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 60000,
    onRetry,
  } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // If we've exhausted all retries, throw the error
      if (attempt === maxRetries) {
        throw error;
      }

      let delayMs: number;

      // Handle rate limit with retry-after
      if (error instanceof RateLimitError) {
        delayMs = error.retryAfterMs;
      } else {
        // Exponential backoff: 1s, 2s, 4s, 8s...
        delayMs = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      }

      onRetry?.(attempt + 1, error as Error, delayMs);
      await sleep(delayMs);
    }
  }

  // This should be unreachable, but TypeScript needs it
  throw new Error('Unreachable');
}
