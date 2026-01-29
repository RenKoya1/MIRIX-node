/**
 * Knowledge Memory Manager
 * Manages knowledge items - credentials and bookmarks
 */

import { KnowledgeItem, Prisma } from '@prisma/client';
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

export interface CreateKnowledgeItemInput {
    id: string;
    organizationId: string;
    userId: string;
    agentId?: string;
    entryType: string;
    source: string;
    sensitivity: string;
    secretValue: string;
    caption: string;
    filterTags?: unknown;
    embeddingConfig?: unknown;
    clientId?: string;
}

export interface UpdateKnowledgeItemInput {
    entryType?: string;
    source?: string;
    sensitivity?: string;
    secretValue?: string;
    caption?: string;
    filterTags?: unknown;
    embeddingConfig?: unknown;
}

// ============================================================================
// KNOWLEDGE MEMORY MANAGER
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

class KnowledgeMemoryManager extends BaseMemoryManager<
    KnowledgeItem,
    CreateKnowledgeItemInput,
    UpdateKnowledgeItemInput
> {
    protected readonly modelName = 'KnowledgeItem';

    protected readonly cacheConfig: CacheConfig = {
        enabled: true,
        prefix: RedisMemoryClient.KNOWLEDGE_PREFIX,
        ttl: 14400, // 4 hours
    };

    protected getDelegate(): AnyDelegate {
        return this.prisma.knowledgeItem;
    }

    /**
     * Create a new knowledge item
     */
    async create(
        data: CreateKnowledgeItemInput,
        actor?: ActorContext
    ): Promise<KnowledgeItem> {
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
     * Get items by entry type
     */
    async getByEntryType(
        agentId: string,
        entryType: string,
        limit: number = 50,
        actor?: ActorContext
    ): Promise<KnowledgeItem[]> {
        const where: Prisma.KnowledgeItemWhereInput = {
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
     * Get items by source
     */
    async getBySource(
        agentId: string,
        source: string,
        limit: number = 50,
        actor?: ActorContext
    ): Promise<KnowledgeItem[]> {
        const where: Prisma.KnowledgeItemWhereInput = {
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
     * Get items by sensitivity level
     */
    async getBySensitivity(
        agentId: string,
        sensitivity: string,
        limit: number = 50,
        actor?: ActorContext
    ): Promise<KnowledgeItem[]> {
        const where: Prisma.KnowledgeItemWhereInput = {
            agentId,
            sensitivity,
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
     * Search by caption pattern
     */
    async searchByCaption(
        agentId: string,
        pattern: string,
        limit: number = 50,
        actor?: ActorContext
    ): Promise<KnowledgeItem[]> {
        const where: Prisma.KnowledgeItemWhereInput = {
            agentId,
            caption: { contains: pattern, mode: 'insensitive' },
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
    ): Promise<KnowledgeItem[]> {
        const where: Prisma.KnowledgeItemWhereInput = {
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
     * List knowledge items with pagination
     */
    async listItems(
        actor: ActorContext,
        options: MemoryListOptions & { entryType?: string; sensitivity?: string } = {}
    ): Promise<ListResult<KnowledgeItem>> {
        const {
            cursor,
            limit = 50,
            sort = { field: 'updatedAt', order: 'desc' },
            startDate,
            endDate,
            includeDeleted = false,
            agentId,
            entryType,
            sensitivity,
        } = options;

        const where: Prisma.KnowledgeItemWhereInput = {
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

        if (sensitivity) {
            where.sensitivity = sensitivity;
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
            FROM knowledge
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

    /**
     * Get sensitivity statistics
     */
    async getSensitivityStats(
        agentId: string,
        actor?: ActorContext
    ): Promise<Record<string, number>> {
        const orgFilter = actor ? Prisma.sql`AND organization_id = ${actor.organizationId}` : Prisma.empty;

        const results = await this.prisma.$queryRaw<{ sensitivity: string; count: bigint }[]>`
            SELECT sensitivity, COUNT(*) as count
            FROM knowledge
            WHERE agent_id = ${agentId}
              AND is_deleted = false
              ${orgFilter}
            GROUP BY sensitivity
        `;

        const counts: Record<string, number> = {};
        for (const row of results) {
            counts[row.sensitivity] = Number(row.count);
        }

        return counts;
    }

    // ========================================================================
    // DATA PREPARATION
    // ========================================================================

    protected prepareCreateData(
        data: CreateKnowledgeItemInput,
        actor?: ActorContext
    ): Prisma.KnowledgeItemCreateInput {
        const lastModify = {
            timestamp: new Date().toISOString(),
            operation: 'created',
        };

        return {
            id: data.id,
            entryType: data.entryType,
            source: data.source,
            sensitivity: data.sensitivity,
            secretValue: data.secretValue,
            caption: data.caption,
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
        data: UpdateKnowledgeItemInput,
        actor?: ActorContext
    ): Prisma.KnowledgeItemUpdateInput {
        const lastModify = {
            timestamp: new Date().toISOString(),
            operation: 'updated',
        };

        const updateData: Prisma.KnowledgeItemUpdateInput = {
            updatedAt: new Date(),
            lastUpdatedById: actor?.id,
            lastModify: lastModify as Prisma.InputJsonValue,
        };

        if (data.entryType !== undefined) updateData.entryType = data.entryType;
        if (data.source !== undefined) updateData.source = data.source;
        if (data.sensitivity !== undefined) updateData.sensitivity = data.sensitivity;
        if (data.secretValue !== undefined) updateData.secretValue = data.secretValue;
        if (data.caption !== undefined) updateData.caption = data.caption;
        if (data.filterTags !== undefined) updateData.filterTags = data.filterTags as Prisma.InputJsonValue;
        if (data.embeddingConfig !== undefined) updateData.embeddingConfig = data.embeddingConfig as Prisma.InputJsonValue;

        return updateData;
    }
}

// Singleton instance
export const knowledgeMemoryManager = new KnowledgeMemoryManager();

export default knowledgeMemoryManager;
