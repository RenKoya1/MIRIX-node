/**
 * Agent Manager
 * Provides CRUD operations for agents with tool attachment, state management,
 * and client-level isolation.
 */

import { Prisma } from '@prisma/client';
import type { Agent, AgentType, Tool, Block } from '@prisma/client';
import { BaseManager, CacheConfig, ActorContext, ListOptions, ListResult } from './base-manager';
import { RedisMemoryClient } from '../database/redis-client';
import { ValidationError, NotFoundError } from '../errors';
import { LLMConfigSchema } from '../schemas/llm_config';
import type { LLMConfig } from '../schemas/llm_config';
import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Tool rule types
 */
export const ToolRuleType = {
    RUN_FIRST: 'run_first',
    EXIT_LOOP: 'exit_loop',
    CONTINUE_LOOP: 'continue_loop',
    CONDITIONAL: 'conditional',
    CONSTRAIN_CHILD_TOOLS: 'constrain_child_tools',
    MAX_COUNT_PER_STEP: 'max_count_per_step',
    PARENT_LAST_TOOL: 'parent_last_tool',
} as const;

export type ToolRuleType = (typeof ToolRuleType)[keyof typeof ToolRuleType];

/**
 * Tool rule definition
 */
export interface ToolRule {
    type: ToolRuleType;
    toolName: string;
    children?: string[];
    maxCount?: number;
}

/**
 * Embedding configuration
 */
export interface EmbeddingConfig {
    model: string;
    modelEndpointType: string;
    modelEndpoint?: string;
    embeddingDim: number;
}

/**
 * Memory configuration
 */
export interface MemoryConfig {
    fadeAfterDays?: number;
    expireAfterDays?: number;
}

export interface CreateAgentInput {
    name?: string;
    description?: string;
    agentType?: AgentType;
    parentId?: string;
    system?: string;
    llmConfig?: LLMConfig;
    topicExtractionLlmConfig?: LLMConfig;
    embeddingConfig?: EmbeddingConfig;
    toolRules?: ToolRule[];
    mcpTools?: string[];
    memoryConfig?: MemoryConfig;
    organizationId: string;
    toolIds?: string[];
}

export interface UpdateAgentInput {
    name?: string;
    description?: string;
    system?: string;
    llmConfig?: LLMConfig;
    topicExtractionLlmConfig?: LLMConfig;
    embeddingConfig?: EmbeddingConfig;
    toolRules?: ToolRule[];
    mcpTools?: string[];
    memoryConfig?: MemoryConfig;
    messageIds?: string[];
}

export interface AgentListOptions extends ListOptions {
    agentType?: AgentType;
    parentId?: string;
    includeChildren?: boolean;
}

/**
 * Agent with loaded relationships
 */
export interface AgentWithRelations extends Agent {
    tools: Tool[];
    coreMemory: Block[];
    messages?: { id: string }[];
}

// ============================================================================
// AGENT MANAGER
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

class AgentManager extends BaseManager<
    Agent,
    CreateAgentInput,
    UpdateAgentInput
> {
    protected readonly modelName = 'Agent';

    protected readonly cacheConfig: CacheConfig = {
        enabled: true,
        prefix: RedisMemoryClient.AGENT_PREFIX,
        ttl: 3600, // 1 hour
        useHash: true,
    };

    protected getDelegate(): AnyDelegate {
        return this.prisma.agent;
    }

    /**
     * Create a new agent
     */
    async create(
        data: CreateAgentInput,
        actor?: ActorContext
    ): Promise<Agent> {
        // Validate LLM config if provided
        if (data.llmConfig) {
            try {
                LLMConfigSchema.parse(data.llmConfig);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError('Invalid LLM config', {
                        details: JSON.stringify(error.errors),
                    });
                }
                throw error;
            }
        }

        // Validate parent agent if provided
        if (data.parentId) {
            const parent = await this.getDelegate().findUnique({
                where: { id: data.parentId },
            });
            if (!parent) {
                throw new ValidationError('Parent agent not found', { field: 'parentId' });
            }
        }

        // Validate tools if provided
        if (data.toolIds && data.toolIds.length > 0) {
            const tools = await this.prisma.tool.findMany({
                where: {
                    id: { in: data.toolIds },
                    isDeleted: false,
                },
            });
            if (tools.length !== data.toolIds.length) {
                throw new ValidationError('Some tools not found', {
                    details: `Requested: ${data.toolIds.length}, Found: ${tools.length}`,
                });
            }
        }

        const agent = await super.create(data, actor);

        // Attach tools if provided
        if (data.toolIds && data.toolIds.length > 0) {
            await this.attachTools(agent.id, data.toolIds, actor);
        }

        return agent;
    }

    /**
     * Get agent with all relationships loaded
     */
    async getWithRelations(
        id: string,
        actor?: ActorContext
    ): Promise<AgentWithRelations> {
        const whereClause = this.buildWhereClause(id, actor);

        const agent = await this.getDelegate().findFirst({
            where: whereClause,
            include: {
                tools: {
                    include: {
                        tool: true,
                    },
                },
                coreMemory: {
                    where: { isDeleted: false },
                },
                messages: {
                    where: { isDeleted: false },
                    select: { id: true },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!agent) {
            throw new NotFoundError('Agent', id);
        }

        // Transform tools relationship
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tools = (agent.tools || []).map((ta: any) => ta.tool);

        return {
            ...agent,
            tools,
        } as AgentWithRelations;
    }

    /**
     * List agents with additional filters
     */
    async listAgents(
        actor: ActorContext,
        options: AgentListOptions = {}
    ): Promise<ListResult<Agent>> {
        const {
            cursor,
            limit = 50,
            sort = { field: 'createdAt', order: 'desc' },
            startDate,
            endDate,
            includeDeleted = false,
            agentType,
            parentId,
            includeChildren = false,
        } = options;

        // Build where clause with client-level isolation
        const where: Prisma.AgentWhereInput = {
            organizationId: actor.organizationId,
            createdById: actor.id, // Client-level isolation
        };

        if (!includeDeleted) {
            where.isDeleted = false;
        }

        if (agentType) {
            where.agentType = agentType;
        }

        if (parentId !== undefined) {
            where.parentId = parentId;
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
                include: includeChildren ? {
                    tools: { include: { tool: true } },
                    coreMemory: { where: { isDeleted: false } },
                } : undefined,
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

    // ========================================================================
    // TOOL OPERATIONS
    // ========================================================================

    /**
     * Attach tools to an agent
     */
    async attachTools(
        agentId: string,
        toolIds: string[],
        actor?: ActorContext
    ): Promise<void> {
        // Verify agent access
        await this.read(agentId, actor);

        // Verify tools exist
        const tools = await this.prisma.tool.findMany({
            where: {
                id: { in: toolIds },
                isDeleted: false,
            },
        });

        if (tools.length !== toolIds.length) {
            const foundIds = new Set(tools.map((t: Tool) => t.id));
            const missingIds = toolIds.filter((id) => !foundIds.has(id));
            throw new ValidationError('Some tools not found', {
                details: `Missing: ${missingIds.join(', ')}`,
            });
        }

        // Create tool-agent associations
        await this.prisma.toolsAgents.createMany({
            data: toolIds.map((toolId) => ({
                agentId,
                toolId,
            })),
            skipDuplicates: true,
        });

        // Invalidate cache
        await this.removeFromCache(agentId);

        this.logger.info({ agentId, toolIds }, 'Attached tools to agent');
    }

    /**
     * Detach tools from an agent
     */
    async detachTools(
        agentId: string,
        toolIds: string[],
        actor?: ActorContext
    ): Promise<void> {
        // Verify agent access
        await this.read(agentId, actor);

        await this.prisma.toolsAgents.deleteMany({
            where: {
                agentId,
                toolId: { in: toolIds },
            },
        });

        // Invalidate cache
        await this.removeFromCache(agentId);

        this.logger.info({ agentId, toolIds }, 'Detached tools from agent');
    }

    /**
     * Get tools for an agent
     */
    async getTools(
        agentId: string,
        actor?: ActorContext
    ): Promise<Tool[]> {
        // Verify agent access
        await this.read(agentId, actor);

        const toolsAgents = await this.prisma.toolsAgents.findMany({
            where: { agentId },
            include: { tool: true },
        });

        return toolsAgents
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((ta: any) => !ta.tool.isDeleted)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((ta: any) => ta.tool);
    }

    /**
     * Set tools for an agent (replaces existing)
     */
    async setTools(
        agentId: string,
        toolIds: string[],
        actor?: ActorContext
    ): Promise<void> {
        // Verify agent access
        await this.read(agentId, actor);

        // Remove all existing tools
        await this.prisma.toolsAgents.deleteMany({
            where: { agentId },
        });

        // Attach new tools
        if (toolIds.length > 0) {
            await this.attachTools(agentId, toolIds, actor);
        }

        this.logger.info({ agentId, toolIds }, 'Set tools for agent');
    }

    // ========================================================================
    // MESSAGE OPERATIONS
    // ========================================================================

    /**
     * Update agent's message IDs
     */
    async updateMessageIds(
        agentId: string,
        messageIds: string[],
        actor?: ActorContext
    ): Promise<Agent> {
        return this.update(agentId, { messageIds }, actor);
    }

    /**
     * Add a message ID to agent's message list
     */
    async addMessageId(
        agentId: string,
        messageId: string,
        actor?: ActorContext
    ): Promise<Agent> {
        const agent = await this.read(agentId, actor);
        const currentIds = (agent.messageIds as string[]) || [];

        if (!currentIds.includes(messageId)) {
            currentIds.push(messageId);
        }

        return this.updateMessageIds(agentId, currentIds, actor);
    }

    /**
     * Get messages for an agent
     */
    async getMessages(
        agentId: string,
        actor?: ActorContext,
        options: { limit?: number; before?: Date } = {}
    ): Promise<{ id: string; role: string; text: string | null; createdAt: Date }[]> {
        // Verify agent access
        await this.read(agentId, actor);

        const where: Prisma.MessageWhereInput = {
            agentId,
            isDeleted: false,
        };

        if (options.before) {
            where.createdAt = { lt: options.before };
        }

        return this.prisma.message.findMany({
            where,
            select: {
                id: true,
                role: true,
                text: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: options.limit ?? 100,
        });
    }

    // ========================================================================
    // CORE MEMORY (BLOCK) OPERATIONS
    // ========================================================================

    /**
     * Get core memory blocks for an agent
     */
    async getCoreMemory(
        agentId: string,
        actor?: ActorContext
    ): Promise<Block[]> {
        // Verify agent access
        await this.read(agentId, actor);

        return this.prisma.block.findMany({
            where: {
                agentId,
                isDeleted: false,
            },
            orderBy: { label: 'asc' },
        });
    }

    /**
     * Update a core memory block
     */
    async updateCoreMemoryBlock(
        agentId: string,
        label: string,
        value: string,
        actor?: ActorContext
    ): Promise<Block> {
        // Verify agent access
        await this.read(agentId, actor);

        const block = await this.prisma.block.findFirst({
            where: {
                agentId,
                label,
                isDeleted: false,
            },
        });

        if (!block) {
            throw new NotFoundError('Block', `${agentId}/${label}`);
        }

        // Validate value length
        if (value.length > block.limit) {
            throw new ValidationError('Block value exceeds limit', {
                details: `Limit: ${block.limit}, Actual: ${value.length}`,
            });
        }

        return this.prisma.block.update({
            where: { id: block.id },
            data: {
                value,
                updatedAt: new Date(),
                lastUpdatedById: actor?.id,
            },
        });
    }

    // ========================================================================
    // CHILD AGENT OPERATIONS
    // ========================================================================

    /**
     * Get child agents (sub-agents)
     */
    async getChildren(
        agentId: string,
        actor?: ActorContext
    ): Promise<Agent[]> {
        // Verify agent access
        await this.read(agentId, actor);

        return this.getDelegate().findMany({
            where: {
                parentId: agentId,
                isDeleted: false,
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    /**
     * Get the full agent hierarchy (parent and all descendants)
     */
    async getHierarchy(
        agentId: string,
        actor?: ActorContext
    ): Promise<{
        agent: Agent;
        children: Agent[];
        parent?: Agent;
    }> {
        const agent = await this.read(agentId, actor);
        const children = await this.getChildren(agentId, actor);

        let parent: Agent | undefined;
        if (agent.parentId) {
            parent = await this.read(agent.parentId, actor);
        }

        return { agent, children, parent };
    }

    // ========================================================================
    // STATE OPERATIONS
    // ========================================================================

    /**
     * Update LLM config for an agent
     */
    async updateLLMConfig(
        agentId: string,
        llmConfig: LLMConfig,
        actor?: ActorContext
    ): Promise<Agent> {
        // Validate LLM config
        try {
            LLMConfigSchema.parse(llmConfig);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError('Invalid LLM config', {
                    details: JSON.stringify(error.errors),
                });
            }
            throw error;
        }

        return this.update(agentId, { llmConfig }, actor);
    }

    /**
     * Update tool rules for an agent
     */
    async updateToolRules(
        agentId: string,
        toolRules: ToolRule[],
        actor?: ActorContext
    ): Promise<Agent> {
        return this.update(agentId, { toolRules }, actor);
    }

    /**
     * Update system prompt for an agent
     */
    async updateSystemPrompt(
        agentId: string,
        system: string,
        actor?: ActorContext
    ): Promise<Agent> {
        return this.update(agentId, { system }, actor);
    }

    // ========================================================================
    // OVERRIDE METHODS
    // ========================================================================

    /**
     * Override to apply client-level isolation for agents
     */
    protected buildWhereClause(
        id: string,
        actor?: ActorContext,
        includeDeleted = false
    ): Record<string, unknown> {
        const where: Record<string, unknown> = { id };

        if (!includeDeleted) {
            where.isDeleted = false;
        }

        if (actor) {
            where.organizationId = actor.organizationId;
            where.createdById = actor.id; // Client-level isolation
        }

        return where;
    }

    protected prepareCreateData(
        data: CreateAgentInput,
        actor?: ActorContext
    ): Prisma.AgentCreateInput {
        return {
            name: data.name,
            description: data.description,
            agentType: data.agentType,
            parentId: data.parentId,
            system: data.system,
            llmConfig: data.llmConfig as unknown as Prisma.InputJsonValue,
            topicExtractionLlmConfig: data.topicExtractionLlmConfig as unknown as Prisma.InputJsonValue,
            embeddingConfig: data.embeddingConfig as unknown as Prisma.InputJsonValue,
            toolRules: data.toolRules as unknown as Prisma.InputJsonValue,
            mcpTools: data.mcpTools as unknown as Prisma.InputJsonValue,
            memoryConfig: data.memoryConfig as unknown as Prisma.InputJsonValue,
            messageIds: [],
            organization: {
                connect: { id: data.organizationId },
            },
            createdById: actor?.id,
            lastUpdatedById: actor?.id,
        };
    }

    protected prepareUpdateData(
        data: UpdateAgentInput,
        actor?: ActorContext
    ): Prisma.AgentUpdateInput {
        const updateData: Prisma.AgentUpdateInput = {
            updatedAt: new Date(),
            lastUpdatedById: actor?.id,
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.system !== undefined) updateData.system = data.system;
        if (data.llmConfig !== undefined) {
            updateData.llmConfig = data.llmConfig as unknown as Prisma.InputJsonValue;
        }
        if (data.topicExtractionLlmConfig !== undefined) {
            updateData.topicExtractionLlmConfig = data.topicExtractionLlmConfig as unknown as Prisma.InputJsonValue;
        }
        if (data.embeddingConfig !== undefined) {
            updateData.embeddingConfig = data.embeddingConfig as unknown as Prisma.InputJsonValue;
        }
        if (data.toolRules !== undefined) {
            updateData.toolRules = data.toolRules as unknown as Prisma.InputJsonValue;
        }
        if (data.mcpTools !== undefined) {
            updateData.mcpTools = data.mcpTools as unknown as Prisma.InputJsonValue;
        }
        if (data.memoryConfig !== undefined) {
            updateData.memoryConfig = data.memoryConfig as unknown as Prisma.InputJsonValue;
        }
        if (data.messageIds !== undefined) updateData.messageIds = data.messageIds;

        return updateData;
    }

    /**
     * Custom serialization for agent cache
     */
    protected serializeCacheData(data: Agent): Record<string, unknown> {
        const serialized = super.serializeCacheData(data);

        // Ensure JSON fields are stringified
        if (serialized.llmConfig) {
            serialized.llmConfig = JSON.stringify(serialized.llmConfig);
        }
        if (serialized.embeddingConfig) {
            serialized.embeddingConfig = JSON.stringify(serialized.embeddingConfig);
        }
        if (serialized.toolRules) {
            serialized.toolRules = JSON.stringify(serialized.toolRules);
        }
        if (serialized.messageIds) {
            serialized.messageIds = JSON.stringify(serialized.messageIds);
        }
        if (serialized.mcpTools) {
            serialized.mcpTools = JSON.stringify(serialized.mcpTools);
        }
        if (serialized.memoryConfig) {
            serialized.memoryConfig = JSON.stringify(serialized.memoryConfig);
        }

        return serialized;
    }
}

// Singleton instance
export const agentManager = new AgentManager();

export default agentManager;
