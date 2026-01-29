/**
 * Health Check Routes
 * Endpoints for monitoring service health
 */

import { Hono } from 'hono';
import { prismaRaw } from '../../database/prisma-client.js';
import { logger } from '../../log.js';

export const healthRoutes = new Hono();

// ============================================================================
// HEALTH ENDPOINTS
// ============================================================================

/**
 * Basic health check
 */
healthRoutes.get('/health', (c) => {
    return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version ?? '0.1.0',
    });
});

/**
 * Detailed health check with dependency status
 */
healthRoutes.get('/health/detailed', async (c) => {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
    const startTime = Date.now();

    // Check database
    try {
        const dbStart = Date.now();
        await prismaRaw.$queryRaw`SELECT 1`;
        checks.database = {
            status: 'healthy',
            latency: Date.now() - dbStart,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        checks.database = {
            status: 'unhealthy',
            error: errorMessage,
        };
        logger.error({ error: errorMessage }, 'Database health check failed');
    }

    // Check Redis (if configured)
    // TODO: Add Redis health check

    const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');

    return c.json(
        {
            status: allHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version ?? '0.1.0',
            uptime: process.uptime(),
            checks,
            totalLatency: Date.now() - startTime,
        },
        allHealthy ? 200 : 503
    );
});

/**
 * Readiness check (for k8s)
 */
healthRoutes.get('/ready', async (c) => {
    try {
        await prismaRaw.$queryRaw`SELECT 1`;
        return c.json({ ready: true });
    } catch {
        return c.json({ ready: false }, 503);
    }
});

/**
 * Liveness check (for k8s)
 */
healthRoutes.get('/live', (c) => {
    return c.json({ alive: true });
});

export default healthRoutes;
