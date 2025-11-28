import { describe, it, expect, vi } from 'vitest';
import { withRetry, RateLimitError, AbortError } from './retry';

describe('withRetry', () => {
  const fastOptions = { minTimeout: 1, maxTimeout: 10 };

  it('returns result on first success', async () => {
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

    const result = await withRetry(fn, { maxRetries: 3, ...fastOptions });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(withRetry(fn, { maxRetries: 2, ...fastOptions })).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('calls onRetry callback', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('success');
    const onRetry = vi.fn();

    await withRetry(fn, { maxRetries: 2, onRetry, ...fastOptions });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry.mock.calls[0]?.[0]).toBe(1); // attempt number
    expect(onRetry.mock.calls[0]?.[1]).toBeInstanceOf(Error); // error
  });

  it('aborts immediately on AbortError', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new AbortError('permanent failure'))
      .mockResolvedValue('should not reach');

    await expect(withRetry(fn, { maxRetries: 5 })).rejects.toThrow('permanent failure');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('respects RateLimitError delay', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new RateLimitError(50, 'Rate limited'))
      .mockResolvedValue('success');

    const onRetry = vi.fn();
    const start = Date.now();

    await withRetry(fn, { maxRetries: 2, onRetry, ...fastOptions });

    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some timing variance
    expect(onRetry.mock.calls[0]?.[2]).toBe(50); // delay from RateLimitError
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
});

describe('AbortError', () => {
  it('is exported from p-retry', () => {
    const error = new AbortError('test');
    expect(error.name).toBe('AbortError');
    expect(error.message).toBe('test');
  });
});
