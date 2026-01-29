/**
 * Server Module
 * Central exports for the REST API server
 */

export { createApp, startServer } from './app';
export { healthRoutes, agentRoutes, messageRoutes } from './routes/index';
export { authMiddleware, optionalAuthMiddleware, requirePermission } from './middleware/auth';
export { errorHandler, notFoundHandler } from './middleware/error-handler';
export type { AuthContext } from './middleware/auth';
export type { ErrorResponse } from './middleware/error-handler';
