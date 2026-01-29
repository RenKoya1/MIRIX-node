/**
 * Resource Memory Manager
 * Manages resource memory items - external resources, documents, and references
 */

import { ResourceMemoryItem, Prisma } from '@prisma/client';
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

export interface CreateResourceMemoryInput {
    id: string;
    organizationId: string;
    userId: string;
    agentId?: string;
    title: string;
    summary: string;
    resourceType: string;
    content: string;
    filterTags?: unknown;
    embeddingConfig?: unknown;
    clientId?: string;
}

export interface UpdateResourceMemoryInput {
    title?: string;
    summary?: string;
    resourceType?: string;
    content?: string;
    filterTags?: unknown;
    embeddingConfig?: unknown;
}

// ============================================================================
// RESOURCE MEMORY MANAGER
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

class ResourceMemoryManager extends BaseMemoryManager<
    ResourceMemoryItem,
    CreateResourceMemoryInput,
    UpdateResourceMemoryInput
> {
    protected readonly modelName = 'ResourceMemoryItem';

    protected readonly cacheConfig: CacheConfig = {
        enabled: true,
        prefix: RedisMemoryClient.RESOURCE_PREFIX,
        ttl: 7200, // 2 hours
    };

    protected getDelegate(): AnyDelegate {
        return this.prisma.resourceMemoryItem;
    }

    /**
     * Create a new resource memory item
     */
    async create(
        data: CreateResourceMemoryInput,
        actor?: ActorContext
    ): Promise<ResourceMemoryItem> {
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
     * Get resources by type
     */
    async getByResourceType(
        agentId: string,
        resourceType: string,
        limit: number = 50,
        actor?: ActorContext
    ): Promise<ResourceMemoryItem[]> {
        const where: Prisma.ResourceMemoryItemWhereInput = {
            agentId,
            resourceType,
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
     * Find by title
     */
    async findByTitle(
        agentId: string,
        title: string,
        actor?: ActorContext
    ): Promise<ResourceMemoryItem | null> {
        const where: Prisma.ResourceMemoryItemWhereInput = {
            agentId,
            title,
            isDeleted: false,
        };

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        return this.getDelegate().findFirst({ where });
    }

    /**
     * Search by title pattern
     */
    async searchByTitle(
        agentId: string,
        pattern: string,
        limit: number = 50,
        actor?: ActorContext
    ): Promise<ResourceMemoryItem[]> {
        const where: Prisma.ResourceMemoryItemWhereInput = {
            agentId,
            title: { contains: pattern, mode: 'insensitive' },
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
     * Get recent resources
     */
    async getRecent(
        agentId: string,
        limit: number = 10,
        actor?: ActorContext
    ): Promise<ResourceMemoryItem[]> {
        const where: Prisma.ResourceMemoryItemWhereInput = {
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
     * List resource memory items with pagination
     */
    async listItems(
        actor: ActorContext,
        options: MemoryListOptions & { resourceType?: string } = {}
    ): Promise<ListResult<ResourceMemoryItem>> {
        const {
            cursor,
            limit = 50,
            sort = { field: 'updatedAt', order: 'desc' },
            startDate,
            endDate,
            includeDeleted = false,
            agentId,
            resourceType,
        } = options;

        const where: Prisma.ResourceMemoryItemWhereInput = {
            organizationId: actor.organizationId,
        };

        if (!includeDeleted) {
            where.isDeleted = false;
        }

        if (agentId) {
            where.agentId = agentId;
        }

        if (resourceType) {
            where.resourceType = resourceType;
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
     * Get resource type statistics
     */
    async getResourceTypeStats(
        agentId: string,
        actor?: ActorContext
    ): Promise<Record<string, number>> {
        const orgFilter = actor ? Prisma.sql`AND organization_id = ${actor.organizationId}` : Prisma.empty;

        const results = await this.prisma.$queryRaw<{ resource_type: string; count: bigint }[]>`
            SELECT resource_type, COUNT(*) as count
            FROM resource_memory
            WHERE agent_id = ${agentId}
              AND is_deleted = false
              ${orgFilter}
            GROUP BY resource_type
        `;

        const counts: Record<string, number> = {};
        for (const row of results) {
            counts[row.resource_type] = Number(row.count);
        }

        return counts;
    }

    // ========================================================================
    // DATA PREPARATION
    // ========================================================================

    protected prepareCreateData(
        data: CreateResourceMemoryInput,
        actor?: ActorContext
    ): Prisma.ResourceMemoryItemCreateInput {
        const lastModify = {
            timestamp: new Date().toISOString(),
            operation: 'created',
        };

        return {
            id: data.id,
            title: data.title,
            summary: data.summary,
            resourceType: data.resourceType,
            content: data.content,
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
        data: UpdateResourceMemoryInput,
        actor?: ActorContext
    ): Prisma.ResourceMemoryItemUpdateInput {
        const lastModify = {
            timestamp: new Date().toISOString(),
            operation: 'updated',
        };

        const updateData: Prisma.ResourceMemoryItemUpdateInput = {
            updatedAt: new Date(),
            lastUpdatedById: actor?.id,
            lastModify: lastModify as Prisma.InputJsonValue,
        };

        if (data.title !== undefined) updateData.title = data.title;
        if (data.summary !== undefined) updateData.summary = data.summary;
        if (data.resourceType !== undefined) updateData.resourceType = data.resourceType;
        if (data.content !== undefined) updateData.content = data.content;
        if (data.filterTags !== undefined) updateData.filterTags = data.filterTags as Prisma.InputJsonValue;
        if (data.embeddingConfig !== undefined) updateData.embeddingConfig = data.embeddingConfig as Prisma.InputJsonValue;

        return updateData;
    }
}

// Singleton instance
export const resourceMemoryManager = new ResourceMemoryManager();

export default resourceMemoryManager;
