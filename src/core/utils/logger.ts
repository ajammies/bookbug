/**
 * Structured logging utilities using Pino
 *
 * Pure functional logger factory and helper functions.
 * Logs are written directly to story output folders in NDJSON format.
 */
import pino from 'pino';
import path from 'path';

export type Logger = pino.Logger;

export interface LoggerConfig {
  silent?: boolean;
}

/** Create a silent logger (for testing or when logging disabled) */
export const createSilentLogger = (): Logger => pino({ level: 'silent' });

/** Create a logger that writes to a specific folder */
export const createLoggerToFolder = (folder: string, config: LoggerConfig = {}): Logger => {
  if (config.silent) {
    return createSilentLogger();
  }

  const logPath = path.join(folder, 'run.log');

  return pino(
    { level: 'debug' },
    pino.transport({
      target: 'pino/file',
      options: {
        destination: logPath,
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
