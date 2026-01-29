/**
 * Agent Routes
 * REST API endpoints for agent operations
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { AgentType } from '@prisma/client';
import { agentManager, CreateAgentInput, UpdateAgentInput } from '../../services/agent-manager';
import { createAgent } from '../../agent/index';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../../errors';
import { logger } from '../../log';

// Helper to format Zod errors
function formatZodErrors(errors: z.ZodIssue[]): string {
    return errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}

export const agentRoutes = new Hono();

// Apply auth middleware to all routes
agentRoutes.use('*', authMiddleware);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateAgentSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    agentType: z.enum(['main_agent', 'meta_agent', 'sub_agent', 'memory_agent']).optional(),
    parentId: z.string().uuid().optional(),
    system: z.string().optional(),
    llmConfig: z.object({
        model: z.string(),
        modelEndpointType: z.string().optional(),
        modelEndpoint: z.string().optional(),
        contextWindow: z.number().optional(),
        maxTokens: z.number().optional(),
        temperature: z.number().optional(),
    }).optional(),
    toolIds: z.array(z.string().uuid()).optional(),
});

const UpdateAgentSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    system: z.string().optional(),
    llmConfig: z.object({
        model: z.string(),
        modelEndpointType: z.string().optional(),
        modelEndpoint: z.string().optional(),
        contextWindow: z.number().optional(),
        maxTokens: z.number().optional(),
        temperature: z.number().optional(),
    }).optional(),
});

const ChatRequestSchema = z.object({
    message: z.string().min(1),
});

// ============================================================================
// LIST & CREATE AGENTS
// ============================================================================

/**
 * List agents
 */
agentRoutes.get('/', requirePermission('read_only'), async (c) => {
    const auth = c.get('auth');
    const query = c.req.query();

    const options = {
        limit: query.limit ? parseInt(query.limit, 10) : 50,
        cursor: query.cursor,
        agentType: query.agent_type as CreateAgentInput['agentType'],
        parentId: query.parent_id,
    };

    const result = await agentManager.listAgents(
        { id: auth.clientId, organizationId: auth.organizationId },
        options
    );

    return c.json({
        agents: result.items,
        total: result.total,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
    });
});

/**
 * Create a new agent
 */
agentRoutes.post('/', requirePermission('all'), async (c) => {
    const auth = c.get('auth');
    const body = await c.req.json();

    const parsed = CreateAgentSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Invalid request body', {
            details: formatZodErrors(parsed.error.errors),
        });
    }

    const createData: CreateAgentInput = {
        name: parsed.data.name,
        description: parsed.data.description,
        agentType: parsed.data.agentType as AgentType | undefined,
        parentId: parsed.data.parentId,
        system: parsed.data.system,
        toolIds: parsed.data.toolIds,
        organizationId: auth.organizationId,
    };

    const agent = await agentManager.create(
        createData,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    logger.info({ agentId: agent.id }, 'Agent created');

    return c.json({ agent }, 201);
});

// ============================================================================
// AGENT OPERATIONS
// ============================================================================

/**
 * Get agent by ID
 */
agentRoutes.get('/:id', requirePermission('read_only'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');

    const agent = await agentManager.getWithRelations(
        id,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    return c.json({ agent });
});

/**
 * Update agent
 */
agentRoutes.patch('/:id', requirePermission('all'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');
    const body = await c.req.json();

    const parsed = UpdateAgentSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Invalid request body', {
            details: formatZodErrors(parsed.error.errors),
        });
    }

    const agent = await agentManager.update(
        id,
        parsed.data as UpdateAgentInput,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    logger.info({ agentId: id }, 'Agent updated');

    return c.json({ agent });
});

/**
 * Delete agent
 */
agentRoutes.delete('/:id', requirePermission('all'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');

    await agentManager.delete(
        id,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    logger.info({ agentId: id }, 'Agent deleted');

    return c.json({ deleted: true });
});

// ============================================================================
// CHAT
// ============================================================================

/**
 * Send a message to an agent and get a response
 */
agentRoutes.post('/:id/chat', requirePermission('all'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');
    const body = await c.req.json();

    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Invalid request body', {
            details: formatZodErrors(parsed.error.errors),
        });
    }

    try {
        const agent = await createAgent(id);

        const result = await agent.chat(
            parsed.data.message,
            auth.userId ?? auth.clientId,
            { clientId: auth.clientId }
        );

        return c.json({
            agentId: id,
            result: {
                success: result.success,
                message: result.message,
                stepCount: result.stepCount,
                tokenUsage: result.tokenUsage,
                executionTimeMs: result.executionTimeMs,
                error: result.error,
            },
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Agent not found')) {
            throw new NotFoundError('Agent', id);
        }
        throw error;
    }
});

// ============================================================================
// TOOLS
// ============================================================================

/**
 * Get tools attached to an agent
 */
agentRoutes.get('/:id/tools', requirePermission('read_only'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');

    const tools = await agentManager.getTools(
        id,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    return c.json({ tools });
});

/**
 * Attach tools to an agent
 */
agentRoutes.post('/:id/tools', requirePermission('all'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');
    const body = await c.req.json();

    const schema = z.object({ toolIds: z.array(z.string().uuid()) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Invalid request body', {
            details: formatZodErrors(parsed.error.errors),
        });
    }

    await agentManager.attachTools(
        id,
        parsed.data.toolIds,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    return c.json({ success: true });
});

/**
 * Set tools for an agent (replaces existing)
 */
agentRoutes.put('/:id/tools', requirePermission('all'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');
    const body = await c.req.json();

    const schema = z.object({ toolIds: z.array(z.string().uuid()) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Invalid request body', {
            details: formatZodErrors(parsed.error.errors),
        });
    }

    await agentManager.setTools(
        id,
        parsed.data.toolIds,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    return c.json({ success: true });
});

/**
 * Detach tools from an agent
 */
agentRoutes.delete('/:id/tools', requirePermission('all'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');
    const body = await c.req.json();

    const schema = z.object({ toolIds: z.array(z.string().uuid()) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Invalid request body', {
            details: formatZodErrors(parsed.error.errors),
        });
    }

    await agentManager.detachTools(
        id,
        parsed.data.toolIds,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    return c.json({ success: true });
});

// ============================================================================
// CORE MEMORY
// ============================================================================

/**
 * Get core memory blocks
 */
agentRoutes.get('/:id/memory', requirePermission('read_only'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');

    const blocks = await agentManager.getCoreMemory(
        id,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    return c.json({ blocks });
});

/**
 * Update a core memory block
 */
agentRoutes.patch('/:id/memory/:label', requirePermission('all'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');
    const label = c.req.param('label');
    const body = await c.req.json();

    const schema = z.object({ value: z.string() });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Invalid request body', {
            details: formatZodErrors(parsed.error.errors),
        });
    }

    const block = await agentManager.updateCoreMemoryBlock(
        id,
        label,
        parsed.data.value,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    return c.json({ block });
});

// ============================================================================
// MESSAGES
// ============================================================================

/**
 * Get agent messages
 */
agentRoutes.get('/:id/messages', requirePermission('read_only'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');
    const query = c.req.query();

    const options = {
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        before: query.before ? new Date(query.before) : undefined,
    };

    const messages = await agentManager.getMessages(
        id,
        { id: auth.clientId, organizationId: auth.organizationId },
        options
    );

    return c.json({ messages });
});

// ============================================================================
// HIERARCHY
// ============================================================================

/**
 * Get child agents
 */
agentRoutes.get('/:id/children', requirePermission('read_only'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');

    const children = await agentManager.getChildren(
        id,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    return c.json({ children });
});

/**
 * Get agent hierarchy
 */
agentRoutes.get('/:id/hierarchy', requirePermission('read_only'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');

    const hierarchy = await agentManager.getHierarchy(
        id,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    return c.json(hierarchy);
});

export default agentRoutes;
