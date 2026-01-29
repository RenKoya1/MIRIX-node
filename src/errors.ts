/**
 * Custom Error Classes for Mirix TypeScript
 * Converted from: mirix/errors.py
 */

/**
 * Base error class for Mirix
 */
export class MirixError extends Error {
    public readonly code: string;
    public readonly statusCode: number;

    constructor(message: string, code = 'MIRIX_ERROR', statusCode = 500) {
        super(message);
        this.name = 'MirixError';
        this.code = code;
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Error for invalid configuration
 */
export class ConfigurationError extends MirixError {
    constructor(message: string) {
        super(message, 'CONFIGURATION_ERROR', 400);
        this.name = 'ConfigurationError';
    }
}

/**
 * Error for authentication failures
 */
export class AuthenticationError extends MirixError {
    constructor(message = 'Authentication failed') {
        super(message, 'AUTHENTICATION_ERROR', 401);
        this.name = 'AuthenticationError';
    }
}

/**
 * Error for authorization failures
 */
export class AuthorizationError extends MirixError {
    constructor(message = 'Not authorized') {
        super(message, 'AUTHORIZATION_ERROR', 403);
        this.name = 'AuthorizationError';
    }
}

/**
 * Error for resource not found
 */
export class NotFoundError extends MirixError {
    constructor(resource: string, id?: string) {
        const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
        super(message, 'NOT_FOUND', 404);
        this.name = 'NotFoundError';
    }
}

/**
 * Error for validation failures
 */
export class ValidationError extends MirixError {
    public readonly errors: Record<string, string[]>;

    constructor(message: string, errors: Record<string, string | string[]> = {}) {
        super(message, 'VALIDATION_ERROR', 400);
        this.name = 'ValidationError';
        // Normalize errors to always use string arrays
        this.errors = Object.fromEntries(
            Object.entries(errors).map(([key, value]) => [
                key,
                Array.isArray(value) ? value : [value],
            ])
        );
    }
}

/**
 * Error for LLM API failures
 */
export class LLMAPIError extends MirixError {
    public readonly provider: string;
    public readonly originalError?: Error;

    constructor(message: string, provider: string, originalError?: Error) {
        super(message, 'LLM_API_ERROR', 502);
        this.name = 'LLMAPIError';
        this.provider = provider;
        this.originalError = originalError;
    }
}

/**
 * Error for rate limiting
 */
export class RateLimitError extends MirixError {
    public readonly retryAfter?: number;

    constructor(message = 'Rate limit exceeded', retryAfter?: number) {
        super(message, 'RATE_LIMIT_ERROR', 429);
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
    }
}

/**
 * Error for tool execution failures
 */
export class ToolExecutionError extends MirixError {
    public readonly toolName: string;
    public readonly originalError?: Error;

    constructor(toolName: string, message: string, originalError?: Error) {
        super(message, 'TOOL_EXECUTION_ERROR', 500);
        this.name = 'ToolExecutionError';
        this.toolName = toolName;
        this.originalError = originalError;
    }
}

/**
 * Error for context window exceeded
 */
export class ContextWindowExceededError extends MirixError {
    public readonly tokenCount: number;
    public readonly maxTokens: number;

    constructor(tokenCount: number, maxTokens: number) {
        super(
            `Context window exceeded: ${tokenCount} tokens requested, but maximum is ${maxTokens}`,
            'CONTEXT_WINDOW_EXCEEDED',
            400
        );
        this.name = 'ContextWindowExceededError';
        this.tokenCount = tokenCount;
        this.maxTokens = maxTokens;
    }
}

/**
 * Error for database operations
 */
export class DatabaseError extends MirixError {
    public readonly originalError?: Error;

    constructor(message: string, originalError?: Error) {
        super(message, 'DATABASE_ERROR', 500);
        this.name = 'DatabaseError';
        this.originalError = originalError;
    }
}

/**
 * Error for agent step failures
 */
export class AgentStepError extends MirixError {
    public readonly agentId: string;
    public readonly stepNumber: number;

    constructor(agentId: string, stepNumber: number, message: string) {
        super(message, 'AGENT_STEP_ERROR', 500);
        this.name = 'AgentStepError';
        this.agentId = agentId;
        this.stepNumber = stepNumber;
    }
}

/**
 * Error for memory operations
 */
export class MemoryError extends MirixError {
    public readonly memoryType?: string;

    constructor(message: string, memoryType?: string) {
        super(message, 'MEMORY_ERROR', 500);
        this.name = 'MemoryError';
        this.memoryType = memoryType;
    }
}
