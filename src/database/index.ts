/**
 * Database Module
 * Exports Prisma client and database utilities
 */

export {
    prisma,
    prismaRaw,
    connectDatabase,
    disconnectDatabase,
    withTransaction,
    healthCheck,
    getDatabaseStats,
    type ExtendedPrismaClient,
} from './prisma-client.js';

export {
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
    type AuditContext,
} from './middleware.js';

export {
    RedisMemoryClient,
    getRedisClient,
    initRedisClient,
    closeRedisClient,
    type RedisClientConfig,
    type RedisTTLConfig,
} from './redis-client.js';

export {
    createIndex,
    dropIndex,
    createAllIndexes,
    dropAllIndexes,
    textSearch,
    vectorSearch,
    hybridSearch,
    ALL_INDEXES,
    type IndexDefinition,
    type SearchOptions,
    type VectorSearchOptions,
    type SearchResult,
} from './redis-search.js';
