import { describe, it, expect, vi } from 'vitest';
import { withRetry, RateLimitError } from './retry';

describe('withRetry', () => {
  it('returns result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const onRetry = vi.fn();
    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1, onRetry });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting all retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 1 })
    ).rejects.toThrow('always fails');

    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('uses exponential backoff for regular errors', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');

    const delays: number[] = [];
    const onRetry = vi.fn((_attempt, _error, delayMs) => {
      delays.push(delayMs);
    });

    await withRetry(fn, { maxRetries: 3, baseDelayMs: 100, onRetry });

    // First retry: 100 * 2^0 = 100ms
    expect(delays[0]).toBe(100);
  });

  it('respects maxDelayMs cap', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValueOnce(new Error('fail 3'))
      .mockResolvedValue('success');

    const delays: number[] = [];
    const onRetry = vi.fn((_attempt, _error, delayMs) => {
      delays.push(delayMs);
    });

    await withRetry(fn, { maxRetries: 4, baseDelayMs: 100, maxDelayMs: 200, onRetry });

    // 100, 200, 200 (capped)
    expect(delays).toEqual([100, 200, 200]);
  });

  it('uses RateLimitError retryAfterMs for rate limit errors', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new RateLimitError(50)) // Use small delay for test
      .mockResolvedValue('success');

    const delays: number[] = [];
    const onRetry = vi.fn((_attempt, _error, delayMs) => {
      delays.push(delayMs);
    });

    await withRetry(fn, { maxRetries: 3, baseDelayMs: 100, onRetry });

    // Should use RateLimitError's retryAfterMs (50ms), not exponential backoff (100ms)
    expect(delays[0]).toBe(50);
  });

  it('calls onRetry callback with correct arguments', async () => {
    const error = new Error('test error');
    const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

    const onRetry = vi.fn();
    await withRetry(fn, { maxRetries: 2, baseDelayMs: 50, onRetry });

    expect(onRetry).toHaveBeenCalledWith(1, error, 50);
  });
});

describe('RateLimitError', () => {
  it('stores retryAfterMs', () => {
    const error = new RateLimitError(30000);
    expect(error.retryAfterMs).toBe(30000);
    expect(error.name).toBe('RateLimitError');
  });

  it('uses custom message if provided', () => {
    const error = new RateLimitError(30000, 'Custom rate limit message');
    expect(error.message).toBe('Custom rate limit message');
  });

  it('uses default message if not provided', () => {
    const error = new RateLimitError(30000);
    expect(error.message).toBe('Rate limited. Retry after 30000ms');
  });
});
