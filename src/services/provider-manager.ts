/**
 * Provider Manager
 * Provides CRUD operations for LLM providers
 */

import { Provider, Prisma } from '@prisma/client';
import { BaseManager, CacheConfig, ActorContext, ListOptions, ListResult } from './base-manager';
import { ValidationError } from '../errors';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateProviderInput {
    organizationId: string;
    name: string;
    apiKey?: string;
}

export interface UpdateProviderInput {
    name?: string;
    apiKey?: string;
}

export interface ProviderListOptions extends ListOptions {
    name?: string;
}

// ============================================================================
// PROVIDER MANAGER
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

class ProviderManager extends BaseManager<
    Provider,
    CreateProviderInput,
    UpdateProviderInput
> {
    protected readonly modelName = 'Provider';

    protected readonly cacheConfig: CacheConfig = {
        enabled: true,
        prefix: 'provider:',
        ttl: 3600,
        useHash: true,
    };

    protected getDelegate(): AnyDelegate {
        return this.prisma.provider;
    }

    async create(
        data: CreateProviderInput,
        actor?: ActorContext
    ): Promise<Provider> {
        const org = await this.prisma.organization.findUnique({
            where: { id: data.organizationId },
        });
        if (!org) {
            throw new ValidationError('Organization not found', { field: 'organizationId' });
        }

        return super.create(data, actor);
    }

    async findByName(
        name: string,
        organizationId: string
    ): Promise<Provider | null> {
        return this.getDelegate().findFirst({
            where: {
                name,
                organizationId,
                isDeleted: false,
            },
        });
    }

    async listProviders(
        actor: ActorContext,
        options: ProviderListOptions = {}
    ): Promise<ListResult<Provider>> {
        const {
            cursor,
            limit = 50,
            sort = { field: 'createdAt', order: 'desc' },
            startDate,
            endDate,
            includeDeleted = false,
            name,
        } = options;

        const where: Prisma.ProviderWhereInput = {
            organizationId: actor.organizationId,
        };

        if (!includeDeleted) {
            where.isDeleted = false;
        }

        if (name) {
            where.name = { contains: name, mode: 'insensitive' };
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

    async getWithMaskedKey(
        id: string,
        actor?: ActorContext
    ): Promise<Provider & { maskedApiKey: string | null }> {
        const provider = await this.read(id, actor);

        let maskedApiKey: string | null = null;
        if (provider.apiKey) {
            const key = provider.apiKey;
            if (key.length > 8) {
                maskedApiKey = key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
            } else {
                maskedApiKey = '*'.repeat(key.length);
            }
        }

        return {
            ...provider,
            maskedApiKey,
        };
    }

    protected prepareCreateData(
        data: CreateProviderInput,
        actor?: ActorContext
    ): Prisma.ProviderCreateInput {
        return {
            name: data.name,
            apiKey: data.apiKey,
            organization: data.organizationId
                ? { connect: { id: data.organizationId } }
                : undefined,
            createdById: actor?.id,
            lastUpdatedById: actor?.id,
        };
    }

    protected prepareUpdateData(
        data: UpdateProviderInput,
        actor?: ActorContext
    ): Prisma.ProviderUpdateInput {
        const updateData: Prisma.ProviderUpdateInput = {
            updatedAt: new Date(),
            lastUpdatedById: actor?.id,
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.apiKey !== undefined) updateData.apiKey = data.apiKey;

        return updateData;
    }
}

export const providerManager = new ProviderManager();
export default providerManager;
