import { describe, it, expect, vi } from 'vitest';
import { sleep, retryWithBackoff } from './retry';

describe('sleep', () => {
  it('waits for specified duration', async () => {
    const start = Date.now();
    await sleep(10);
    // Allow 1ms tolerance for timer variance
    expect(Date.now() - start).toBeGreaterThanOrEqual(9);
  });
});

describe('retryWithBackoff', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await retryWithBackoff(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');
    const result = await retryWithBackoff(fn, { initialDelayMs: 1 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(retryWithBackoff(fn, { maxRetries: 2, initialDelayMs: 1 }))
      .rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('respects shouldRetry predicate', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('non-retryable'));
    const shouldRetry = (err: unknown) => (err as Error).message !== 'non-retryable';
    await expect(retryWithBackoff(fn, { shouldRetry, initialDelayMs: 1 }))
      .rejects.toThrow('non-retryable');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
