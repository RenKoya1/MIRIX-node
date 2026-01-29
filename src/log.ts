/**
 * Logger configuration for Mirix TypeScript
 * Converted from: mirix/log.py
 */

import pino from 'pino';

/**
 * Log levels
 */
export const LogLevel = {
    TRACE: 'trace',
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    FATAL: 'fatal',
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * Default log level from environment
 */
const DEFAULT_LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO;

/**
 * Whether to use pretty printing (for development)
 */
const PRETTY_PRINT = process.env.NODE_ENV !== 'production';

/**
 * Create the base logger instance
 */
const baseLogger = pino({
    level: DEFAULT_LOG_LEVEL,
    transport: PRETTY_PRINT
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
    base: {
        service: 'mirix-node',
    },
});

/**
 * Logger type
 */
export type Logger = pino.Logger;

/**
 * Get a logger instance for a specific module/name
 */
export function getLogger(name: string): Logger {
    return baseLogger.child({ module: name });
}

/**
 * Set the global log level
 */
export function setLogLevel(level: LogLevel): void {
    baseLogger.level = level;
}

/**
 * Get the current log level
 */
export function getLogLevel(): string {
    return baseLogger.level;
}

/**
 * Default logger instance
 */
export const logger = getLogger('mirix');

export default logger;
