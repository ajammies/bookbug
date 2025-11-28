/**
 * Retry utilities
 */

/** Sleep helper for rate limit delays */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
