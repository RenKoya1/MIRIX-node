/**
 * Semantic Memory Manager
 * Manages semantic memory items - factual knowledge and concepts
 */

import { SemanticMemoryItem, Prisma } from '@prisma/client';
import { BaseMemoryManager, CacheConfig, MemoryListOptions } from './base-memory-manager';
import { RedisMemoryClient } from '../../database/redis-client';
import { ActorContext, ListResult } from '../base-manager';
import { ValidationError } from '../../errors';

// ============================================================================
// TYPES
// ============================================================================

export interface LastModify {
    timestamp: string;
    operation: 'created' | 'updated' | 'deleted';
}

export interface CreateSemanticMemoryInput {
    id: string;
    organizationId: string;
    userId: string;
    agentId?: string;
    name: string;
    summary: string;
    details: string;
    source: string;
    filterTags?: unknown;
    embeddingConfig?: unknown;
    clientId?: string;
}

export interface UpdateSemanticMemoryInput {
    name?: string;
    summary?: string;
    details?: string;
    source?: string;
    filterTags?: unknown;
    embeddingConfig?: unknown;
}

// ============================================================================
// SEMANTIC MEMORY MANAGER
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

class SemanticMemoryManager extends BaseMemoryManager<
    SemanticMemoryItem,
    CreateSemanticMemoryInput,
    UpdateSemanticMemoryInput
> {
    protected readonly modelName = 'SemanticMemoryItem';

    protected readonly cacheConfig: CacheConfig = {
        enabled: true,
        prefix: RedisMemoryClient.SEMANTIC_PREFIX,
        ttl: 7200, // 2 hours
    };

    protected getDelegate(): AnyDelegate {
        return this.prisma.semanticMemoryItem;
    }

    /**
     * Create a new semantic memory item
     */
    async create(
        data: CreateSemanticMemoryInput,
        actor?: ActorContext
    ): Promise<SemanticMemoryItem> {
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
     * Get items by source
     */
    async getBySource(
        agentId: string,
        source: string,
        limit: number = 50,
        actor?: ActorContext
    ): Promise<SemanticMemoryItem[]> {
        const where: Prisma.SemanticMemoryItemWhereInput = {
            agentId,
            source,
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
     * Find by name
     */
    async findByName(
        agentId: string,
        name: string,
        actor?: ActorContext
    ): Promise<SemanticMemoryItem | null> {
        const where: Prisma.SemanticMemoryItemWhereInput = {
            agentId,
            name,
            isDeleted: false,
        };

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        return this.getDelegate().findFirst({ where });
    }

    /**
     * Search by name pattern
     */
    async searchByName(
        agentId: string,
        pattern: string,
        limit: number = 50,
        actor?: ActorContext
    ): Promise<SemanticMemoryItem[]> {
        const where: Prisma.SemanticMemoryItemWhereInput = {
            agentId,
            name: { contains: pattern, mode: 'insensitive' },
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
     * Get recent items
     */
    async getRecent(
        agentId: string,
        limit: number = 10,
        actor?: ActorContext
    ): Promise<SemanticMemoryItem[]> {
        const where: Prisma.SemanticMemoryItemWhereInput = {
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
     * List semantic memory items with pagination
     */
    async listItems(
        actor: ActorContext,
        options: MemoryListOptions & { source?: string } = {}
    ): Promise<ListResult<SemanticMemoryItem>> {
        const {
            cursor,
            limit = 50,
            sort = { field: 'updatedAt', order: 'desc' },
            startDate,
            endDate,
            includeDeleted = false,
            agentId,
            source,
        } = options;

        const where: Prisma.SemanticMemoryItemWhereInput = {
            organizationId: actor.organizationId,
        };

        if (!includeDeleted) {
            where.isDeleted = false;
        }

        if (agentId) {
            where.agentId = agentId;
        }

        if (source) {
            where.source = source;
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
     * Get source statistics
     */
    async getSourceStats(
        agentId: string,
        actor?: ActorContext
    ): Promise<Record<string, number>> {
        const orgFilter = actor ? Prisma.sql`AND organization_id = ${actor.organizationId}` : Prisma.empty;

        const results = await this.prisma.$queryRaw<{ source: string; count: bigint }[]>`
            SELECT source, COUNT(*) as count
            FROM semantic_memory
            WHERE agent_id = ${agentId}
              AND is_deleted = false
              ${orgFilter}
            GROUP BY source
        `;

        const counts: Record<string, number> = {};
        for (const row of results) {
            counts[row.source] = Number(row.count);
        }

        return counts;
    }

    // ========================================================================
    // DATA PREPARATION
    // ========================================================================

    protected prepareCreateData(
        data: CreateSemanticMemoryInput,
        actor?: ActorContext
    ): Prisma.SemanticMemoryItemCreateInput {
        const lastModify = {
            timestamp: new Date().toISOString(),
            operation: 'created',
        };

        return {
            id: data.id,
            name: data.name,
            summary: data.summary,
            details: data.details,
            source: data.source,
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
        data: UpdateSemanticMemoryInput,
        actor?: ActorContext
    ): Prisma.SemanticMemoryItemUpdateInput {
        const lastModify = {
            timestamp: new Date().toISOString(),
            operation: 'updated',
        };

        const updateData: Prisma.SemanticMemoryItemUpdateInput = {
            updatedAt: new Date(),
            lastUpdatedById: actor?.id,
            lastModify: lastModify as Prisma.InputJsonValue,
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.summary !== undefined) updateData.summary = data.summary;
        if (data.details !== undefined) updateData.details = data.details;
        if (data.source !== undefined) updateData.source = data.source;
        if (data.filterTags !== undefined) updateData.filterTags = data.filterTags as Prisma.InputJsonValue;
        if (data.embeddingConfig !== undefined) updateData.embeddingConfig = data.embeddingConfig as Prisma.InputJsonValue;

        return updateData;
    }
}

// Singleton instance
export const semanticMemoryManager = new SemanticMemoryManager();

export default semanticMemoryManager;
