/**
 * Episodic Memory Manager
 * Manages episodic events - time-based memories of specific events/interactions
 */

import { EpisodicEvent, Prisma } from '@prisma/client';
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

export interface CreateEpisodicEventInput {
    id: string;
    organizationId: string;
    userId: string;
    agentId?: string;
    occurredAt: Date;
    actor: string;
    eventType: string;
    summary: string;
    details: string;
    filterTags?: unknown;
    embeddingConfig?: unknown;
    clientId?: string;
}

export interface UpdateEpisodicEventInput {
    occurredAt?: Date;
    actor?: string;
    eventType?: string;
    summary?: string;
    details?: string;
    filterTags?: unknown;
    embeddingConfig?: unknown;
}

// ============================================================================
// EPISODIC MEMORY MANAGER
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

class EpisodicMemoryManager extends BaseMemoryManager<
    EpisodicEvent,
    CreateEpisodicEventInput,
    UpdateEpisodicEventInput
> {
    protected readonly modelName = 'EpisodicEvent';

    protected readonly cacheConfig: CacheConfig = {
        enabled: true,
        prefix: RedisMemoryClient.EPISODIC_PREFIX,
        ttl: 3600,
    };

    protected getDelegate(): AnyDelegate {
        return this.prisma.episodicEvent;
    }

    /**
     * Create a new episodic event
     */
    async create(
        data: CreateEpisodicEventInput,
        actor?: ActorContext
    ): Promise<EpisodicEvent> {
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
     * Get recent events for an agent
     */
    async getRecentEvents(
        agentId: string,
        limit: number = 10,
        actor?: ActorContext
    ): Promise<EpisodicEvent[]> {
        const where: Prisma.EpisodicEventWhereInput = {
            agentId,
            isDeleted: false,
        };

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        return this.getDelegate().findMany({
            where,
            orderBy: { occurredAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Get events in a time range
     */
    async getEventsInRange(
        agentId: string,
        startTime: Date,
        endTime: Date,
        actor?: ActorContext
    ): Promise<EpisodicEvent[]> {
        const where: Prisma.EpisodicEventWhereInput = {
            agentId,
            isDeleted: false,
            occurredAt: {
                gte: startTime,
                lte: endTime,
            },
        };

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        return this.getDelegate().findMany({
            where,
            orderBy: { occurredAt: 'asc' },
        });
    }

    /**
     * Get events by type
     */
    async getEventsByType(
        agentId: string,
        eventType: string,
        limit: number = 50,
        actor?: ActorContext
    ): Promise<EpisodicEvent[]> {
        const where: Prisma.EpisodicEventWhereInput = {
            agentId,
            eventType,
            isDeleted: false,
        };

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        return this.getDelegate().findMany({
            where,
            orderBy: { occurredAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Get events by actor
     */
    async getEventsByActor(
        agentId: string,
        actorName: string,
        limit: number = 50,
        actor?: ActorContext
    ): Promise<EpisodicEvent[]> {
        const where: Prisma.EpisodicEventWhereInput = {
            agentId,
            actor: actorName,
            isDeleted: false,
        };

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        return this.getDelegate().findMany({
            where,
            orderBy: { occurredAt: 'desc' },
            take: limit,
        });
    }

    /**
     * List episodic events with pagination
     */
    async listEvents(
        actor: ActorContext,
        options: MemoryListOptions & { eventType?: string } = {}
    ): Promise<ListResult<EpisodicEvent>> {
        const {
            cursor,
            limit = 50,
            sort = { field: 'occurredAt', order: 'desc' },
            startDate,
            endDate,
            includeDeleted = false,
            agentId,
            eventType,
        } = options;

        const where: Prisma.EpisodicEventWhereInput = {
            organizationId: actor.organizationId,
        };

        if (!includeDeleted) {
            where.isDeleted = false;
        }

        if (agentId) {
            where.agentId = agentId;
        }

        if (eventType) {
            where.eventType = eventType;
        }

        if (startDate || endDate) {
            where.occurredAt = {};
            if (startDate) where.occurredAt.gte = startDate;
            if (endDate) where.occurredAt.lte = endDate;
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
     * Get event count by type
     */
    async countByType(
        agentId: string,
        actor?: ActorContext
    ): Promise<Record<string, number>> {
        const orgFilter = actor ? Prisma.sql`AND organization_id = ${actor.organizationId}` : Prisma.empty;

        const results = await this.prisma.$queryRaw<{ event_type: string; count: bigint }[]>`
            SELECT event_type, COUNT(*) as count
            FROM episodic_memory
            WHERE agent_id = ${agentId}
              AND is_deleted = false
              ${orgFilter}
            GROUP BY event_type
        `;

        const counts: Record<string, number> = {};
        for (const row of results) {
            counts[row.event_type] = Number(row.count);
        }

        return counts;
    }

    // ========================================================================
    // DATA PREPARATION
    // ========================================================================

    protected prepareCreateData(
        data: CreateEpisodicEventInput,
        actor?: ActorContext
    ): Prisma.EpisodicEventCreateInput {
        const lastModify = {
            timestamp: new Date().toISOString(),
            operation: 'created',
        };

        return {
            id: data.id,
            occurredAt: data.occurredAt,
            actor: data.actor,
            eventType: data.eventType,
            summary: data.summary,
            details: data.details,
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
        data: UpdateEpisodicEventInput,
        actor?: ActorContext
    ): Prisma.EpisodicEventUpdateInput {
        const lastModify = {
            timestamp: new Date().toISOString(),
            operation: 'updated',
        };

        const updateData: Prisma.EpisodicEventUpdateInput = {
            updatedAt: new Date(),
            lastUpdatedById: actor?.id,
            lastModify: lastModify as Prisma.InputJsonValue,
        };

        if (data.occurredAt !== undefined) updateData.occurredAt = data.occurredAt;
        if (data.actor !== undefined) updateData.actor = data.actor;
        if (data.eventType !== undefined) updateData.eventType = data.eventType;
        if (data.summary !== undefined) updateData.summary = data.summary;
        if (data.details !== undefined) updateData.details = data.details;
        if (data.filterTags !== undefined) updateData.filterTags = data.filterTags as Prisma.InputJsonValue;
        if (data.embeddingConfig !== undefined) updateData.embeddingConfig = data.embeddingConfig as Prisma.InputJsonValue;

        return updateData;
    }
}

// Singleton instance
export const episodicMemoryManager = new EpisodicMemoryManager();

export default episodicMemoryManager;
