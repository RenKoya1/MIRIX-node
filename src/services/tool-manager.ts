/**
 * Tool Manager
 * Provides CRUD operations for tools
 */

import { Tool, ToolType, ToolSourceType, Prisma } from '@prisma/client';
import { BaseManager, CacheConfig, ActorContext, ListOptions, ListResult } from './base-manager';
import { RedisMemoryClient } from '../database/redis-client';
import { ValidationError } from '../errors';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateToolInput {
    organizationId: string;
    name: string;
    description?: string;
    toolType?: ToolType;
    sourceType?: ToolSourceType;
    sourceCode?: string;
    jsonSchema?: Record<string, unknown>;
    tags?: unknown[];
    returnCharLimit?: number;
}

export interface UpdateToolInput {
    name?: string;
    description?: string;
    toolType?: ToolType;
    sourceType?: ToolSourceType;
    sourceCode?: string;
    jsonSchema?: Record<string, unknown>;
    tags?: unknown[];
    returnCharLimit?: number;
}

export interface ToolListOptions extends ListOptions {
    toolType?: ToolType;
    name?: string;
}

// ============================================================================
// TOOL MANAGER
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

class ToolManager extends BaseManager<
    Tool,
    CreateToolInput,
    UpdateToolInput
> {
    protected readonly modelName = 'Tool';

    protected readonly cacheConfig: CacheConfig = {
        enabled: true,
        prefix: RedisMemoryClient.TOOL_PREFIX,
        ttl: 3600,
        useHash: true,
    };

    protected getDelegate(): AnyDelegate {
        return this.prisma.tool;
    }

    async create(
        data: CreateToolInput,
        actor?: ActorContext
    ): Promise<Tool> {
        const org = await this.prisma.organization.findUnique({
            where: { id: data.organizationId },
        });
        if (!org) {
            throw new ValidationError('Organization not found', { field: 'organizationId' });
        }

        // Check for duplicate name in organization
        const existing = await this.findByName(data.name, data.organizationId);
        if (existing) {
            throw new ValidationError('Tool with this name already exists', { field: 'name' });
        }

        return super.create(data, actor);
    }

    async findByName(
        name: string,
        organizationId: string
    ): Promise<Tool | null> {
        return this.getDelegate().findFirst({
            where: {
                name,
                organizationId,
                isDeleted: false,
            },
        });
    }

    async getByType(
        toolType: ToolType,
        actor: ActorContext
    ): Promise<Tool[]> {
        return this.getDelegate().findMany({
            where: {
                organizationId: actor.organizationId,
                toolType,
                isDeleted: false,
            },
            orderBy: { name: 'asc' },
        });
    }

    async getAgentTools(
        agentId: string,
        actor?: ActorContext
    ): Promise<Tool[]> {
        const toolsAgents = await this.prisma.toolsAgents.findMany({
            where: { agentId },
            include: {
                tool: true,
            },
        });

        let tools = toolsAgents.map(ta => ta.tool).filter(t => !t.isDeleted);

        if (actor) {
            tools = tools.filter(t => t.organizationId === actor.organizationId);
        }

        return tools;
    }

    async listTools(
        actor: ActorContext,
        options: ToolListOptions = {}
    ): Promise<ListResult<Tool>> {
        const {
            cursor,
            limit = 50,
            sort = { field: 'createdAt', order: 'desc' },
            startDate,
            endDate,
            includeDeleted = false,
            toolType,
            name,
        } = options;

        const where: Prisma.ToolWhereInput = {
            organizationId: actor.organizationId,
        };

        if (!includeDeleted) {
            where.isDeleted = false;
        }

        if (toolType) {
            where.toolType = toolType;
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

    async getWithAgents(
        id: string,
        actor?: ActorContext
    ): Promise<Tool & { agents: { agentId: string }[] }> {
        const whereClause = this.buildWhereClause(id, actor);

        const tool = await this.getDelegate().findFirst({
            where: whereClause,
            include: {
                agents: {
                    select: { agentId: true },
                },
            },
        });

        if (!tool) {
            throw new Error(`Tool not found: ${id}`);
        }

        return tool;
    }

    async attachToAgent(
        toolId: string,
        agentId: string,
        actor?: ActorContext
    ): Promise<void> {
        await this.read(toolId, actor);

        await this.prisma.toolsAgents.upsert({
            where: {
                unique_agent_tool: { agentId, toolId },
            },
            create: { agentId, toolId },
            update: {},
        });

        this.logger.info({ toolId, agentId }, 'Attached tool to agent');
    }

    async detachFromAgent(
        toolId: string,
        agentId: string,
        actor?: ActorContext
    ): Promise<void> {
        await this.read(toolId, actor);

        await this.prisma.toolsAgents.delete({
            where: {
                unique_agent_tool: { agentId, toolId },
            },
        }).catch(() => {
            // Ignore if not found
        });

        this.logger.info({ toolId, agentId }, 'Detached tool from agent');
    }

    validateSchema(schema: Record<string, unknown>): boolean {
        if (!schema || typeof schema !== 'object') {
            return false;
        }
        return 'type' in schema;
    }

    protected prepareCreateData(
        data: CreateToolInput,
        actor?: ActorContext
    ): Prisma.ToolCreateInput {
        return {
            name: data.name,
            description: data.description,
            toolType: data.toolType ?? 'custom',
            sourceType: data.sourceType ?? 'json',
            sourceCode: data.sourceCode,
            jsonSchema: (data.jsonSchema ?? {}) as Prisma.InputJsonValue,
            tags: (data.tags ?? []) as Prisma.InputJsonValue,
            returnCharLimit: data.returnCharLimit,
            organization: data.organizationId
                ? { connect: { id: data.organizationId } }
                : undefined,
            createdById: actor?.id,
            lastUpdatedById: actor?.id,
        };
    }

    protected prepareUpdateData(
        data: UpdateToolInput,
        actor?: ActorContext
    ): Prisma.ToolUpdateInput {
        const updateData: Prisma.ToolUpdateInput = {
            updatedAt: new Date(),
            lastUpdatedById: actor?.id,
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.toolType !== undefined) updateData.toolType = data.toolType;
        if (data.sourceType !== undefined) updateData.sourceType = data.sourceType;
        if (data.sourceCode !== undefined) updateData.sourceCode = data.sourceCode;
        if (data.jsonSchema !== undefined) updateData.jsonSchema = data.jsonSchema as Prisma.InputJsonValue;
        if (data.tags !== undefined) updateData.tags = data.tags as Prisma.InputJsonValue;
        if (data.returnCharLimit !== undefined) updateData.returnCharLimit = data.returnCharLimit;

        return updateData;
    }
}

export const toolManager = new ToolManager();
export default toolManager;
