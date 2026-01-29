/**
 * Client Manager
 * Provides CRUD operations for clients (tenants within organizations)
 */

import { Client, Prisma } from '@prisma/client';
import { BaseManager, CacheConfig, ActorContext, ListOptions, ListResult } from './base-manager.js';
import { RedisMemoryClient } from '../database/redis-client.js';
import { ValidationError } from '../errors.js';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateClientInput {
    name: string;
    organizationId: string;
    status?: string;
    scope?: string;
    email?: string;
    credits?: number;
}

export interface UpdateClientInput {
    name?: string;
    status?: string;
    scope?: string;
    email?: string;
    credits?: number;
}

export interface ClientListOptions extends ListOptions {
    name?: string;
    status?: string;
}

// ============================================================================
// CLIENT MANAGER
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

class ClientManager extends BaseManager<
    Client,
    CreateClientInput,
    UpdateClientInput
> {
    protected readonly modelName = 'Client';

    protected readonly cacheConfig: CacheConfig = {
        enabled: true,
        prefix: RedisMemoryClient.CLIENT_PREFIX,
        ttl: 86400,
        useHash: true,
    };

    protected getDelegate(): AnyDelegate {
        return this.prisma.client;
    }

    async create(
        data: CreateClientInput,
        actor?: ActorContext
    ): Promise<Client> {
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
    ): Promise<Client | null> {
        return this.getDelegate().findFirst({
            where: {
                name,
                organizationId,
                isDeleted: false,
            },
        });
    }

    async findByEmail(email: string): Promise<Client | null> {
        return this.getDelegate().findFirst({
            where: {
                email,
                isDeleted: false,
            },
        });
    }

    async listClients(
        actor: ActorContext,
        options: ClientListOptions = {}
    ): Promise<ListResult<Client>> {
        const {
            cursor,
            limit = 50,
            sort = { field: 'createdAt', order: 'desc' },
            startDate,
            endDate,
            includeDeleted = false,
            name,
            status,
        } = options;

        const where: Prisma.ClientWhereInput = {
            organizationId: actor.organizationId,
        };

        if (!includeDeleted) {
            where.isDeleted = false;
        }

        if (name) {
            where.name = { contains: name, mode: 'insensitive' };
        }

        if (status) {
            where.status = status;
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

    async getWithRelations(
        id: string,
        actor?: ActorContext
    ): Promise<Client & {
        organization: { id: string; name: string } | null;
        users: { id: string; name: string }[];
        apiKeys: { id: string; name: string | null }[];
    }> {
        const whereClause = this.buildWhereClause(id, actor);

        const client = await this.getDelegate().findFirst({
            where: whereClause,
            include: {
                organization: {
                    select: { id: true, name: true },
                },
                users: {
                    where: { isDeleted: false },
                    select: { id: true, name: true },
                    take: 100,
                },
                apiKeys: {
                    where: { isDeleted: false },
                    select: { id: true, name: true },
                    take: 100,
                },
            },
        });

        if (!client) {
            throw new Error(`Client not found: ${id}`);
        }

        return client;
    }

    async getStats(
        id: string,
        actor?: ActorContext
    ): Promise<{
        userCount: number;
        messageCount: number;
    }> {
        await this.read(id, actor);

        const [userCount, messageCount] = await Promise.all([
            this.prisma.user.count({ where: { clientId: id, isDeleted: false } }),
            this.prisma.message.count({ where: { clientId: id, isDeleted: false } }),
        ]);

        return { userCount, messageCount };
    }

    async updateCredits(
        id: string,
        amount: number,
        actor?: ActorContext
    ): Promise<Client> {
        const client = await this.read(id, actor);
        const newCredits = (client.credits ?? 0) + amount;

        return this.update(id, { credits: newCredits }, actor);
    }

    protected prepareCreateData(
        data: CreateClientInput,
        actor?: ActorContext
    ): Prisma.ClientCreateInput {
        return {
            name: data.name,
            status: data.status ?? 'active',
            scope: data.scope ?? 'read_write',
            email: data.email,
            credits: data.credits ?? 10.0,
            organization: data.organizationId
                ? { connect: { id: data.organizationId } }
                : undefined,
            createdById: actor?.id,
            lastUpdatedById: actor?.id,
        };
    }

    protected prepareUpdateData(
        data: UpdateClientInput,
        actor?: ActorContext
    ): Prisma.ClientUpdateInput {
        const updateData: Prisma.ClientUpdateInput = {
            updatedAt: new Date(),
            lastUpdatedById: actor?.id,
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.scope !== undefined) updateData.scope = data.scope;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.credits !== undefined) updateData.credits = data.credits;

        return updateData;
    }
}

export const clientManager = new ClientManager();
export default clientManager;
