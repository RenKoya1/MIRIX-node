/**
 * Procedural Memory Manager
 * Manages procedural memory items - how to do things, skills, and procedures
 */

import { ProceduralMemoryItem, Prisma } from '@prisma/client';
import { BaseMemoryManager, CacheConfig, MemoryListOptions } from './base-memory-manager.js';
import { RedisMemoryClient } from '../../database/redis-client.js';
import { ActorContext, ListResult } from '../base-manager.js';
import { ValidationError } from '../../errors.js';

// ============================================================================
// TYPES
// ============================================================================

export interface LastModify {
    timestamp: string;
    operation: 'created' | 'updated' | 'deleted';
}

export interface CreateProceduralMemoryInput {
    id: string;
    organizationId: string;
    userId: string;
    agentId?: string;
    entryType: string;
    summary: string;
    steps: unknown;
    filterTags?: unknown;
    embeddingConfig?: unknown;
    clientId?: string;
}

export interface UpdateProceduralMemoryInput {
    entryType?: string;
    summary?: string;
    steps?: unknown;
    filterTags?: unknown;
    embeddingConfig?: unknown;
}

// ============================================================================
// PROCEDURAL MEMORY MANAGER
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

class ProceduralMemoryManager extends BaseMemoryManager<
    ProceduralMemoryItem,
    CreateProceduralMemoryInput,
    UpdateProceduralMemoryInput
> {
    protected readonly modelName = 'ProceduralMemoryItem';

    protected readonly cacheConfig: CacheConfig = {
        enabled: true,
        prefix: RedisMemoryClient.PROCEDURAL_PREFIX,
        ttl: 7200, // 2 hours
    };

    protected getDelegate(): AnyDelegate {
        return this.prisma.proceduralMemoryItem;
    }

    /**
     * Create a new procedural memory item
     */
    async create(
        data: CreateProceduralMemoryInput,
        actor?: ActorContext
    ): Promise<ProceduralMemoryItem> {
        // Validate user exists
        const user = await this.prisma.user.findUnique({
            where: { id: data.userId },
        });
        if (!user) {
            throw new ValidationError('User not found', { field: 'userId' });
        }

        return super.create(data, actor);
    }

    /**
     * Get procedures by entry type
     */
    async getByEntryType(
        agentId: string,
        entryType: string,
        limit: number = 50,
        actor?: ActorContext
    ): Promise<ProceduralMemoryItem[]> {
        const where: Prisma.ProceduralMemoryItemWhereInput = {
            agentId,
            entryType,
            isDeleted: false,
        };

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        return this.getDelegate().findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Search by summary pattern
     */
    async searchBySummary(
        agentId: string,
        pattern: string,
        limit: number = 50,
        actor?: ActorContext
    ): Promise<ProceduralMemoryItem[]> {
        const where: Prisma.ProceduralMemoryItemWhereInput = {
            agentId,
            summary: { contains: pattern, mode: 'insensitive' },
            isDeleted: false,
        };

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        return this.getDelegate().findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Get recent procedures
     */
    async getRecent(
        agentId: string,
        limit: number = 10,
        actor?: ActorContext
    ): Promise<ProceduralMemoryItem[]> {
        const where: Prisma.ProceduralMemoryItemWhereInput = {
            agentId,
            isDeleted: false,
        };

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        return this.getDelegate().findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            take: limit,
        });
    }

    /**
     * List procedural memory items with pagination
     */
    async listItems(
        actor: ActorContext,
        options: MemoryListOptions & { entryType?: string } = {}
    ): Promise<ListResult<ProceduralMemoryItem>> {
        const {
            cursor,
            limit = 50,
            sort = { field: 'updatedAt', order: 'desc' },
            startDate,
            endDate,
            includeDeleted = false,
            agentId,
            entryType,
        } = options;

        const where: Prisma.ProceduralMemoryItemWhereInput = {
            organizationId: actor.organizationId,
        };

        if (!includeDeleted) {
            where.isDeleted = false;
        }

        if (agentId) {
            where.agentId = agentId;
        }

        if (entryType) {
            where.entryType = entryType;
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }

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
            ? items[items.length - 1].id
            : undefined;

        return { items, total, hasMore, nextCursor };
    }

    /**
     * Get entry type statistics
     */
    async getEntryTypeStats(
        agentId: string,
        actor?: ActorContext
    ): Promise<Record<string, number>> {
        const orgFilter = actor ? Prisma.sql`AND organization_id = ${actor.organizationId}` : Prisma.empty;

        const results = await this.prisma.$queryRaw<{ entry_type: string; count: bigint }[]>`
            SELECT entry_type, COUNT(*) as count
            FROM procedural_memory
            WHERE agent_id = ${agentId}
              AND is_deleted = false
              ${orgFilter}
            GROUP BY entry_type
        `;

        const counts: Record<string, number> = {};
        for (const row of results) {
            counts[row.entry_type] = Number(row.count);
        }

        return counts;
    }

    // ========================================================================
    // DATA PREPARATION
    // ========================================================================

    protected prepareCreateData(
        data: CreateProceduralMemoryInput,
        actor?: ActorContext
    ): Prisma.ProceduralMemoryItemCreateInput {
        const lastModify = {
            timestamp: new Date().toISOString(),
            operation: 'created',
        };

        return {
            id: data.id,
            entryType: data.entryType,
            summary: data.summary,
            steps: (data.steps ?? []) as Prisma.InputJsonValue,
            filterTags: data.filterTags ?? Prisma.JsonNull,
            embeddingConfig: data.embeddingConfig ?? Prisma.JsonNull,
            lastModify: lastModify as Prisma.InputJsonValue,
            organization: data.organizationId
                ? { connect: { id: data.organizationId } }
                : undefined,
            user: { connect: { id: data.userId } },
            agent: data.agentId
                ? { connect: { id: data.agentId } }
                : undefined,
            client: data.clientId
                ? { connect: { id: data.clientId } }
                : undefined,
            createdById: actor?.id,
            lastUpdatedById: actor?.id,
        };
    }

    protected prepareUpdateData(
        data: UpdateProceduralMemoryInput,
        actor?: ActorContext
    ): Prisma.ProceduralMemoryItemUpdateInput {
        const lastModify = {
            timestamp: new Date().toISOString(),
            operation: 'updated',
        };

        const updateData: Prisma.ProceduralMemoryItemUpdateInput = {
            updatedAt: new Date(),
            lastUpdatedById: actor?.id,
            lastModify: lastModify as Prisma.InputJsonValue,
        };

        if (data.entryType !== undefined) updateData.entryType = data.entryType;
        if (data.summary !== undefined) updateData.summary = data.summary;
        if (data.steps !== undefined) updateData.steps = data.steps as Prisma.InputJsonValue;
        if (data.filterTags !== undefined) updateData.filterTags = data.filterTags as Prisma.InputJsonValue;
        if (data.embeddingConfig !== undefined) updateData.embeddingConfig = data.embeddingConfig as Prisma.InputJsonValue;

        return updateData;
    }
}

// Singleton instance
export const proceduralMemoryManager = new ProceduralMemoryManager();

export default proceduralMemoryManager;
