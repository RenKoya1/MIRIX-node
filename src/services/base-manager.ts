/**
 * Base Manager Class
 * Abstract base class providing common CRUD operations, Redis caching,
 * and access control patterns for all service managers.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { prismaRaw } from '../database/prisma-client.js';
import { getRedisClient, RedisMemoryClient } from '../database/redis-client.js';
import { logger } from '../log.js';
import {
    NotFoundError,
    ValidationError,
} from '../errors.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Access type for filtering records
 */
export enum AccessType {
    ORGANIZATION = 'organization',
    USER = 'user',
    CLIENT = 'client',
}

/**
 * Access permission levels
 */
export type AccessPermission = 'read' | 'write' | 'admin';

/**
 * Actor context for operations (client performing the action)
 */
export interface ActorContext {
    id: string;
    organizationId: string;
    userId?: string;
    permissions?: AccessPermission[];
}

/**
 * Pagination options
 */
export interface PaginationOptions {
    cursor?: string;
    limit?: number;
    offset?: number;
}

/**
 * Sort options
 */
export interface SortOptions {
    field: string;
    order: 'asc' | 'desc';
}

/**
 * List options combining pagination and sorting
 */
export interface ListOptions extends PaginationOptions {
    sort?: SortOptions;
    startDate?: Date;
    endDate?: Date;
    includeDeleted?: boolean;
}

/**
 * List result with pagination info
 */
export interface ListResult<T> {
    items: T[];
    total: number;
    hasMore: boolean;
    nextCursor?: string;
}

/**
 * Cache configuration for a manager
 */
export interface CacheConfig {
    enabled: boolean;
    prefix: string;
    ttl: number;
    useHash: boolean; // true for Hash, false for JSON
}

// ============================================================================
// BASE MANAGER
// ============================================================================

/**
 * Abstract base class for all service managers
 * Provides common CRUD operations with caching and access control
 */
export abstract class BaseManager<TModel, TCreateInput, TUpdateInput> {
    protected readonly prisma: PrismaClient;
    protected readonly redis: RedisMemoryClient | null;
    protected readonly logger = logger;

    /**
     * The model name for logging and error messages
     */
    protected abstract readonly modelName: string;

    /**
     * Cache configuration
     */
    protected abstract readonly cacheConfig: CacheConfig;

    /**
     * Get the Prisma delegate for this model
     */
    protected abstract getDelegate(): {
        findUnique: (args: { where: { id: string } }) => Promise<TModel | null>;
        findFirst: (args: Record<string, unknown>) => Promise<TModel | null>;
        findMany: (args: Record<string, unknown>) => Promise<TModel[]>;
        create: (args: { data: unknown }) => Promise<TModel>;
        update: (args: { where: { id: string }; data: unknown }) => Promise<TModel>;
        delete: (args: { where: { id: string } }) => Promise<TModel>;
        count: (args: Record<string, unknown>) => Promise<number>;
    };

    constructor() {
        this.prisma = prismaRaw;
        this.redis = getRedisClient();
    }

    // ========================================================================
    // CRUD OPERATIONS
    // ========================================================================

    /**
     * Create a new record
     */
    async create(
        data: TCreateInput,
        actor?: ActorContext
    ): Promise<TModel> {
        this.logger.debug({ data, actor: actor?.id }, `Creating ${this.modelName}`);

        const createData = this.prepareCreateData(data, actor);

        try {
            const result = await this.getDelegate().create({ data: createData });

            // Update cache if enabled
            if (this.cacheConfig.enabled && result) {
                await this.updateCache(this.getRecordId(result), result, 'create');
            }

            this.logger.info(
                { id: this.getRecordId(result), actor: actor?.id },
                `Created ${this.modelName}`
            );

            return result;
        } catch (error) {
            this.handleDatabaseError(error, 'create');
            throw error;
        }
    }

    /**
     * Read a single record by ID
     */
    async read(
        id: string,
        actor?: ActorContext,
        options?: { includeDeleted?: boolean }
    ): Promise<TModel> {
        this.logger.debug({ id, actor: actor?.id }, `Reading ${this.modelName}`);

        // Try cache first
        if (this.cacheConfig.enabled) {
            const cached = await this.getFromCache(id);
            if (cached) {
                this.logger.debug({ id }, `Cache hit for ${this.modelName}`);
                return cached;
            }
        }

        const whereClause = this.buildWhereClause(id, actor, options?.includeDeleted);

        const result = await this.getDelegate().findFirst({
            where: whereClause,
        });

        if (!result) {
            throw new NotFoundError(this.modelName, id);
        }

        // Update cache
        if (this.cacheConfig.enabled) {
            await this.updateCache(id, result, 'read');
        }

        return result;
    }

    /**
     * Update a record
     */
    async update(
        id: string,
        data: TUpdateInput,
        actor?: ActorContext
    ): Promise<TModel> {
        this.logger.debug({ id, data, actor: actor?.id }, `Updating ${this.modelName}`);

        // First, ensure the record exists and actor has access
        await this.read(id, actor);

        const updateData = this.prepareUpdateData(data, actor);

        try {
            const result = await this.getDelegate().update({
                where: { id },
                data: updateData,
            });

            // Update cache
            if (this.cacheConfig.enabled) {
                await this.updateCache(id, result, 'update');
            }

            this.logger.info({ id, actor: actor?.id }, `Updated ${this.modelName}`);

            return result;
        } catch (error) {
            this.handleDatabaseError(error, 'update', id);
            throw error;
        }
    }

    /**
     * Soft delete a record (set isDeleted = true)
     */
    async delete(
        id: string,
        actor?: ActorContext
    ): Promise<TModel> {
        this.logger.debug({ id, actor: actor?.id }, `Deleting ${this.modelName}`);

        // First, ensure the record exists and actor has access
        await this.read(id, actor);

        try {
            const result = await this.getDelegate().update({
                where: { id },
                data: {
                    isDeleted: true,
                    updatedAt: new Date(),
                    lastUpdatedById: actor?.id,
                },
            });

            // Remove from cache
            if (this.cacheConfig.enabled) {
                await this.removeFromCache(id);
            }

            this.logger.info({ id, actor: actor?.id }, `Deleted ${this.modelName}`);

            return result;
        } catch (error) {
            this.handleDatabaseError(error, 'delete', id);
            throw error;
        }
    }

    /**
     * Hard delete a record (permanently remove)
     */
    async hardDelete(
        id: string,
        actor?: ActorContext
    ): Promise<void> {
        this.logger.debug({ id, actor: actor?.id }, `Hard deleting ${this.modelName}`);

        // First, ensure the record exists and actor has access
        await this.read(id, actor, { includeDeleted: true });

        try {
            await this.getDelegate().delete({
                where: { id },
            });

            // Remove from cache
            if (this.cacheConfig.enabled) {
                await this.removeFromCache(id);
            }

            this.logger.info({ id, actor: actor?.id }, `Hard deleted ${this.modelName}`);
        } catch (error) {
            this.handleDatabaseError(error, 'hardDelete', id);
            throw error;
        }
    }

    /**
     * List records with pagination and filtering
     */
    async list(
        actor?: ActorContext,
        options: ListOptions = {}
    ): Promise<ListResult<TModel>> {
        this.logger.debug({ actor: actor?.id, options }, `Listing ${this.modelName}`);

        const {
            cursor,
            limit = 50,
            sort = { field: 'createdAt', order: 'desc' },
            startDate,
            endDate,
            includeDeleted = false,
        } = options;

        // Build where clause
        const where = this.buildListWhereClause(actor, {
            includeDeleted,
            startDate,
            endDate,
        });

        // Build cursor pagination
        let cursorClause = undefined;
        if (cursor) {
            cursorClause = { id: cursor };
        }

        // Execute query
        const [items, total] = await Promise.all([
            this.getDelegate().findMany({
                where,
                orderBy: { [sort.field]: sort.order },
                take: limit + 1, // Take one extra to check for more
                skip: cursor ? 1 : 0, // Skip cursor item
                cursor: cursorClause,
            }),
            this.getDelegate().count({ where }),
        ]);

        const hasMore = items.length > limit;
        if (hasMore) {
            items.pop(); // Remove the extra item
        }

        const nextCursor = hasMore && items.length > 0
            ? this.getRecordId(items[items.length - 1])
            : undefined;

        return {
            items,
            total,
            hasMore,
            nextCursor,
        };
    }

    /**
     * Count records matching criteria
     */
    async count(
        actor?: ActorContext,
        options: { includeDeleted?: boolean } = {}
    ): Promise<number> {
        const where = this.buildListWhereClause(actor, options);
        return this.getDelegate().count({ where });
    }

    // ========================================================================
    // CACHE OPERATIONS
    // ========================================================================

    /**
     * Get a record from cache
     */
    protected async getFromCache(id: string): Promise<TModel | null> {
        if (!this.redis || !this.cacheConfig.enabled) {
            return null;
        }

        const key = `${this.cacheConfig.prefix}${id}`;

        try {
            if (this.cacheConfig.useHash) {
                const data = await this.redis.getHash(key);
                return data ? this.deserializeCacheData(data) : null;
            } else {
                return await this.redis.getJson<TModel>(key);
            }
        } catch (error) {
            this.logger.warn({ error, id }, `Cache get failed for ${this.modelName}`);
            return null;
        }
    }

    /**
     * Update cache with a record
     */
    protected async updateCache(
        id: string,
        data: TModel,
        _operation: 'create' | 'read' | 'update'
    ): Promise<void> {
        if (!this.redis || !this.cacheConfig.enabled) {
            return;
        }

        const key = `${this.cacheConfig.prefix}${id}`;
        const serialized = this.serializeCacheData(data);

        try {
            if (this.cacheConfig.useHash) {
                await this.redis.setHash(key, serialized, this.cacheConfig.ttl);
            } else {
                await this.redis.setJson(key, serialized, this.cacheConfig.ttl);
            }
            this.logger.debug({ id }, `Cache updated for ${this.modelName}`);
        } catch (error) {
            this.logger.warn({ error, id }, `Cache update failed for ${this.modelName}`);
        }
    }

    /**
     * Remove a record from cache
     */
    protected async removeFromCache(id: string): Promise<void> {
        if (!this.redis || !this.cacheConfig.enabled) {
            return;
        }

        const key = `${this.cacheConfig.prefix}${id}`;

        try {
            await this.redis.delete(key);
            this.logger.debug({ id }, `Cache removed for ${this.modelName}`);
        } catch (error) {
            this.logger.warn({ error, id }, `Cache remove failed for ${this.modelName}`);
        }
    }

    // ========================================================================
    // HELPER METHODS (can be overridden by subclasses)
    // ========================================================================

    /**
     * Get the ID field from a record
     */
    protected getRecordId(record: TModel): string {
        return (record as { id: string }).id;
    }

    /**
     * Prepare data for create operation
     */
    protected prepareCreateData(data: TCreateInput, actor?: ActorContext): unknown {
        const prepared: Record<string, unknown> = { ...data } as Record<string, unknown>;

        if (actor) {
            prepared.createdById = actor.id;
            prepared.lastUpdatedById = actor.id;
            if ('organizationId' in prepared === false) {
                prepared.organizationId = actor.organizationId;
            }
        }

        return prepared;
    }

    /**
     * Prepare data for update operation
     */
    protected prepareUpdateData(data: TUpdateInput, actor?: ActorContext): unknown {
        const prepared: Record<string, unknown> = { ...data } as Record<string, unknown>;

        if (actor) {
            prepared.lastUpdatedById = actor.id;
        }
        prepared.updatedAt = new Date();

        return prepared;
    }

    /**
     * Build where clause for single record queries
     */
    protected buildWhereClause(
        id: string,
        actor?: ActorContext,
        includeDeleted = false
    ): Record<string, unknown> {
        const where: Record<string, unknown> = { id };

        if (!includeDeleted) {
            where.isDeleted = false;
        }

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        return where;
    }

    /**
     * Build where clause for list queries
     */
    protected buildListWhereClause(
        actor?: ActorContext,
        options: { includeDeleted?: boolean; startDate?: Date; endDate?: Date } = {}
    ): Record<string, unknown> {
        const where: Record<string, unknown> = {};

        if (!options.includeDeleted) {
            where.isDeleted = false;
        }

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        if (options.startDate || options.endDate) {
            where.createdAt = {};
            if (options.startDate) {
                (where.createdAt as Record<string, Date>).gte = options.startDate;
            }
            if (options.endDate) {
                (where.createdAt as Record<string, Date>).lte = options.endDate;
            }
        }

        return where;
    }

    /**
     * Serialize data for cache storage
     */
    protected serializeCacheData(data: TModel): Record<string, unknown> {
        // Default implementation - subclasses can override for custom serialization
        const serialized: Record<string, unknown> = {};
        const record = data as Record<string, unknown>;

        for (const [key, value] of Object.entries(record)) {
            if (value === null || value === undefined) {
                continue;
            }
            if (value instanceof Date) {
                serialized[key] = value.toISOString();
            } else if (typeof value === 'object') {
                serialized[key] = JSON.stringify(value);
            } else {
                serialized[key] = value;
            }
        }

        return serialized;
    }

    /**
     * Deserialize data from cache
     */
    protected deserializeCacheData(data: Record<string, string>): TModel {
        // Default implementation - subclasses can override for custom deserialization
        const deserialized: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(data)) {
            // Try to parse as JSON
            try {
                deserialized[key] = JSON.parse(value);
            } catch {
                // If not JSON, check for date patterns
                if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
                    deserialized[key] = new Date(value);
                } else if (value === 'true') {
                    deserialized[key] = true;
                } else if (value === 'false') {
                    deserialized[key] = false;
                } else if (/^\d+$/.test(value)) {
                    deserialized[key] = parseInt(value, 10);
                } else if (/^\d+\.\d+$/.test(value)) {
                    deserialized[key] = parseFloat(value);
                } else {
                    deserialized[key] = value;
                }
            }
        }

        return deserialized as TModel;
    }

    /**
     * Handle database errors and throw appropriate custom errors
     */
    protected handleDatabaseError(
        error: unknown,
        operation: string,
        id?: string
    ): never {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            switch (error.code) {
                case 'P2002': // Unique constraint violation
                    throw new ValidationError(
                        `A ${this.modelName} with this value already exists`,
                        { field: (error.meta?.target as string[])?.join(', ') }
                    );
                case 'P2003': // Foreign key constraint violation
                    throw new ValidationError(
                        `Invalid reference in ${this.modelName}`,
                        { field: String(error.meta?.field_name) }
                    );
                case 'P2025': // Record not found
                    throw new NotFoundError(this.modelName, id);
                default:
                    this.logger.error(
                        { error, code: error.code, operation, id },
                        `Database error in ${this.modelName}`
                    );
            }
        }

        this.logger.error(
            { error, operation, id },
            `Unexpected error in ${this.modelName}`
        );
        throw error;
    }
}

export default BaseManager;
