import { config } from '../../config';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const currentLevel = config.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;

function formatMessage(level: string, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: unknown): void {
    if (currentLevel <= LogLevel.DEBUG) {
      console.debug(formatMessage('DEBUG', message, meta));
    }
  },

  info(message: string, meta?: unknown): void {
    if (currentLevel <= LogLevel.INFO) {
      console.info(formatMessage('INFO', message, meta));
    }
  },

  warn(message: string, meta?: unknown): void {
    if (currentLevel <= LogLevel.WARN) {
      console.warn(formatMessage('WARN', message, meta));
    }
  },

  error(message: string, meta?: unknown): void {
    if (currentLevel <= LogLevel.ERROR) {
      console.error(formatMessage('ERROR', message, meta));
    }
  },
};
