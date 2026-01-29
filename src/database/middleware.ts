/**
 * Database Middleware
 * Provides utilities for soft delete, audit fields, and retry logic
 * Note: Prisma 5+ uses extensions instead of middleware for most use cases
 */

import { logger } from '../log.js';

// Models that support soft delete
export const SOFT_DELETE_MODELS = [
    'Organization',
    'User',
    'Client',
    'ClientApiKey',
    'Agent',
    'Tool',
    'Block',
    'Message',
    'Step',
    'EpisodicEvent',
    'SemanticMemoryItem',
    'ProceduralMemoryItem',
    'ResourceMemoryItem',
    'KnowledgeItem',
    'MemoryQueueTrace',
    'MemoryAgentTrace',
    'MemoryAgentToolCall',
    'FileMetadata',
    'CloudFileMapping',
    'Provider',
];

// Models that support audit fields
export const AUDIT_MODELS = SOFT_DELETE_MODELS;

/**
 * Context for tracking the current actor (user/client making the request)
 */
export interface AuditContext {
    actorId?: string;
}

// Current audit context
let currentAuditContext: AuditContext = {};

/**
 * Set the current audit context
 */
export function setAuditContext(context: AuditContext): void {
    currentAuditContext = context;
}

/**
 * Get the current audit context
 */
export function getAuditContext(): AuditContext {
    return currentAuditContext;
}

/**
 * Clear the current audit context
 */
export function clearAuditContext(): void {
    currentAuditContext = {};
}

/**
 * Run a function with a specific audit context
 */
export async function withAuditContext<T>(
    context: AuditContext,
    fn: () => Promise<T>
): Promise<T> {
    const previousContext = currentAuditContext;
    currentAuditContext = context;
    try {
        return await fn();
    } finally {
        currentAuditContext = previousContext;
    }
}

/**
 * Retry configuration
 */
interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 100,
    maxDelay: 5000,
    backoffFactor: 2,
};

/**
 * Error patterns that should trigger a retry
 */
const RETRYABLE_ERROR_PATTERNS = [
    'database is locked',
    'could not obtain lock',
    'deadlock detected',
    'connection refused',
    'connection reset',
    'connection timed out',
    'ECONNREFUSED',
    'ETIMEDOUT',
];

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return RETRYABLE_ERROR_PATTERNS.some((pattern) =>
            message.includes(pattern.toLowerCase())
        );
    }
    return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
    );
    const jitter = delay * Math.random() * 0.1;
    return delay + jitter;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
): Promise<T> {
    const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: unknown;

    for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (!isRetryableError(error) || attempt === fullConfig.maxRetries) {
                throw error;
            }

            const delay = calculateDelay(attempt, fullConfig);
            logger.warn(
                {
                    attempt: attempt + 1,
                    maxRetries: fullConfig.maxRetries + 1,
                    delayMs: delay,
                },
                'Retrying database operation'
            );
            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Add soft delete filter to where clause
 */
export function addSoftDeleteFilter<T extends Record<string, unknown>>(
    where: T,
    includeDeleted = false
): T & { isDeleted?: boolean } {
    if (includeDeleted) {
        return where;
    }
    return { ...where, isDeleted: false };
}

/**
 * Add audit fields to create data
 */
export function addCreateAuditFields<T extends Record<string, unknown>>(
    data: T,
    actorId?: string
): T & { createdById?: string; lastUpdatedById?: string } {
    const actor = actorId ?? currentAuditContext.actorId;
    return {
        ...data,
        createdById: actor,
        lastUpdatedById: actor,
    };
}

/**
 * Add audit fields to update data
 */
export function addUpdateAuditFields<T extends Record<string, unknown>>(
    data: T,
    actorId?: string
): T & { updatedAt: Date; lastUpdatedById?: string } {
    const actor = actorId ?? currentAuditContext.actorId;
    return {
        ...data,
        updatedAt: new Date(),
        lastUpdatedById: actor,
    };
}

// Placeholder middleware types for backward compatibility
// Prisma 5+ prefers extensions over middleware
export type MiddlewareParams = {
    model?: string;
    action: string;
    args: Record<string, unknown>;
    dataPath: string[];
    runInTransaction: boolean;
};

export type MiddlewareNext = (params: MiddlewareParams) => Promise<unknown>;

export type Middleware = (
    params: MiddlewareParams,
    next: MiddlewareNext
) => Promise<unknown>;

/**
 * Soft delete middleware (for reference - use extensions in Prisma 5+)
 */
export const softDeleteMiddleware: Middleware = async (params, next) => {
    if (params.model && SOFT_DELETE_MODELS.includes(params.model)) {
        if (params.action === 'delete') {
            params.action = 'update';
            params.args['data'] = { isDeleted: true, updatedAt: new Date() };
        }
        if (params.action === 'deleteMany') {
            params.action = 'updateMany';
            if (!params.args['data']) {
                params.args['data'] = {};
            }
            (params.args['data'] as Record<string, unknown>).isDeleted = true;
            (params.args['data'] as Record<string, unknown>).updatedAt = new Date();
        }
    }
    return next(params);
};

/**
 * Soft delete filter middleware (for reference - use extensions in Prisma 5+)
 */
export const softDeleteFilterMiddleware: Middleware = async (params, next) => {
    if (params.model && SOFT_DELETE_MODELS.includes(params.model)) {
        const readActions = ['findUnique', 'findFirst', 'findMany', 'count', 'aggregate', 'groupBy'];
        if (readActions.includes(params.action)) {
            if (!params.args['where']) {
                params.args['where'] = {};
            }
            const where = params.args['where'] as Record<string, unknown>;
            if (where.isDeleted === undefined) {
                where.isDeleted = false;
            }
        }
    }
    return next(params);
};

/**
 * Audit middleware (for reference - use extensions in Prisma 5+)
 */
export const auditMiddleware: Middleware = async (params, next) => {
    if (params.model && AUDIT_MODELS.includes(params.model)) {
        const context = getAuditContext();

        if (params.action === 'create') {
            if (!params.args['data']) {
                params.args['data'] = {};
            }
            const data = params.args['data'] as Record<string, unknown>;
            if (context.actorId && !data.createdById) {
                data.createdById = context.actorId;
            }
            if (context.actorId && !data.lastUpdatedById) {
                data.lastUpdatedById = context.actorId;
            }
        }

        if (params.action === 'update' || params.action === 'updateMany') {
            if (!params.args['data']) {
                params.args['data'] = {};
            }
            const data = params.args['data'] as Record<string, unknown>;
            if (context.actorId) {
                data.lastUpdatedById = context.actorId;
            }
        }
    }
    return next(params);
};

/**
 * Create retry middleware
 */
export function createRetryMiddleware(
    config: Partial<RetryConfig> = {}
): Middleware {
    const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

    return async (params, next) => {
        let lastError: unknown;

        for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
            try {
                return await next(params);
            } catch (error) {
                lastError = error;

                if (!isRetryableError(error) || attempt === fullConfig.maxRetries) {
                    throw error;
                }

                const delay = calculateDelay(attempt, fullConfig);
                logger.warn(
                    {
                        model: params.model,
                        action: params.action,
                        attempt: attempt + 1,
                        maxRetries: fullConfig.maxRetries + 1,
                        delayMs: delay,
                    },
                    'Retrying database operation'
                );
                await sleep(delay);
            }
        }

        throw lastError;
    };
}

/**
 * Create logging middleware
 */
export function createLoggingMiddleware(slowQueryThresholdMs = 1000): Middleware {
    return async (params, next) => {
        const start = Date.now();

        try {
            const result = await next(params);
            const duration = Date.now() - start;

            if (duration > slowQueryThresholdMs) {
                logger.warn(
                    {
                        model: params.model,
                        action: params.action,
                        durationMs: duration,
                    },
                    'Slow database query'
                );
            }

            return result;
        } catch (error) {
            const duration = Date.now() - start;
            logger.error(
                {
                    model: params.model,
                    action: params.action,
                    durationMs: duration,
                    error: error instanceof Error ? error.message : String(error),
                },
                'Database query failed'
            );
            throw error;
        }
    };
}

/**
 * Apply middleware to a client (placeholder for Prisma 4 compatibility)
 */
export function applyMiddleware(client: {
    $use?: (middleware: Middleware) => void;
}): void {
    if (client.$use) {
        client.$use(createLoggingMiddleware());
        client.$use(createRetryMiddleware());
        client.$use(auditMiddleware);
        client.$use(softDeleteMiddleware);
        client.$use(softDeleteFilterMiddleware);
    }
}

export default {
    softDeleteMiddleware,
    softDeleteFilterMiddleware,
    auditMiddleware,
    createRetryMiddleware,
    createLoggingMiddleware,
    applyMiddleware,
    setAuditContext,
    getAuditContext,
    clearAuditContext,
    withAuditContext,
    withRetry,
    addSoftDeleteFilter,
    addCreateAuditFields,
    addUpdateAuditFields,
};
