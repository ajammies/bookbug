/**
 * Log tailing utilities for real-time CLI display
 *
 * Pure functional log tailing with cleanup function.
 * Parses NDJSON log entries and extracts "thinking" messages.
 */
import { spawn } from 'child_process';

export interface TailHandle {
  stop: () => void;
}

/** Parse a log line and extract thinking message if present */
const parseThinkingMessage = (line: string): string | null => {
  try {
    const entry = JSON.parse(line);
    return entry.thinking ?? null;
  } catch {
    return null;
  }
};

/** Process raw data into lines and handle each thinking message */
const processLogData = (data: Buffer, onThinking: (msg: string) => void): void =>
  data
    .toString()
    .split('\n')
    .filter(Boolean)
    .map(parseThinkingMessage)
    .filter((msg): msg is string => msg !== null)
    .forEach(onThinking);

/** Start tailing a log file, returns handle to stop */
export const tailLogFile = (
  logPath: string,
  onThinking: (msg: string) => void
): TailHandle => {
  const tail = spawn('tail', ['-f', logPath]);
  tail.stdout.on('data', (data: Buffer) => processLogData(data, onThinking));
  return { stop: () => tail.kill() };
};

/** Get log file path from runId */
export const getLogPath = (runId: string): string =>
  `logs/run-${runId}.log`;
