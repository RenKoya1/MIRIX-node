/**
 * Authentication Middleware
 * Handles API key authentication and context extraction
 */

import { Context, Next } from 'hono';
import { createHash } from 'crypto';
import { prismaRaw } from '../../database/prisma-client.js';
import { AuthenticationError, AuthorizationError } from '../../errors.js';
import { logger } from '../../log.js';

// ============================================================================
// AUTH CONTEXT TYPES
// ============================================================================

export interface AuthContext {
    clientId: string;
    organizationId: string;
    userId?: string;
    apiKeyId: string;
    permissions: string;
}

declare module 'hono' {
    interface ContextVariableMap {
        auth: AuthContext;
    }
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Authenticate requests using API key
 */
export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
    const authHeader = c.req.header('authorization');

    if (!authHeader) {
        throw new AuthenticationError('Missing authorization header');
    }

    // Extract bearer token
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        throw new AuthenticationError('Invalid authorization header format');
    }

    const apiKey = match[1];

    try {
        // Hash the API key for lookup
        const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

        // Find the API key
        const clientApiKey = await prismaRaw.clientApiKey.findFirst({
            where: {
                apiKeyHash,
                status: 'active',
                isDeleted: false,
            },
            include: {
                client: {
                    select: {
                        id: true,
                        organizationId: true,
                        status: true,
                    },
                },
            },
        });

        if (!clientApiKey) {
            throw new AuthenticationError('Invalid API key');
        }

        if (!clientApiKey.client) {
            throw new AuthenticationError('Client not found');
        }

        if (clientApiKey.client.status !== 'active') {
            throw new AuthorizationError('Client is not active');
        }

        // Set auth context
        const authContext: AuthContext = {
            clientId: clientApiKey.clientId,
            organizationId: clientApiKey.client.organizationId ?? '',
            userId: clientApiKey.userId ?? undefined,
            apiKeyId: clientApiKey.id,
            permissions: clientApiKey.permission,
        };

        c.set('auth', authContext);

        logger.debug(
            { clientId: authContext.clientId, apiKeyId: authContext.apiKeyId },
            'Request authenticated'
        );

        await next();
    } catch (error) {
        if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
            throw error;
        }

        logger.error({ error }, 'Authentication error');
        throw new AuthenticationError('Authentication failed');
    }
}

/**
 * Optional authentication - sets context if valid, continues if not
 */
export async function optionalAuthMiddleware(c: Context, next: Next): Promise<Response | void> {
    const authHeader = c.req.header('authorization');

    if (!authHeader) {
        await next();
        return;
    }

    try {
        await authMiddleware(c, next);
    } catch {
        // Continue without auth
        await next();
    }
}

/**
 * Check for specific permission
 */
export function requirePermission(permission: 'all' | 'restricted' | 'read_only') {
    return async (c: Context, next: Next): Promise<Response | void> => {
        const auth = c.get('auth');

        if (!auth) {
            throw new AuthenticationError('Authentication required');
        }

        const permissionLevels = ['read_only', 'restricted', 'all'];
        const requiredLevel = permissionLevels.indexOf(permission);
        const currentLevel = permissionLevels.indexOf(auth.permissions);

        if (currentLevel < requiredLevel) {
            throw new AuthorizationError(`Insufficient permissions. Required: ${permission}`);
        }

        await next();
    };
}

export default authMiddleware;
