/**
 * Message Routes
 * REST API endpoints for message operations
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { messageManager, CreateMessageInput } from '../../services/message-manager';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { ValidationError } from '../../errors';
import { logger } from '../../log';
import { randomUUID } from 'crypto';

// Helper to format Zod errors
function formatZodErrors(errors: z.ZodIssue[]): string {
    return errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}

export const messageRoutes = new Hono();

// Apply auth middleware to all routes
messageRoutes.use('*', authMiddleware);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateMessageSchema = z.object({
    agentId: z.string().uuid(),
    role: z.enum(['user', 'assistant', 'system', 'tool']),
    text: z.string().optional(),
    content: z.unknown().optional(),
    name: z.string().optional(),
    toolCalls: z.unknown().optional(),
    toolCallId: z.string().optional(),
    model: z.string().optional(),
    otid: z.string().optional(),
    groupId: z.string().optional(),
});

const ListMessagesSchema = z.object({
    agentId: z.string().uuid().optional(),
    role: z.enum(['user', 'assistant', 'system', 'tool']).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    cursor: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
});

// ============================================================================
// LIST & CREATE MESSAGES
// ============================================================================

/**
 * List messages
 */
messageRoutes.get('/', requirePermission('read_only'), async (c) => {
    const auth = c.get('auth');
    const query = c.req.query();

    const parsed = ListMessagesSchema.safeParse(query);
    if (!parsed.success) {
        throw new ValidationError('Invalid query parameters', {
            details: formatZodErrors(parsed.error.errors),
        });
    }

    const result = await messageManager.listMessages(
        { id: auth.clientId, organizationId: auth.organizationId },
        {
            limit: parsed.data.limit ?? 50,
            cursor: parsed.data.cursor,
            agentId: parsed.data.agentId,
            role: parsed.data.role,
            startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
            endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
        }
    );

    return c.json({
        messages: result.items,
        total: result.total,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
    });
});

/**
 * Create a new message
 */
messageRoutes.post('/', requirePermission('all'), async (c) => {
    const auth = c.get('auth');
    const body = await c.req.json();

    const parsed = CreateMessageSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Invalid request body', {
            details: formatZodErrors(parsed.error.errors),
        });
    }

    const createData: CreateMessageInput = {
        id: randomUUID(),
        organizationId: auth.organizationId,
        userId: auth.userId ?? auth.clientId,
        agentId: parsed.data.agentId,
        role: parsed.data.role,
        text: parsed.data.text,
        content: parsed.data.content,
        name: parsed.data.name,
        toolCalls: parsed.data.toolCalls,
        toolCallId: parsed.data.toolCallId,
        model: parsed.data.model,
        otid: parsed.data.otid,
        groupId: parsed.data.groupId,
        clientId: auth.clientId,
    };

    const message = await messageManager.create(
        createData,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    logger.info({ messageId: message.id, agentId: parsed.data.agentId }, 'Message created');

    return c.json({ message }, 201);
});

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

/**
 * Get message by ID
 */
messageRoutes.get('/:id', requirePermission('read_only'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');

    const message = await messageManager.getWithRelations(
        id,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    return c.json({ message });
});

/**
 * Update message
 */
messageRoutes.patch('/:id', requirePermission('all'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');
    const body = await c.req.json();

    const schema = z.object({
        text: z.string().optional(),
        content: z.unknown().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Invalid request body', {
            details: formatZodErrors(parsed.error.errors),
        });
    }

    const message = await messageManager.update(
        id,
        parsed.data,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    logger.info({ messageId: id }, 'Message updated');

    return c.json({ message });
});

/**
 * Delete message
 */
messageRoutes.delete('/:id', requirePermission('all'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');

    await messageManager.delete(
        id,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    logger.info({ messageId: id }, 'Message deleted');

    return c.json({ deleted: true });
});

// ============================================================================
// AGENT MESSAGE OPERATIONS
// ============================================================================

/**
 * Get conversation for an agent
 */
messageRoutes.get('/agent/:agentId/conversation', requirePermission('read_only'), async (c) => {
    const auth = c.get('auth');
    const agentId = c.req.param('agentId');
    const query = c.req.query();

    const limit = query.limit ? parseInt(query.limit, 10) : 100;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const messages = await messageManager.getConversation(
        agentId,
        { id: auth.clientId, organizationId: auth.organizationId },
        { limit, offset }
    );

    return c.json({ messages });
});

/**
 * Get latest messages for an agent
 */
messageRoutes.get('/agent/:agentId/latest', requirePermission('read_only'), async (c) => {
    const auth = c.get('auth');
    const agentId = c.req.param('agentId');
    const query = c.req.query();

    const limit = query.limit ? parseInt(query.limit, 10) : 10;

    const messages = await messageManager.getLatestMessages(
        agentId,
        limit,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    return c.json({ messages });
});

/**
 * Count messages for an agent
 */
messageRoutes.get('/agent/:agentId/count', requirePermission('read_only'), async (c) => {
    const auth = c.get('auth');
    const agentId = c.req.param('agentId');

    const count = await messageManager.countAgentMessages(
        agentId,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    return c.json({ count });
});

/**
 * Delete all messages for an agent
 */
messageRoutes.delete('/agent/:agentId', requirePermission('all'), async (c) => {
    const auth = c.get('auth');
    const agentId = c.req.param('agentId');

    const count = await messageManager.deleteAgentMessages(
        agentId,
        { id: auth.clientId, organizationId: auth.organizationId }
    );

    logger.info({ agentId, count }, 'Agent messages deleted');

    return c.json({ deleted: true, count });
});

export default messageRoutes;
