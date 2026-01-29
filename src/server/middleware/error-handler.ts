/**
 * Error Handler Middleware
 * Centralized error handling for the REST API
 */

import { Context } from 'hono';
import { logger } from '../../log.js';
import {
    MirixError,
    NotFoundError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
} from '../../errors.js';

// ============================================================================
// ERROR RESPONSE TYPE
// ============================================================================

export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
    requestId?: string;
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

/**
 * Global error handler middleware
 */
export function errorHandler(error: Error, c: Context): Response {
    const requestId = c.req.header('x-request-id') ?? crypto.randomUUID();

    // Log the error
    logger.error(
        {
            error: error.message,
            stack: error.stack,
            path: c.req.path,
            method: c.req.method,
            requestId,
        },
        'Request error'
    );

    // Build error response
    let statusCode = 500;
    let errorResponse: ErrorResponse = {
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An internal error occurred',
        },
        requestId,
    };

    if (error instanceof MirixError) {
        statusCode = error.statusCode;
        errorResponse = {
            error: {
                code: error.code,
                message: error.message,
            },
            requestId,
        };

        // Add validation errors if present
        if (error instanceof ValidationError) {
            errorResponse.error.details = { errors: error.errors };
        }
    } else if (error instanceof NotFoundError) {
        statusCode = 404;
        errorResponse = {
            error: {
                code: 'NOT_FOUND',
                message: error.message,
            },
            requestId,
        };
    } else if (error instanceof AuthenticationError) {
        statusCode = 401;
        errorResponse = {
            error: {
                code: 'AUTHENTICATION_ERROR',
                message: error.message,
            },
            requestId,
        };
    } else if (error instanceof AuthorizationError) {
        statusCode = 403;
        errorResponse = {
            error: {
                code: 'AUTHORIZATION_ERROR',
                message: error.message,
            },
            requestId,
        };
    }

    return c.json(errorResponse, statusCode as 400 | 401 | 403 | 404 | 500);
}

/**
 * Not found handler
 */
export function notFoundHandler(c: Context): Response {
    const requestId = c.req.header('x-request-id') ?? crypto.randomUUID();

    return c.json(
        {
            error: {
                code: 'NOT_FOUND',
                message: `Path ${c.req.path} not found`,
            },
            requestId,
        },
        404
    );
}

export default errorHandler;
