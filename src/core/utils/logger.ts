/**
 * Structured logging utilities using Pino
 *
 * Pure functional logger factory and helper functions.
 * Logs are written to centralized logs/ folder in NDJSON format.
 */
import pino from 'pino';
import path from 'path';
import { createStoryFolderName } from '../../cli/utils/naming';

export type Logger = pino.Logger;

export interface LoggerConfig {
  silent?: boolean;
  title?: string;
}

/** Derive log file path from name */
const getLogPath = (name: string): string =>
  path.join(process.cwd(), 'logs', `${name}.log`);

/** Create a configured logger instance */
export const createLogger = (config: LoggerConfig = {}): Logger => {
  if (config.silent) {
    return pino({ level: 'silent' });
  }

  const name = createStoryFolderName(config.title ?? 'run');

  return pino(
    { level: 'debug', base: { name } },
    pino.transport({
      target: 'pino/file',
      options: {
        destination: getLogPath(name),
        mkdir: true,
      },
    })
  );
};

/** Log API call success */
export const logApiSuccess = (logger: Logger | undefined, agent: string): void => {
  logger?.info({ agent, status: 'success' }, 'API call complete');
};

/** Log API call error */
export const logApiError = (logger: Logger | undefined, agent: string, error: string): void => {
  logger?.error({ agent, status: 'error', error }, 'API call failed');
};

/** Log rate limit with retry-after */
export const logRateLimit = (logger: Logger | undefined, agent: string, retryAfter: number): void => {
  logger?.warn({ agent, status: 'rate_limited', retryAfter }, 'Rate limited');
};

/** Log thinking status for CLI display */
export const logThinking = (logger: Logger | undefined, message: string): void => {
  logger?.info({ thinking: message }, 'status');
};
