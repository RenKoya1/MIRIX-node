/**
 * Server Module
 * Central exports for the REST API server
 */

export { createApp, startServer } from './app.js';
export { healthRoutes, agentRoutes, messageRoutes } from './routes/index.js';
export { authMiddleware, optionalAuthMiddleware, requirePermission } from './middleware/auth.js';
export { errorHandler, notFoundHandler } from './middleware/error-handler.js';
export type { AuthContext } from './middleware/auth.js';
export type { ErrorResponse } from './middleware/error-handler.js';
