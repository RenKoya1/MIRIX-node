/**
 * Organization Manager
 * Provides CRUD operations for organizations
 */

import { Organization, Prisma } from '@prisma/client';
import { BaseManager, CacheConfig, ActorContext } from './base-manager.js';
import { RedisMemoryClient } from '../database/redis-client.js';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateOrganizationInput {
    name: string;
}

export interface UpdateOrganizationInput {
    name?: string;
}

// ============================================================================
// ORGANIZATION MANAGER
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

class OrganizationManager extends BaseManager<
    Organization,
    CreateOrganizationInput,
    UpdateOrganizationInput
> {
    protected readonly modelName = 'Organization';

    protected readonly cacheConfig: CacheConfig = {
        enabled: true,
        prefix: RedisMemoryClient.ORGANIZATION_PREFIX,
        ttl: 86400, // 24 hours
        useHash: true,
    };

    protected getDelegate(): AnyDelegate {
        return this.prisma.organization;
    }

    /**
     * Create a new organization
     */
    async create(
        data: CreateOrganizationInput,
        actor?: ActorContext
    ): Promise<Organization> {
        // Organizations don't require an existing organization context
        return super.create(data, actor);
    }

    /**
     * Find organization by name
     */
    async findByName(name: string): Promise<Organization | null> {
        return this.getDelegate().findFirst({
            where: {
                name,
                isDeleted: false,
            },
        });
    }

    /**
     * Get organization with all relationships loaded
     */
    async getWithRelations(
        id: string,
        _actor?: ActorContext
    ): Promise<Organization & {
        users: { id: string; name: string }[];
        clients: { id: string; name: string }[];
        agents: { id: string; name: string | null }[];
    }> {
        const org = await this.getDelegate().findFirst({
            where: this.buildWhereClause(id),
            include: {
                users: {
                    where: { isDeleted: false },
                    select: { id: true, name: true },
                    take: 100,
                },
                clients: {
                    where: { isDeleted: false },
                    select: { id: true, name: true },
                    take: 100,
                },
                agents: {
                    where: { isDeleted: false },
                    select: { id: true, name: true },
                    take: 100,
                },
            },
        });

        if (!org) {
            throw new Error(`Organization not found: ${id}`);
        }

        return org as Organization & {
            users: { id: string; name: string }[];
            clients: { id: string; name: string }[];
            agents: { id: string; name: string | null }[];
        };
    }

    /**
     * Get statistics for an organization
     */
    async getStats(
        id: string,
        _actor?: ActorContext
    ): Promise<{
        userCount: number;
        clientCount: number;
        agentCount: number;
        messageCount: number;
    }> {
        // Verify existence
        await this.read(id);

        const [userCount, clientCount, agentCount, messageCount] = await Promise.all([
            this.prisma.user.count({ where: { organizationId: id, isDeleted: false } }),
            this.prisma.client.count({ where: { organizationId: id, isDeleted: false } }),
            this.prisma.agent.count({ where: { organizationId: id, isDeleted: false } }),
            this.prisma.message.count({ where: { organizationId: id, isDeleted: false } }),
        ]);

        return { userCount, clientCount, agentCount, messageCount };
    }

    // ========================================================================
    // OVERRIDE METHODS
    // ========================================================================

    /**
     * Organizations don't have organizationId, so override where clause building
     */
    protected buildWhereClause(
        id: string,
        _actor?: ActorContext,
        includeDeleted = false
    ): Record<string, unknown> {
        const where: Record<string, unknown> = { id };

        if (!includeDeleted) {
            where.isDeleted = false;
        }

        return where;
    }

    protected buildListWhereClause(
        _actor?: ActorContext,
        options: { includeDeleted?: boolean; startDate?: Date; endDate?: Date } = {}
    ): Record<string, unknown> {
        const where: Record<string, unknown> = {};

        if (!options.includeDeleted) {
            where.isDeleted = false;
        }

        if (options.startDate || options.endDate) {
            where.createdAt = {};
            if (options.startDate) {
                (where.createdAt as Record<string, Date>).gte = options.startDate;
            }
            if (options.endDate) {
                (where.createdAt as Record<string, Date>).lte = options.endDate;
            }
        }

        return where;
    }

    protected prepareCreateData(
        data: CreateOrganizationInput,
        actor?: ActorContext
    ): Prisma.OrganizationCreateInput {
        return {
            name: data.name,
            createdById: actor?.id,
            lastUpdatedById: actor?.id,
        };
    }
}

// Singleton instance
export const organizationManager = new OrganizationManager();

export default organizationManager;
