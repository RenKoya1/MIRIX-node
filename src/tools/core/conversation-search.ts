/**
 * Conversation Search Tool
 * Core tool for searching through conversation history
 */

import { ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { messageManager } from '../../services/message-manager.js';
import { logger } from '../../log.js';

// ============================================================================
// CONVERSATION SEARCH TOOL
// ============================================================================

export interface ConversationSearchArgs {
    query: string;
    limit?: number;
    startDate?: string;
    endDate?: string;
}

async function handleConversationSearch(
    args: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const query = args.query as string;
    const limit = (args.limit as number) ?? 10;
    const startDateStr = args.startDate as string | undefined;
    const endDateStr = args.endDate as string | undefined;

    if (!query || typeof query !== 'string') {
        return {
            success: false,
            error: 'Query is required and must be a string',
        };
    }

    try {
        const options: {
            before?: Date;
            after?: Date;
            limit: number;
        } = { limit };

        if (startDateStr) {
            options.after = new Date(startDateStr);
        }
        if (endDateStr) {
            options.before = new Date(endDateStr);
        }

        const messages = await messageManager.getAgentMessages(
            context.agentId,
            { id: context.userId, organizationId: context.organizationId },
            options
        );

        // Filter messages by query (simple text search)
        const queryLower = query.toLowerCase();
        const matchedMessages = messages.filter((m) => {
            const text = m.text?.toLowerCase() ?? '';
            return text.includes(queryLower);
        });

        const results = matchedMessages.slice(0, limit).map((m) => ({
            id: m.id,
            role: m.role,
            text: m.text?.substring(0, 200) ?? '',
            createdAt: m.createdAt.toISOString(),
        }));

        logger.debug(
            { agentId: context.agentId, query, resultCount: results.length },
            'conversation_search completed'
        );

        return {
            success: true,
            result: {
                totalFound: matchedMessages.length,
                results,
            },
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ error: errorMessage }, 'conversation_search failed');

        return {
            success: false,
            error: errorMessage,
        };
    }
}

export const conversationSearchTool: ToolDefinition = {
    name: 'conversation_search',
    description: 'Searches through the conversation history for messages matching a query.',
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'The search query to find in conversation history',
            },
            limit: {
                type: 'integer',
                description: 'Maximum number of results to return (default: 10)',
            },
            startDate: {
                type: 'string',
                description: 'Start date for search range (ISO format)',
            },
            endDate: {
                type: 'string',
                description: 'End date for search range (ISO format)',
            },
        },
        required: ['query'],
        additionalProperties: false,
    },
    handler: handleConversationSearch,
    toolType: 'mirix_core',
    sourceType: 'json',
    returnCharLimit: 5000,
    tags: ['core', 'search', 'conversation'],
};

export default conversationSearchTool;
