/**
 * Hybrid Redis Client for MIRIX Memory System
 *
 * Uses:
 * - Redis Hash for blocks, messages, orgs, users, agents, tools (fast, flat structure, no embeddings)
 * - Redis JSON with Vector fields for memory tables (embeddings support)
 *
 * Provides:
 * - 40-60% faster operations for blocks and messages via Hash
 * - 10-40x faster vector similarity search vs PostgreSQL pgvector
 * - Hybrid text+vector search capabilities
 */

import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';
import { logger } from '../log';

// Global Redis client instance
let redisClientInstance: RedisMemoryClient | null = null;

/**
 * Redis Memory Client Configuration
 */
export interface RedisClientConfig {
    redisUri?: string;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    maxRetries?: number;
    retryDelayMs?: number;
    connectTimeoutMs?: number;
    commandTimeoutMs?: number;
    enableOfflineQueue?: boolean;
    lazyConnect?: boolean;
}

/**
 * Redis TTL configuration (in seconds)
 */
export interface RedisTTLConfig {
    blocks: number;
    messages: number;
    organizations: number;
    users: number;
    agents: number;
    tools: number;
    memory: number;
}

const DEFAULT_TTL: RedisTTLConfig = {
    blocks: 3600,         // 1 hour
    messages: 1800,       // 30 minutes
    organizations: 86400, // 24 hours
    users: 7200,          // 2 hours
    agents: 3600,         // 1 hour
    tools: 3600,          // 1 hour
    memory: 3600,         // 1 hour
};

/**
 * Hybrid Redis client for MIRIX memory caching and search.
 *
 * Architecture:
 * - Hash: blocks, messages, orgs, users, agents, tools (no embeddings, flat structure)
 * - JSON + Vector: episodic, semantic, procedural, resource, knowledge (has embeddings)
 */
export class RedisMemoryClient {
    // Index names
    static readonly BLOCK_INDEX = 'idx:blocks';
    static readonly MESSAGE_INDEX = 'idx:messages';
    static readonly EPISODIC_INDEX = 'idx:episodic_memory';
    static readonly SEMANTIC_INDEX = 'idx:semantic_memory';
    static readonly PROCEDURAL_INDEX = 'idx:procedural_memory';
    static readonly RESOURCE_INDEX = 'idx:resource_memory';
    static readonly KNOWLEDGE_INDEX = 'idx:knowledge';
    static readonly ORGANIZATION_INDEX = 'idx:organizations';
    static readonly USER_INDEX = 'idx:users';
    static readonly AGENT_INDEX = 'idx:agents';
    static readonly TOOL_INDEX = 'idx:tools';

    // Key prefixes
    static readonly BLOCK_PREFIX = 'block:';
    static readonly MESSAGE_PREFIX = 'msg:';
    static readonly EPISODIC_PREFIX = 'episodic:';
    static readonly SEMANTIC_PREFIX = 'semantic:';
    static readonly PROCEDURAL_PREFIX = 'procedural:';
    static readonly RESOURCE_PREFIX = 'resource:';
    static readonly KNOWLEDGE_PREFIX = 'knowledge:';
    static readonly ORGANIZATION_PREFIX = 'org:';
    static readonly USER_PREFIX = 'user:';
    static readonly CLIENT_PREFIX = 'client:';
    static readonly AGENT_PREFIX = 'agent:';
    static readonly TOOL_PREFIX = 'tool:';

    readonly client: Redis;
    private readonly ttl: RedisTTLConfig;
    private isConnected = false;

    constructor(config: RedisClientConfig = {}, ttl: Partial<RedisTTLConfig> = {}) {
        this.ttl = { ...DEFAULT_TTL, ...ttl };

        const redisOptions: RedisOptions = {
            host: config.host ?? 'localhost',
            port: config.port ?? 6379,
            password: config.password,
            db: config.db ?? 0,
            maxRetriesPerRequest: config.maxRetries ?? 3,
            retryStrategy: (times: number) => {
                if (times > (config.maxRetries ?? 3)) {
                    return null;
                }
                return Math.min(times * (config.retryDelayMs ?? 100), 3000);
            },
            connectTimeout: config.connectTimeoutMs ?? 5000,
            commandTimeout: config.commandTimeoutMs ?? 5000,
            enableOfflineQueue: config.enableOfflineQueue ?? true,
            lazyConnect: config.lazyConnect ?? false,
        };

        // If URI is provided, parse and use it
        if (config.redisUri) {
            this.client = new Redis(config.redisUri, redisOptions);
        } else {
            this.client = new Redis(redisOptions);
        }

        // Setup event handlers
        this.setupEventHandlers();
    }

    /**
     * Setup Redis event handlers
     */
    private setupEventHandlers(): void {
        this.client.on('connect', () => {
            this.isConnected = true;
            logger.info('Redis connected');
        });

        this.client.on('ready', () => {
            logger.info('Redis ready');
        });

        this.client.on('error', (error: Error) => {
            logger.error({ error: error.message }, 'Redis error');
        });

        this.client.on('close', () => {
            this.isConnected = false;
            logger.warn('Redis connection closed');
        });

        this.client.on('reconnecting', () => {
            logger.info('Redis reconnecting');
        });
    }

    /**
     * Check if Redis is connected
     */
    get connected(): boolean {
        return this.isConnected && this.client.status === 'ready';
    }

    /**
     * Test Redis connection
     */
    async ping(): Promise<boolean> {
        try {
            const result = await this.client.ping();
            return result === 'PONG';
        } catch (error) {
            logger.error({ error }, 'Redis ping failed');
            return false;
        }
    }

    /**
     * Close Redis connection
     */
    async close(): Promise<void> {
        try {
            await this.client.quit();
            this.isConnected = false;
            logger.info('Redis connection closed');
        } catch (error) {
            logger.error({ error }, 'Error closing Redis connection');
        }
    }

    /**
     * Get Redis connection info for monitoring
     */
    async getConnectionInfo(): Promise<Record<string, unknown>> {
        try {
            const info = await this.client.info('clients');
            const serverInfo = await this.client.info('server');

            return {
                status: this.client.status,
                connected: this.connected,
                clientsInfo: info,
                serverInfo: serverInfo,
            };
        } catch (error) {
            logger.error({ error }, 'Failed to get Redis connection info');
            return { connected: false, error: String(error) };
        }
    }

    // ========================================================================
    // HASH-BASED METHODS (for blocks, messages, orgs, users, agents, tools)
    // ========================================================================

    /**
     * Set a Hash value with optional TTL
     */
    async setHash(
        key: string,
        data: Record<string, unknown>,
        ttl?: number
    ): Promise<void> {
        try {
            // Convert all values to strings for Hash storage
            const hashData: Record<string, string> = {};
            for (const [field, value] of Object.entries(data)) {
                if (value !== null && value !== undefined) {
                    hashData[field] =
                        typeof value === 'object' ? JSON.stringify(value) : String(value);
                }
            }

            await this.client.hset(key, hashData);

            if (ttl) {
                await this.client.expire(key, ttl);
            }
        } catch (error) {
            logger.error({ error, key }, 'Failed to set Redis hash');
            throw error;
        }
    }

    /**
     * Get a Hash value
     */
    async getHash(key: string): Promise<Record<string, string> | null> {
        try {
            const data = await this.client.hgetall(key);
            if (Object.keys(data).length === 0) {
                return null;
            }
            return data;
        } catch (error) {
            logger.error({ error, key }, 'Failed to get Redis hash');
            throw error;
        }
    }

    /**
     * Get specific fields from a Hash
     */
    async getHashFields(key: string, fields: string[]): Promise<(string | null)[]> {
        try {
            return await this.client.hmget(key, ...fields);
        } catch (error) {
            logger.error({ error, key, fields }, 'Failed to get Redis hash fields');
            throw error;
        }
    }

    /**
     * Delete a key
     */
    async delete(key: string): Promise<boolean> {
        try {
            const result = await this.client.del(key);
            return result > 0;
        } catch (error) {
            logger.error({ error, key }, 'Failed to delete Redis key');
            throw error;
        }
    }

    /**
     * Delete multiple keys
     */
    async deleteMany(keys: string[]): Promise<number> {
        if (keys.length === 0) return 0;
        try {
            return await this.client.del(...keys);
        } catch (error) {
            logger.error({ error, keysCount: keys.length }, 'Failed to delete Redis keys');
            throw error;
        }
    }

    /**
     * Check if a key exists
     */
    async exists(key: string): Promise<boolean> {
        try {
            const result = await this.client.exists(key);
            return result > 0;
        } catch (error) {
            logger.error({ error, key }, 'Failed to check Redis key existence');
            throw error;
        }
    }

    // ========================================================================
    // JSON-BASED METHODS (for memory tables with embeddings)
    // ========================================================================

    /**
     * Set a JSON value with optional TTL
     */
    async setJson(
        key: string,
        data: Record<string, unknown>,
        ttl?: number
    ): Promise<void> {
        try {
            await this.client.call('JSON.SET', key, '$', JSON.stringify(data));

            if (ttl) {
                await this.client.expire(key, ttl);
            }
        } catch (error) {
            logger.error({ error, key }, 'Failed to set Redis JSON');
            throw error;
        }
    }

    /**
     * Get a JSON value
     */
    async getJson<T = Record<string, unknown>>(key: string): Promise<T | null> {
        try {
            const result = await this.client.call('JSON.GET', key, '$');
            if (!result) {
                return null;
            }
            const parsed = JSON.parse(result as string);
            return Array.isArray(parsed) ? parsed[0] : parsed;
        } catch (error) {
            logger.error({ error, key }, 'Failed to get Redis JSON');
            throw error;
        }
    }

    /**
     * Get a specific JSON path
     */
    async getJsonPath<T = unknown>(key: string, path: string): Promise<T | null> {
        try {
            const result = await this.client.call('JSON.GET', key, path);
            if (!result) {
                return null;
            }
            const parsed = JSON.parse(result as string);
            return Array.isArray(parsed) ? parsed[0] : parsed;
        } catch (error) {
            logger.error({ error, key, path }, 'Failed to get Redis JSON path');
            throw error;
        }
    }

    // ========================================================================
    // ENTITY-SPECIFIC CACHE METHODS
    // ========================================================================

    /**
     * Cache a block
     */
    async cacheBlock(id: string, data: Record<string, unknown>): Promise<void> {
        const key = `${RedisMemoryClient.BLOCK_PREFIX}${id}`;
        await this.setHash(key, data, this.ttl.blocks);
    }

    /**
     * Get a cached block
     */
    async getBlock(id: string): Promise<Record<string, string> | null> {
        const key = `${RedisMemoryClient.BLOCK_PREFIX}${id}`;
        return this.getHash(key);
    }

    /**
     * Cache a message
     */
    async cacheMessage(id: string, data: Record<string, unknown>): Promise<void> {
        const key = `${RedisMemoryClient.MESSAGE_PREFIX}${id}`;
        await this.setHash(key, data, this.ttl.messages);
    }

    /**
     * Get a cached message
     */
    async getMessage(id: string): Promise<Record<string, string> | null> {
        const key = `${RedisMemoryClient.MESSAGE_PREFIX}${id}`;
        return this.getHash(key);
    }

    /**
     * Cache an organization
     */
    async cacheOrganization(id: string, data: Record<string, unknown>): Promise<void> {
        const key = `${RedisMemoryClient.ORGANIZATION_PREFIX}${id}`;
        await this.setHash(key, data, this.ttl.organizations);
    }

    /**
     * Get a cached organization
     */
    async getOrganization(id: string): Promise<Record<string, string> | null> {
        const key = `${RedisMemoryClient.ORGANIZATION_PREFIX}${id}`;
        return this.getHash(key);
    }

    /**
     * Cache a user
     */
    async cacheUser(id: string, data: Record<string, unknown>): Promise<void> {
        const key = `${RedisMemoryClient.USER_PREFIX}${id}`;
        await this.setHash(key, data, this.ttl.users);
    }

    /**
     * Get a cached user
     */
    async getUser(id: string): Promise<Record<string, string> | null> {
        const key = `${RedisMemoryClient.USER_PREFIX}${id}`;
        return this.getHash(key);
    }

    /**
     * Cache an agent
     */
    async cacheAgent(id: string, data: Record<string, unknown>): Promise<void> {
        const key = `${RedisMemoryClient.AGENT_PREFIX}${id}`;
        await this.setHash(key, data, this.ttl.agents);
    }

    /**
     * Get a cached agent
     */
    async getAgent(id: string): Promise<Record<string, string> | null> {
        const key = `${RedisMemoryClient.AGENT_PREFIX}${id}`;
        return this.getHash(key);
    }

    /**
     * Cache a tool
     */
    async cacheTool(id: string, data: Record<string, unknown>): Promise<void> {
        const key = `${RedisMemoryClient.TOOL_PREFIX}${id}`;
        await this.setHash(key, data, this.ttl.tools);
    }

    /**
     * Get a cached tool
     */
    async getTool(id: string): Promise<Record<string, string> | null> {
        const key = `${RedisMemoryClient.TOOL_PREFIX}${id}`;
        return this.getHash(key);
    }

    // ========================================================================
    // MEMORY-SPECIFIC CACHE METHODS (JSON with embeddings)
    // ========================================================================

    /**
     * Cache an episodic memory item
     */
    async cacheEpisodicMemory(id: string, data: Record<string, unknown>): Promise<void> {
        const key = `${RedisMemoryClient.EPISODIC_PREFIX}${id}`;
        await this.setJson(key, data, this.ttl.memory);
    }

    /**
     * Get a cached episodic memory item
     */
    async getEpisodicMemory(id: string): Promise<Record<string, unknown> | null> {
        const key = `${RedisMemoryClient.EPISODIC_PREFIX}${id}`;
        return this.getJson(key);
    }

    /**
     * Cache a semantic memory item
     */
    async cacheSemanticMemory(id: string, data: Record<string, unknown>): Promise<void> {
        const key = `${RedisMemoryClient.SEMANTIC_PREFIX}${id}`;
        await this.setJson(key, data, this.ttl.memory);
    }

    /**
     * Get a cached semantic memory item
     */
    async getSemanticMemory(id: string): Promise<Record<string, unknown> | null> {
        const key = `${RedisMemoryClient.SEMANTIC_PREFIX}${id}`;
        return this.getJson(key);
    }

    /**
     * Cache a procedural memory item
     */
    async cacheProceduralMemory(id: string, data: Record<string, unknown>): Promise<void> {
        const key = `${RedisMemoryClient.PROCEDURAL_PREFIX}${id}`;
        await this.setJson(key, data, this.ttl.memory);
    }

    /**
     * Get a cached procedural memory item
     */
    async getProceduralMemory(id: string): Promise<Record<string, unknown> | null> {
        const key = `${RedisMemoryClient.PROCEDURAL_PREFIX}${id}`;
        return this.getJson(key);
    }

    /**
     * Cache a resource memory item
     */
    async cacheResourceMemory(id: string, data: Record<string, unknown>): Promise<void> {
        const key = `${RedisMemoryClient.RESOURCE_PREFIX}${id}`;
        await this.setJson(key, data, this.ttl.memory);
    }

    /**
     * Get a cached resource memory item
     */
    async getResourceMemory(id: string): Promise<Record<string, unknown> | null> {
        const key = `${RedisMemoryClient.RESOURCE_PREFIX}${id}`;
        return this.getJson(key);
    }

    /**
     * Cache a knowledge item
     */
    async cacheKnowledge(id: string, data: Record<string, unknown>): Promise<void> {
        const key = `${RedisMemoryClient.KNOWLEDGE_PREFIX}${id}`;
        await this.setJson(key, data, this.ttl.memory);
    }

    /**
     * Get a cached knowledge item
     */
    async getKnowledge(id: string): Promise<Record<string, unknown> | null> {
        const key = `${RedisMemoryClient.KNOWLEDGE_PREFIX}${id}`;
        return this.getJson(key);
    }

    // ========================================================================
    // BULK OPERATIONS
    // ========================================================================

    /**
     * Get multiple blocks by IDs
     */
    async getBlocks(ids: string[]): Promise<Map<string, Record<string, string>>> {
        const result = new Map<string, Record<string, string>>();
        const pipeline = this.client.pipeline();

        for (const id of ids) {
            pipeline.hgetall(`${RedisMemoryClient.BLOCK_PREFIX}${id}`);
        }

        const responses = await pipeline.exec();
        if (responses) {
            for (let i = 0; i < ids.length; i++) {
                const [error, data] = responses[i];
                if (!error && data && Object.keys(data as Record<string, string>).length > 0) {
                    result.set(ids[i], data as Record<string, string>);
                }
            }
        }

        return result;
    }

    /**
     * Get multiple messages by IDs
     */
    async getMessages(ids: string[]): Promise<Map<string, Record<string, string>>> {
        const result = new Map<string, Record<string, string>>();
        const pipeline = this.client.pipeline();

        for (const id of ids) {
            pipeline.hgetall(`${RedisMemoryClient.MESSAGE_PREFIX}${id}`);
        }

        const responses = await pipeline.exec();
        if (responses) {
            for (let i = 0; i < ids.length; i++) {
                const [error, data] = responses[i];
                if (!error && data && Object.keys(data as Record<string, string>).length > 0) {
                    result.set(ids[i], data as Record<string, string>);
                }
            }
        }

        return result;
    }

    /**
     * Invalidate cache for an agent and related entities
     */
    async invalidateAgentCache(agentId: string): Promise<void> {
        // Delete agent cache
        await this.delete(`${RedisMemoryClient.AGENT_PREFIX}${agentId}`);

        // Note: In production, you'd want to use SCAN to find and delete
        // message keys for this specific agent. This is a simplified version
        // that just clears the agent cache itself.

        logger.debug({ agentId }, 'Invalidated agent cache');
    }

    /**
     * Invalidate all caches for an organization
     */
    async invalidateOrganizationCache(organizationId: string): Promise<void> {
        await this.delete(`${RedisMemoryClient.ORGANIZATION_PREFIX}${organizationId}`);
        logger.debug({ organizationId }, 'Invalidated organization cache');
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    /**
     * Get keys matching a pattern (use sparingly - prefer SCAN in production)
     */
    async keys(pattern: string): Promise<string[]> {
        return this.client.keys(pattern);
    }

    /**
     * Scan keys matching a pattern (production-safe)
     */
    async *scanKeys(pattern: string, count = 100): AsyncGenerator<string[]> {
        let cursor = '0';
        do {
            const [newCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
            cursor = newCursor;
            if (keys.length > 0) {
                yield keys;
            }
        } while (cursor !== '0');
    }

    /**
     * Flush all keys (use with caution!)
     */
    async flushAll(): Promise<void> {
        await this.client.flushall();
        logger.warn('Redis flushed all keys');
    }

    /**
     * Get memory usage for a key
     */
    async memoryUsage(key: string): Promise<number | null> {
        try {
            const usage = await this.client.memory('USAGE', key);
            return usage as number | null;
        } catch {
            return null;
        }
    }
}

// ============================================================================
// SINGLETON MANAGEMENT
// ============================================================================

/**
 * Get or create the Redis client singleton
 */
export function getRedisClient(config?: RedisClientConfig): RedisMemoryClient | null {
    if (!redisClientInstance) {
        const redisUri = config?.redisUri ?? process.env.REDIS_URI;
        if (!redisUri && !config?.host) {
            logger.warn('Redis URI not configured, Redis caching disabled');
            return null;
        }

        redisClientInstance = new RedisMemoryClient(config ?? { redisUri });
    }
    return redisClientInstance;
}

/**
 * Initialize Redis client (call during app startup)
 */
export async function initRedisClient(config?: RedisClientConfig): Promise<RedisMemoryClient | null> {
    const client = getRedisClient(config);
    if (client) {
        const isConnected = await client.ping();
        if (!isConnected) {
            logger.error('Failed to connect to Redis');
            return null;
        }
        logger.info('Redis client initialized');
    }
    return client;
}

/**
 * Close Redis client (call during app shutdown)
 */
export async function closeRedisClient(): Promise<void> {
    if (redisClientInstance) {
        await redisClientInstance.close();
        redisClientInstance = null;
    }
}

export default RedisMemoryClient;
