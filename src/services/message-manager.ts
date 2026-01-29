/**
 * Message Manager
 * Provides CRUD operations for messages in agent conversations
 */

import { Message, Prisma } from '@prisma/client';
import { BaseManager, CacheConfig, ActorContext, ListOptions, ListResult } from './base-manager.js';
import { RedisMemoryClient } from '../database/redis-client.js';
import { ValidationError } from '../errors.js';

// ============================================================================
// TYPES
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface CreateMessageInput {
    id: string;
    organizationId: string;
    userId: string;
    agentId: string;
    role: string;
    text?: string;
    content?: unknown;
    name?: string;
    toolCalls?: unknown;
    toolCallId?: string;
    model?: string;
    filterTags?: unknown;
    otid?: string;
    toolReturns?: unknown;
    groupId?: string;
    senderId?: string;
    clientId?: string;
    stepId?: string;
}

export interface UpdateMessageInput {
    text?: string;
    content?: unknown;
}

export interface MessageListOptions extends ListOptions {
    agentId?: string;
    role?: string;
    userId?: string;
    clientId?: string;
}

// ============================================================================
// MESSAGE MANAGER
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

class MessageManager extends BaseManager<
    Message,
    CreateMessageInput,
    UpdateMessageInput
> {
    protected readonly modelName = 'Message';

    protected readonly cacheConfig: CacheConfig = {
        enabled: true,
        prefix: RedisMemoryClient.MESSAGE_PREFIX,
        ttl: 1800,
        useHash: true,
    };

    protected getDelegate(): AnyDelegate {
        return this.prisma.message;
    }

    async create(
        data: CreateMessageInput,
        actor?: ActorContext
    ): Promise<Message> {
        const agent = await this.prisma.agent.findUnique({
            where: { id: data.agentId },
        });
        if (!agent) {
            throw new ValidationError('Agent not found', { field: 'agentId' });
        }

        return super.create(data, actor);
    }

    async getAgentMessages(
        agentId: string,
        actor?: ActorContext,
        options: {
            limit?: number;
            before?: Date;
            after?: Date;
            roles?: string[];
        } = {}
    ): Promise<Message[]> {
        const where: Prisma.MessageWhereInput = {
            agentId,
            isDeleted: false,
        };

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        if (options.roles && options.roles.length > 0) {
            where.role = { in: options.roles };
        }

        if (options.before || options.after) {
            where.createdAt = {};
            if (options.before) where.createdAt.lt = options.before;
            if (options.after) where.createdAt.gt = options.after;
        }

        return this.getDelegate().findMany({
            where,
            orderBy: { createdAt: 'asc' },
            take: options.limit ?? 100,
        });
    }

    async getConversation(
        agentId: string,
        actor?: ActorContext,
        options: { limit?: number; offset?: number } = {}
    ): Promise<Message[]> {
        const where: Prisma.MessageWhereInput = {
            agentId,
            isDeleted: false,
        };

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        const { limit = 100, offset = 0 } = options;

        return this.getDelegate().findMany({
            where,
            orderBy: { createdAt: 'asc' },
            take: limit,
            skip: offset,
        });
    }

    async getLatestMessages(
        agentId: string,
        limit: number = 10,
        actor?: ActorContext
    ): Promise<Message[]> {
        const where: Prisma.MessageWhereInput = {
            agentId,
            isDeleted: false,
        };

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        const messages = await this.getDelegate().findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return messages.reverse();
    }

    async listMessages(
        actor: ActorContext,
        options: MessageListOptions = {}
    ): Promise<ListResult<Message>> {
        const {
            cursor,
            limit = 50,
            sort = { field: 'createdAt', order: 'desc' },
            startDate,
            endDate,
            includeDeleted = false,
            agentId,
            role,
            userId,
            clientId,
        } = options;

        const where: Prisma.MessageWhereInput = {
            organizationId: actor.organizationId,
        };

        if (!includeDeleted) {
            where.isDeleted = false;
        }

        if (agentId) where.agentId = agentId;
        if (role) where.role = role;
        if (userId) where.userId = userId;
        if (clientId) where.clientId = clientId;

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

    async countAgentMessages(
        agentId: string,
        actor?: ActorContext
    ): Promise<number> {
        const where: Prisma.MessageWhereInput = {
            agentId,
            isDeleted: false,
        };

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        return this.getDelegate().count({ where });
    }

    async deleteAgentMessages(
        agentId: string,
        actor?: ActorContext
    ): Promise<number> {
        const where: Prisma.MessageWhereInput = {
            agentId,
            isDeleted: false,
        };

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        const result = await this.prisma.message.updateMany({
            where,
            data: {
                isDeleted: true,
                updatedAt: new Date(),
                lastUpdatedById: actor?.id,
            },
        });

        this.logger.info({ agentId, count: result.count }, 'Deleted agent messages');

        return result.count;
    }

    async getWithRelations(
        id: string,
        actor?: ActorContext
    ): Promise<Message & {
        agent: { id: string; name: string | null } | null;
        step: { id: string } | null;
    }> {
        const whereClause = this.buildWhereClause(id, actor);

        const message = await this.getDelegate().findFirst({
            where: whereClause,
            include: {
                agent: {
                    select: { id: true, name: true },
                },
                step: {
                    select: { id: true },
                },
            },
        });

        if (!message) {
            throw new Error(`Message not found: ${id}`);
        }

        return message;
    }

    protected prepareCreateData(
        data: CreateMessageInput,
        actor?: ActorContext
    ): Prisma.MessageCreateInput {
        return {
            id: data.id,
            role: data.role,
            text: data.text,
            content: data.content as Prisma.InputJsonValue | undefined,
            name: data.name,
            toolCalls: data.toolCalls as Prisma.InputJsonValue | undefined,
            toolCallId: data.toolCallId,
            model: data.model,
            filterTags: data.filterTags as Prisma.InputJsonValue | undefined,
            otid: data.otid,
            toolReturns: data.toolReturns as Prisma.InputJsonValue | undefined,
            groupId: data.groupId,
            senderId: data.senderId,
            organization: data.organizationId
                ? { connect: { id: data.organizationId } }
                : undefined,
            user: { connect: { id: data.userId } },
            agent: { connect: { id: data.agentId } },
            client: data.clientId
                ? { connect: { id: data.clientId } }
                : undefined,
            step: data.stepId
                ? { connect: { id: data.stepId } }
                : undefined,
            createdById: actor?.id,
            lastUpdatedById: actor?.id,
        };
    }

    protected prepareUpdateData(
        data: UpdateMessageInput,
        actor?: ActorContext
    ): Prisma.MessageUpdateInput {
        const updateData: Prisma.MessageUpdateInput = {
            updatedAt: new Date(),
            lastUpdatedById: actor?.id,
        };

        if (data.text !== undefined) updateData.text = data.text;
        if (data.content !== undefined) updateData.content = data.content as Prisma.InputJsonValue;

        return updateData;
    }
}

export const messageManager = new MessageManager();
export default messageManager;
