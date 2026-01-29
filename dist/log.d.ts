/**
 * Logger configuration for Mirix TypeScript
 * Converted from: mirix/log.py
 */
import pino from 'pino';
/**
 * Log levels
 */
export declare const LogLevel: {
    readonly TRACE: "trace";
    readonly DEBUG: "debug";
    readonly INFO: "info";
    readonly WARN: "warn";
    readonly ERROR: "error";
    readonly FATAL: "fatal";
};
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];
/**
 * Logger type
 */
export type Logger = pino.Logger;
/**
 * Get a logger instance for a specific module/name
 */
export declare function getLogger(name: string): Logger;
/**
 * Set the global log level
 */
export declare function setLogLevel(level: LogLevel): void;
/**
 * Get the current log level
 */
export declare function getLogLevel(): string;
/**
 * Default logger instance
 */
export declare const logger: Logger;
export default logger;
//# sourceMappingURL=log.d.ts.map