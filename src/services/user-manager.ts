/**
 * User Manager
 * Provides CRUD operations for users
 */

import { User, Prisma } from '@prisma/client';
import { BaseManager, CacheConfig, ActorContext, ListOptions, ListResult } from './base-manager';
import { RedisMemoryClient } from '../database/redis-client';
import { ValidationError } from '../errors';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateUserInput {
    name: string;
    status?: string;
    timezone?: string;
    isAdmin?: boolean;
    organizationId: string;
    clientId?: string;
}

export interface UpdateUserInput {
    name?: string;
    status?: string;
    timezone?: string;
    isAdmin?: boolean;
    lastSelfReflectionTime?: Date;
}

export interface UserListOptions extends ListOptions {
    status?: string;
    isAdmin?: boolean;
    clientId?: string;
}

// ============================================================================
// USER MANAGER
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

class UserManager extends BaseManager<
    User,
    CreateUserInput,
    UpdateUserInput
> {
    protected readonly modelName = 'User';

    protected readonly cacheConfig: CacheConfig = {
        enabled: true,
        prefix: RedisMemoryClient.USER_PREFIX,
        ttl: 7200, // 2 hours
        useHash: true,
    };

    protected getDelegate(): AnyDelegate {
        return this.prisma.user;
    }

    /**
     * Create a new user
     */
    async create(
        data: CreateUserInput,
        actor?: ActorContext
    ): Promise<User> {
        // Validate organization exists
        const org = await this.prisma.organization.findUnique({
            where: { id: data.organizationId },
        });
        if (!org) {
            throw new ValidationError('Organization not found', { field: 'organizationId' });
        }

        return super.create(data, actor);
    }

    /**
     * Find user by name within an organization
     */
    async findByName(
        name: string,
        organizationId: string
    ): Promise<User | null> {
        return this.getDelegate().findFirst({
            where: {
                name,
                organizationId,
                isDeleted: false,
            },
        });
    }

    /**
     * List users with additional filters
     */
    async listUsers(
        actor: ActorContext,
        options: UserListOptions = {}
    ): Promise<ListResult<User>> {
        const {
            cursor,
            limit = 50,
            sort = { field: 'createdAt', order: 'desc' },
            startDate,
            endDate,
            includeDeleted = false,
            status,
            isAdmin,
            clientId,
        } = options;

        // Build where clause
        const where: Prisma.UserWhereInput = {
            organizationId: actor.organizationId,
        };

        if (!includeDeleted) {
            where.isDeleted = false;
        }

        if (status) {
            where.status = status;
        }

        if (isAdmin !== undefined) {
            where.isAdmin = isAdmin;
        }

        if (clientId) {
            where.clientId = clientId;
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = startDate;
            }
            if (endDate) {
                where.createdAt.lte = endDate;
            }
        }

        // Build cursor pagination
        let cursorClause = undefined;
        if (cursor) {
            cursorClause = { id: cursor };
        }

        // Execute query
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
        if (hasMore) {
            items.pop();
        }

        const nextCursor = hasMore && items.length > 0
            ? items[items.length - 1].id
            : undefined;

        return {
            items,
            total,
            hasMore,
            nextCursor,
        };
    }

    /**
     * Get user with relationships
     */
    async getWithRelations(
        id: string,
        actor?: ActorContext
    ): Promise<User & {
        organization: { id: string; name: string } | null;
        client: { id: string; name: string } | null;
    }> {
        const whereClause = this.buildWhereClause(id, actor);

        const user = await this.getDelegate().findFirst({
            where: whereClause,
            include: {
                organization: {
                    select: { id: true, name: true },
                },
                client: {
                    select: { id: true, name: true },
                },
            },
        });

        if (!user) {
            throw new Error(`User not found: ${id}`);
        }

        return user as User & {
            organization: { id: string; name: string } | null;
            client: { id: string; name: string } | null;
        };
    }

    /**
     * Update user's last self-reflection time
     */
    async updateLastSelfReflectionTime(
        id: string,
        actor?: ActorContext
    ): Promise<User> {
        return this.update(
            id,
            { lastSelfReflectionTime: new Date() },
            actor
        );
    }

    /**
     * Get admin users for a client
     */
    async getAdminUsers(
        clientId: string,
        actor: ActorContext
    ): Promise<User[]> {
        return this.getDelegate().findMany({
            where: {
                clientId,
                organizationId: actor.organizationId,
                isAdmin: true,
                isDeleted: false,
            },
        });
    }

    /**
     * Count users by status
     */
    async countByStatus(
        actor: ActorContext
    ): Promise<Record<string, number>> {
        const results = await this.prisma.$queryRaw<{ status: string; count: bigint }[]>`
            SELECT status, COUNT(*) as count
            FROM users
            WHERE organization_id = ${actor.organizationId}
              AND is_deleted = false
            GROUP BY status
        `;

        const counts: Record<string, number> = {};
        for (const row of results) {
            counts[row.status] = Number(row.count);
        }

        return counts;
    }

    // ========================================================================
    // OVERRIDE METHODS
    // ========================================================================

    protected prepareCreateData(
        data: CreateUserInput,
        actor?: ActorContext
    ): Prisma.UserCreateInput {
        return {
            name: data.name,
            status: data.status ?? 'active',
            timezone: data.timezone ?? 'UTC',
            isAdmin: data.isAdmin ?? false,
            organization: data.organizationId
                ? { connect: { id: data.organizationId } }
                : undefined,
            client: data.clientId
                ? { connect: { id: data.clientId } }
                : undefined,
            createdById: actor?.id,
            lastUpdatedById: actor?.id,
        };
    }

    protected prepareUpdateData(
        data: UpdateUserInput,
        actor?: ActorContext
    ): Prisma.UserUpdateInput {
        const updateData: Prisma.UserUpdateInput = {
            updatedAt: new Date(),
            lastUpdatedById: actor?.id,
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.timezone !== undefined) updateData.timezone = data.timezone;
        if (data.isAdmin !== undefined) updateData.isAdmin = data.isAdmin;
        if (data.lastSelfReflectionTime !== undefined) {
            updateData.lastSelfReflectionTime = data.lastSelfReflectionTime;
        }

        return updateData;
    }
}

// Singleton instance
export const userManager = new UserManager();

export default userManager;
