/**
 * Mirix TypeScript - Main Entry Point
 *
 * Multi-Agent Personal Assistant with an Advanced Memory System
 */
// Schemas
export * from './schemas/index.js';
// Logging
export * from './log.js';
// Errors
export * from './errors.js';
// LLM API (Vercel AI SDK)
export * from './llm_api/index.js';
// Version
export const VERSION = '0.1.0';
// Log startup
import { getLogger } from './log.js';
const logger = getLogger('mirix');
logger.info({ version: VERSION }, 'Mirix TypeScript initialized');
//# sourceMappingURL=index.js.map