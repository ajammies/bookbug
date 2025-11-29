/**
 * Log tailing utilities for real-time CLI display
 *
 * Pure functional log tailing with cleanup function.
 * Parses NDJSON log entries and extracts "thinking" messages.
 */
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

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

/** Ensure log file exists (create directory and file if needed) */
const ensureLogFile = (logPath: string): void => {
  const dir = path.dirname(logPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(logPath)) {
    writeFileSync(logPath, '');
  }
};

/** Start tailing a log file, returns handle to stop */
export const tailLogFile = (
  logPath: string,
  onThinking: (msg: string) => void
): TailHandle => {
  // Ensure file exists before tailing (pino creates lazily)
  ensureLogFile(logPath);

  // Use -F to follow by name (handles file recreation)
  const tail = spawn('tail', ['-F', logPath]);
  tail.stdout.on('data', (data: Buffer) => processLogData(data, onThinking));
  // Suppress stderr (tail -F emits warnings about file truncation)
  tail.stderr.on('data', () => {});
  return { stop: () => tail.kill() };
};

