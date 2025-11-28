import { describe, it, expect } from 'vitest';
import { pRetry, AbortError, RateLimitError, sleep } from './retry';

describe('retry exports', () => {
  it('exports pRetry from p-retry', () => {
    expect(typeof pRetry).toBe('function');
  });

  it('exports AbortError from p-retry', () => {
    const error = new AbortError('test');
    expect(error.name).toBe('AbortError');
  });

  it('exports sleep helper', async () => {
    const start = Date.now();
    await sleep(10);
    expect(Date.now() - start).toBeGreaterThanOrEqual(10);
  });
});

describe('RateLimitError', () => {
  it('stores retryAfterMs', () => {
    const error = new RateLimitError(30000);
    expect(error.retryAfterMs).toBe(30000);
    expect(error.name).toBe('RateLimitError');
  });

  it('uses custom message if provided', () => {
    const error = new RateLimitError(30000, 'Custom message');
    expect(error.message).toBe('Custom message');
  });

  it('uses default message if not provided', () => {
    const error = new RateLimitError(30000);
    expect(error.message).toBe('Rate limited. Retry after 30000ms');
  });

  it('is instanceof Error', () => {
    const error = new RateLimitError(1000);
    expect(error).toBeInstanceOf(Error);
  });
});
