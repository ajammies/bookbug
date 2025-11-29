import { describe, it, expect } from 'vitest';
import { sleep } from './retry';

describe('sleep', () => {
  it('waits for specified duration', async () => {
    const start = Date.now();
    await sleep(10);
    // Allow 1ms tolerance for timer variance
    expect(Date.now() - start).toBeGreaterThanOrEqual(9);
  });
});
