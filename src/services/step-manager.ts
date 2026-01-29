/**
 * Step Manager
 * Provides CRUD operations for agent execution steps
 */

import { Step, Prisma } from '@prisma/client';
import { BaseManager, CacheConfig, ActorContext, ListOptions, ListResult } from './base-manager';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateStepInput {
    organizationId?: string;
    origin?: string;
    providerName?: string;
    model?: string;
    contextWindowLimit?: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    completionTokensDetails?: unknown;
    tags?: unknown;
    tid?: string;
    providerId?: string;
}

export interface UpdateStepInput {
    providerName?: string;
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    completionTokensDetails?: unknown;
    tags?: unknown;
}

export interface StepListOptions extends ListOptions {
    model?: string;
    providerName?: string;
}

// ============================================================================
// STEP MANAGER
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

class StepManager extends BaseManager<
    Step,
    CreateStepInput,
    UpdateStepInput
> {
    protected readonly modelName = 'Step';

    protected readonly cacheConfig: CacheConfig = {
        enabled: false,
        prefix: 'step:',
        ttl: 0,
        useHash: false,
    };

    protected getDelegate(): AnyDelegate {
        return this.prisma.step;
    }

    async getStepMessages(
        stepId: string,
        actor?: ActorContext
    ): Promise<{ id: string; role: string; text: string | null }[]> {
        const step = await this.getDelegate().findFirst({
            where: { id: stepId, isDeleted: false },
            include: {
                messages: {
                    where: { isDeleted: false },
                    select: { id: true, role: true, text: true },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!step) {
            return [];
        }

        if (actor && step.organizationId !== actor.organizationId) {
            return [];
        }

        return step.messages;
    }

    async listSteps(
        actor: ActorContext,
        options: StepListOptions = {}
    ): Promise<ListResult<Step>> {
        const {
            cursor,
            limit = 50,
            sort = { field: 'createdAt', order: 'desc' },
            startDate,
            endDate,
            includeDeleted = false,
            model,
            providerName,
        } = options;

        const where: Prisma.StepWhereInput = {
            organizationId: actor.organizationId,
        };

        if (!includeDeleted) {
            where.isDeleted = false;
        }

        if (model) {
            where.model = model;
        }

        if (providerName) {
            where.providerName = providerName;
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

    async getStepStats(
        actor: ActorContext
    ): Promise<{
        totalSteps: number;
        totalTokens: number;
        avgTokensPerStep: number;
    }> {
        const where: Prisma.StepWhereInput = {
            organizationId: actor.organizationId,
            isDeleted: false,
        };

        const [totalSteps, aggregates] = await Promise.all([
            this.getDelegate().count({ where }),
            this.getDelegate().aggregate({
                where,
                _sum: {
                    totalTokens: true,
                },
                _avg: {
                    totalTokens: true,
                },
            }),
        ]);

        return {
            totalSteps,
            totalTokens: aggregates._sum.totalTokens ?? 0,
            avgTokensPerStep: aggregates._avg.totalTokens ?? 0,
        };
    }

    protected prepareCreateData(
        data: CreateStepInput,
        actor?: ActorContext
    ): Prisma.StepCreateInput {
        return {
            origin: data.origin,
            providerName: data.providerName,
            model: data.model,
            contextWindowLimit: data.contextWindowLimit,
            promptTokens: data.promptTokens ?? 0,
            completionTokens: data.completionTokens ?? 0,
            totalTokens: data.totalTokens ?? 0,
            completionTokensDetails: data.completionTokensDetails as Prisma.InputJsonValue | undefined,
            tags: data.tags as Prisma.InputJsonValue | undefined,
            tid: data.tid,
            createdById: actor?.id,
            lastUpdatedById: actor?.id,
        };
    }

    protected prepareUpdateData(
        data: UpdateStepInput,
        actor?: ActorContext
    ): Prisma.StepUpdateInput {
        const updateData: Prisma.StepUpdateInput = {
            updatedAt: new Date(),
            lastUpdatedById: actor?.id,
        };

        if (data.providerName !== undefined) updateData.providerName = data.providerName;
        if (data.model !== undefined) updateData.model = data.model;
        if (data.promptTokens !== undefined) updateData.promptTokens = data.promptTokens;
        if (data.completionTokens !== undefined) updateData.completionTokens = data.completionTokens;
        if (data.totalTokens !== undefined) updateData.totalTokens = data.totalTokens;
        if (data.completionTokensDetails !== undefined) updateData.completionTokensDetails = data.completionTokensDetails as Prisma.InputJsonValue;
        if (data.tags !== undefined) updateData.tags = data.tags as Prisma.InputJsonValue;

        return updateData;
    }
}

export const stepManager = new StepManager();
export default stepManager;
