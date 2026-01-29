/**
 * Hono Application Setup
 * Main REST API server for MIRIX
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { prettyJSON } from 'hono/pretty-json';
import { timing } from 'hono/timing';
import { logger as honoLogger } from 'hono/logger';

import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { logger } from '../log.js';

// Routes
import { healthRoutes } from './routes/health.js';
import { agentRoutes } from './routes/agents.js';
import { messageRoutes } from './routes/messages.js';

// ============================================================================
// APP SETUP
// ============================================================================

export function createApp(): Hono {
    const app = new Hono();

    // ========================================================================
    // MIDDLEWARE
    // ========================================================================

    // Request ID
    app.use('*', requestId());

    // Timing header
    app.use('*', timing());

    // CORS
    app.use(
        '*',
        cors({
            origin: '*',
            allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
            exposeHeaders: ['X-Request-ID', 'X-Response-Time'],
            maxAge: 86400,
        })
    );

    // Pretty JSON in development
    if (process.env.NODE_ENV !== 'production') {
        app.use('*', prettyJSON());
        app.use('*', honoLogger());
    }

    // ========================================================================
    // ROUTES
    // ========================================================================

    // Health check
    app.route('/', healthRoutes);

    // API v1
    app.route('/v1/agents', agentRoutes);
    app.route('/v1/messages', messageRoutes);

    // ========================================================================
    // ERROR HANDLING
    // ========================================================================

    app.onError(errorHandler);
    app.notFound(notFoundHandler);

    logger.info('MIRIX API server initialized');

    return app;
}

// ============================================================================
// SERVER START
// ============================================================================

export async function startServer(port: number = 3000): Promise<void> {
    const app = createApp();

    logger.info({ port }, 'Starting MIRIX API server');

    // Note: For Node.js, use @hono/node-server
    // For Bun, use Bun.serve directly
    // This is a placeholder for the actual server start
    const { serve } = await import('@hono/node-server');

    serve({
        fetch: app.fetch,
        port,
    });

    logger.info({ port }, 'MIRIX API server started');
}

export default createApp;
