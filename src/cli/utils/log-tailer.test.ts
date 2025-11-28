import { describe, it, expect } from 'vitest';
import { getLogPath } from './log-tailer';

describe('getLogPath', () => {
  it('returns correct log path for runId', () => {
    expect(getLogPath('abc123')).toBe('logs/run-abc123.log');
  });

  it('handles various runId formats', () => {
    expect(getLogPath('test')).toBe('logs/run-test.log');
    expect(getLogPath('run-123-xyz')).toBe('logs/run-run-123-xyz.log');
  });
});

// Note: tailLogFile spawns a subprocess and requires file I/O,
// making it better suited for integration testing rather than unit tests.
// The parseThinkingMessage and processLogData are internal functions
// tested indirectly through the tailLogFile integration.
