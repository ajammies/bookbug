import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger, logApiSuccess, logApiError, logRateLimit, logThinking } from './logger';
import type { Logger } from './logger';

describe('createLogger', () => {
  it('creates a silent logger when silent option is true', () => {
    const logger = createLogger({ silent: true });
    expect(logger.level).toBe('silent');
  });

  it('creates a logger with debug level by default', () => {
    const logger = createLogger({ silent: false, title: 'test-story' });
    expect(logger.level).toBe('debug');
  });

  it('includes name in bindings based on title', () => {
    const logger = createLogger({ silent: false, title: 'My Test Story' });
    const bindings = logger.bindings();
    expect(bindings.name).toMatch(/my-test-story/);
  });
});

describe('logger helpers', () => {
  let mockLogger: Logger;
  let infoSpy: ReturnType<typeof vi.fn>;
  let errorSpy: ReturnType<typeof vi.fn>;
  let warnSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    infoSpy = vi.fn();
    errorSpy = vi.fn();
    warnSpy = vi.fn();
    mockLogger = {
      info: infoSpy,
      error: errorSpy,
      warn: warnSpy,
    } as unknown as Logger;
  });

  describe('logApiSuccess', () => {
    it('logs success with agent name', () => {
      logApiSuccess(mockLogger, 'testAgent');
      expect(infoSpy).toHaveBeenCalledWith(
        { agent: 'testAgent', status: 'success' },
        'API call complete'
      );
    });

    it('does nothing when logger is undefined', () => {
      logApiSuccess(undefined, 'testAgent');
      expect(infoSpy).not.toHaveBeenCalled();
    });
  });

  describe('logApiError', () => {
    it('logs error with agent name and message', () => {
      logApiError(mockLogger, 'testAgent', 'Something went wrong');
      expect(errorSpy).toHaveBeenCalledWith(
        { agent: 'testAgent', status: 'error', error: 'Something went wrong' },
        'API call failed'
      );
    });

    it('does nothing when logger is undefined', () => {
      logApiError(undefined, 'testAgent', 'error');
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('logRateLimit', () => {
    it('logs rate limit with retry-after seconds', () => {
      logRateLimit(mockLogger, 'testAgent', 30);
      expect(warnSpy).toHaveBeenCalledWith(
        { agent: 'testAgent', status: 'rate_limited', retryAfter: 30 },
        'Rate limited'
      );
    });

    it('does nothing when logger is undefined', () => {
      logRateLimit(undefined, 'testAgent', 30);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('logThinking', () => {
    it('logs thinking message', () => {
      logThinking(mockLogger, 'Processing...');
      expect(infoSpy).toHaveBeenCalledWith(
        { thinking: 'Processing...' },
        'status'
      );
    });

    it('does nothing when logger is undefined', () => {
      logThinking(undefined, 'Processing...');
      expect(infoSpy).not.toHaveBeenCalled();
    });
  });
});
