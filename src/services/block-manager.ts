/**
 * Block Manager
 * Provides CRUD operations for blocks (core memory blocks)
 */

import { Block, Prisma } from '@prisma/client';
import { BaseManager, CacheConfig, ActorContext, ListOptions, ListResult } from './base-manager';
import { RedisMemoryClient } from '../database/redis-client';
import { ValidationError } from '../errors';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateBlockInput {
    organizationId: string;
    userId: string;
    label: string;
    value: string;
    limit?: number;
    agentId?: string;
}

export interface UpdateBlockInput {
    label?: string;
    value?: string;
    limit?: number;
}

export interface BlockListOptions extends ListOptions {
    userId?: string;
    agentId?: string;
    label?: string;
}

// ============================================================================
// BLOCK MANAGER
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

class BlockManager extends BaseManager<
    Block,
    CreateBlockInput,
    UpdateBlockInput
> {
    protected readonly modelName = 'Block';

    protected readonly cacheConfig: CacheConfig = {
        enabled: true,
        prefix: RedisMemoryClient.BLOCK_PREFIX,
        ttl: 3600,
        useHash: true,
    };

    protected getDelegate(): AnyDelegate {
        return this.prisma.block;
    }

    async create(
        data: CreateBlockInput,
        actor?: ActorContext
    ): Promise<Block> {
        const org = await this.prisma.organization.findUnique({
            where: { id: data.organizationId },
        });
        if (!org) {
            throw new ValidationError('Organization not found', { field: 'organizationId' });
        }

        if (data.limit && data.value.length > data.limit) {
            throw new ValidationError('Value exceeds block limit', {
                field: 'value',
                limit: String(data.limit),
                actualLength: String(data.value.length),
            });
        }

        return super.create(data, actor);
    }

    async findByLabel(
        label: string,
        userId: string
    ): Promise<Block | null> {
        return this.getDelegate().findFirst({
            where: {
                label,
                userId,
                isDeleted: false,
            },
        });
    }

    async getAgentBlocks(
        agentId: string,
        actor?: ActorContext
    ): Promise<Block[]> {
        const where: Prisma.BlockWhereInput = {
            agentId,
            isDeleted: false,
        };

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        return this.getDelegate().findMany({
            where,
            orderBy: { label: 'asc' },
        });
    }

    async getUserBlocks(
        userId: string,
        actor?: ActorContext
    ): Promise<Block[]> {
        const where: Prisma.BlockWhereInput = {
            userId,
            isDeleted: false,
        };

        if (actor) {
            where.organizationId = actor.organizationId;
        }

        return this.getDelegate().findMany({
            where,
            orderBy: { label: 'asc' },
        });
    }

    async listBlocks(
        actor: ActorContext,
        options: BlockListOptions = {}
    ): Promise<ListResult<Block>> {
        const {
            cursor,
            limit = 50,
            sort = { field: 'createdAt', order: 'desc' },
            startDate,
            endDate,
            includeDeleted = false,
            userId,
            agentId,
            label,
        } = options;

        const where: Prisma.BlockWhereInput = {
            organizationId: actor.organizationId,
        };

        if (!includeDeleted) {
            where.isDeleted = false;
        }

        if (userId) {
            where.userId = userId;
        }

        if (agentId) {
            where.agentId = agentId;
        }

        if (label) {
            where.label = { contains: label, mode: 'insensitive' };
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

    async updateValue(
        id: string,
        value: string,
        actor?: ActorContext
    ): Promise<Block> {
        const block = await this.read(id, actor);

        if (block.limit && value.length > block.limit) {
            throw new ValidationError('Value exceeds block limit', {
                field: 'value',
                limit: String(block.limit),
                actualLength: String(value.length),
            });
        }

        return this.update(id, { value }, actor);
    }

    async clone(
        id: string,
        overrides?: Partial<CreateBlockInput>,
        actor?: ActorContext
    ): Promise<Block> {
        const source = await this.read(id, actor);

        const newBlock: CreateBlockInput = {
            organizationId: source.organizationId ?? overrides?.organizationId ?? '',
            userId: overrides?.userId ?? source.userId,
            label: overrides?.label ?? source.label,
            value: overrides?.value ?? source.value,
            limit: overrides?.limit ?? source.limit,
            agentId: overrides?.agentId ?? source.agentId ?? undefined,
        };

        return this.create(newBlock, actor);
    }

    protected prepareCreateData(
        data: CreateBlockInput,
        actor?: ActorContext
    ): Prisma.BlockCreateInput {
        return {
            label: data.label,
            value: data.value,
            limit: data.limit ?? 2000,
            organization: data.organizationId
                ? { connect: { id: data.organizationId } }
                : undefined,
            user: { connect: { id: data.userId } },
            agent: data.agentId
                ? { connect: { id: data.agentId } }
                : undefined,
            createdById: actor?.id,
            lastUpdatedById: actor?.id,
        };
    }

    protected prepareUpdateData(
        data: UpdateBlockInput,
        actor?: ActorContext
    ): Prisma.BlockUpdateInput {
        const updateData: Prisma.BlockUpdateInput = {
            updatedAt: new Date(),
            lastUpdatedById: actor?.id,
        };

        if (data.label !== undefined) updateData.label = data.label;
        if (data.value !== undefined) updateData.value = data.value;
        if (data.limit !== undefined) updateData.limit = data.limit;

        return updateData;
    }
}

export const blockManager = new BlockManager();
export default blockManager;
