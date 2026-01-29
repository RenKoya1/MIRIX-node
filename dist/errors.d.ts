/**
 * Custom Error Classes for Mirix TypeScript
 * Converted from: mirix/errors.py
 */
/**
 * Base error class for Mirix
 */
export declare class MirixError extends Error {
    readonly code: string;
    readonly statusCode: number;
    constructor(message: string, code?: string, statusCode?: number);
}
/**
 * Error for invalid configuration
 */
export declare class ConfigurationError extends MirixError {
    constructor(message: string);
}
/**
 * Error for authentication failures
 */
export declare class AuthenticationError extends MirixError {
    constructor(message?: string);
}
/**
 * Error for authorization failures
 */
export declare class AuthorizationError extends MirixError {
    constructor(message?: string);
}
/**
 * Error for resource not found
 */
export declare class NotFoundError extends MirixError {
    constructor(resource: string, id?: string);
}
/**
 * Error for validation failures
 */
export declare class ValidationError extends MirixError {
    readonly errors: Record<string, string[]>;
    constructor(message: string, errors?: Record<string, string[]>);
}
/**
 * Error for LLM API failures
 */
export declare class LLMAPIError extends MirixError {
    readonly provider: string;
    readonly originalError?: Error;
    constructor(message: string, provider: string, originalError?: Error);
}
/**
 * Error for rate limiting
 */
export declare class RateLimitError extends MirixError {
    readonly retryAfter?: number;
    constructor(message?: string, retryAfter?: number);
}
/**
 * Error for tool execution failures
 */
export declare class ToolExecutionError extends MirixError {
    readonly toolName: string;
    readonly originalError?: Error;
    constructor(toolName: string, message: string, originalError?: Error);
}
/**
 * Error for context window exceeded
 */
export declare class ContextWindowExceededError extends MirixError {
    readonly tokenCount: number;
    readonly maxTokens: number;
    constructor(tokenCount: number, maxTokens: number);
}
/**
 * Error for database operations
 */
export declare class DatabaseError extends MirixError {
    readonly originalError?: Error;
    constructor(message: string, originalError?: Error);
}
/**
 * Error for agent step failures
 */
export declare class AgentStepError extends MirixError {
    readonly agentId: string;
    readonly stepNumber: number;
    constructor(agentId: string, stepNumber: number, message: string);
}
/**
 * Error for memory operations
 */
export declare class MemoryError extends MirixError {
    readonly memoryType?: string;
    constructor(message: string, memoryType?: string);
}
//# sourceMappingURL=errors.d.ts.map