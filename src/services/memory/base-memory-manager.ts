/**
 * Base Memory Manager
 * Abstract base class for all memory type managers
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { prismaRaw } from '../../database/prisma-client.js';
import { logger } from '../../log.js';
import { NotFoundError, ValidationError } from '../../errors.js';
import { ActorContext, ListResult } from '../base-manager.js';

// ============================================================================
// TYPES
// ============================================================================

export interface MemoryListOptions {
    cursor?: string;
    limit?: number;
    sort?: { field: string; order: 'asc' | 'desc' };
    startDate?: Date;
    endDate?: Date;
    includeDeleted?: boolean;
    agentId?: string;
}

export interface CacheConfig {
    enabled: boolean;
    prefix: string;
    ttl: number;
}

// ============================================================================
// BASE MEMORY MANAGER
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

export abstract class BaseMemoryManager<TModel, TCreateInput, TUpdateInput> {
    protected readonly prisma: PrismaClient;
    protected readonly logger = logger;

    protected abstract readonly modelName: string;
    protected abstract readonly cacheConfig: CacheConfig;

    protected abstract getDelegate(): AnyDelegate;

    constructor() {
        this.prisma = prismaRaw;
    }

    async create(
        data: TCreateInput,
        actor?: ActorContext
    ): Promise<TModel> {
        this.logger.debug({ data, actor: actor?.id }, `Creating ${this.modelName}`);

        const createData = this.prepareCreateData(data, actor);

        try {
            const result = await this.getDelegate().create({ data: createData });

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

    async read(
        id: string,
        actor?: ActorContext,
        options?: { includeDeleted?: boolean }
    ): Promise<TModel> {
        this.logger.debug({ id, actor: actor?.id }, `Reading ${this.modelName}`);

        const whereClause = this.buildWhereClause(id, actor, options?.includeDeleted);

        const result = await this.getDelegate().findFirst({
            where: whereClause,
        });

        if (!result) {
            throw new NotFoundError(this.modelName, id);
        }

        return result;
    }

    async update(
        id: string,
        data: TUpdateInput,
        actor?: ActorContext
    ): Promise<TModel> {
        this.logger.debug({ id, data, actor: actor?.id }, `Updating ${this.modelName}`);

        await this.read(id, actor);

        const updateData = this.prepareUpdateData(data, actor);

        try {
            const result = await this.getDelegate().update({
                where: { id },
                data: updateData,
            });

            this.logger.info({ id, actor: actor?.id }, `Updated ${this.modelName}`);

            return result;
        } catch (error) {
            this.handleDatabaseError(error, 'update', id);
            throw error;
        }
    }

    async delete(
        id: string,
        actor?: ActorContext
    ): Promise<TModel> {
        this.logger.debug({ id, actor: actor?.id }, `Deleting ${this.modelName}`);

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

            this.logger.info({ id, actor: actor?.id }, `Deleted ${this.modelName}`);

            return result;
        } catch (error) {
            this.handleDatabaseError(error, 'delete', id);
            throw error;
        }
    }

    async list(
        actor?: ActorContext,
        options: MemoryListOptions = {}
    ): Promise<ListResult<TModel>> {
        this.logger.debug({ actor: actor?.id, options }, `Listing ${this.modelName}`);

        const {
            cursor,
            limit = 50,
            sort = { field: 'createdAt', order: 'desc' },
            startDate,
            endDate,
            includeDeleted = false,
            agentId,
        } = options;

        const where = this.buildListWhereClause(actor, {
            includeDeleted,
            startDate,
            endDate,
            agentId,
        });

        let cursorClause = undefined;
        if (cursor) {
            cursorClause = { id: cursor };
        }

        const [items, total] = await Promise.all([
            this.getDelegate().findMany({
                where,
                orderBy: { [sort.field]: sort.order },
                take: limit + 1,
                skip: cursor ? 1 : 0,
                cursor: cursorClause,
            }),
            this.getDelegate().count({ where }),
        ]);

        const hasMore = items.length > limit;
        if (hasMore) items.pop();

        const nextCursor = hasMore && items.length > 0
            ? this.getRecordId(items[items.length - 1])
            : undefined;

        return { items, total, hasMore, nextCursor };
    }

    protected abstract prepareCreateData(data: TCreateInput, actor?: ActorContext): unknown;
    protected abstract prepareUpdateData(data: TUpdateInput, actor?: ActorContext): unknown;

    protected getRecordId(record: TModel): string {
        return (record as { id: string }).id;
    }

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

    protected buildListWhereClause(
        actor?: ActorContext,
        options: {
            includeDeleted?: boolean;
            startDate?: Date;
            endDate?: Date;
            agentId?: string;
        } = {}
    ): Record<string, unknown> {
        const where: Record<string, unknown> = {};

        if (!options.includeDeleted) {
            where.isDeleted = false;
        }

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        if (options.agentId) {
            where.agentId = options.agentId;
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

    protected handleDatabaseError(
        error: unknown,
        operation: string,
        id?: string
    ): never {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            switch (error.code) {
                case 'P2002':
                    throw new ValidationError(
                        `A ${this.modelName} with this value already exists`,
                        { field: (error.meta?.target as string[])?.join(', ') }
                    );
                case 'P2025':
                    throw new NotFoundError(this.modelName, id);
            }
        }

        this.logger.error(
            { error, operation, id },
            `Unexpected error in ${this.modelName}`
        );
        throw error;
    }
}

export default BaseMemoryManager;
