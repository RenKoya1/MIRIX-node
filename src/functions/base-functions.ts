/**
 * Base Functions
 * Core agent functions for message sending and memory operations
 */

import { z } from 'zod';
import { buildFunctionSchema, type FunctionSchema } from './schema-generator';

// ============================================================================
// FUNCTION IMPLEMENTATIONS
// ============================================================================

/**
 * Send a message to the user
 */
export async function sendMessage(args: {
    message: string;
    innerThoughts?: string;
}): Promise<{ success: boolean; message: string }> {
    // This is a placeholder - actual implementation would be in the agent
    return {
        success: true,
        message: args.message,
    };
}

/**
 * Send an intermediate message (progress update)
 */
export async function sendIntermediateMessage(_args: {
    message: string;
    progress?: number;
}): Promise<{ success: boolean }> {
    // Placeholder implementation
    return { success: true };
}

/**
 * Search conversation history
 */
export async function conversationSearch(_args: {
    query: string;
    limit?: number;
    beforeDate?: string;
    afterDate?: string;
}): Promise<{
    results: Array<{
        role: string;
        content: string;
        timestamp: string;
        score: number;
    }>;
}> {
    // Placeholder implementation
    return { results: [] };
}

/**
 * Search across memory types
 */
export async function searchInMemory(_args: {
    query: string;
    memoryTypes?: string[];
    limit?: number;
}): Promise<{
    results: Array<{
        memoryType: string;
        content: string;
        score: number;
        metadata: Record<string, unknown>;
    }>;
}> {
    // Placeholder implementation
    return { results: [] };
}

// ============================================================================
// FUNCTION SCHEMAS
// ============================================================================

export const sendMessageSchema = buildFunctionSchema(
    'send_message',
    'Send a message to the user. Use this to communicate responses, ask questions, or provide information.',
    z.object({
        message: z.string().describe('The message content to send to the user'),
        innerThoughts: z.string().optional().describe('Internal reasoning (not shown to user)'),
    })
);

export const sendIntermediateMessageSchema = buildFunctionSchema(
    'send_intermediate_message',
    'Send a progress update or intermediate message to the user while processing.',
    z.object({
        message: z.string().describe('The progress message to display'),
        progress: z.number().min(0).max(100).optional().describe('Progress percentage (0-100)'),
    })
);

export const conversationSearchSchema = buildFunctionSchema(
    'conversation_search',
    'Search through the conversation history to find relevant past messages.',
    z.object({
        query: z.string().describe('The search query to find relevant messages'),
        limit: z.number().min(1).max(50).optional().describe('Maximum number of results to return'),
        beforeDate: z.string().optional().describe('Only search messages before this date (ISO format)'),
        afterDate: z.string().optional().describe('Only search messages after this date (ISO format)'),
    })
);

export const searchInMemorySchema = buildFunctionSchema(
    'search_in_memory',
    'Search across different memory types (episodic, semantic, procedural, resource, knowledge) to find relevant information.',
    z.object({
        query: z.string().describe('The search query to find relevant memories'),
        memoryTypes: z.array(z.enum([
            'episodic',
            'semantic',
            'procedural',
            'resource',
            'knowledge',
        ])).optional().describe('Memory types to search (default: all)'),
        limit: z.number().min(1).max(20).optional().describe('Maximum results per memory type'),
    })
);

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

export const baseFunctionSchemas: FunctionSchema[] = [
    sendMessageSchema,
    sendIntermediateMessageSchema,
    conversationSearchSchema,
    searchInMemorySchema,
];

export const baseFunctions = {
    send_message: sendMessage,
    send_intermediate_message: sendIntermediateMessage,
    conversation_search: conversationSearch,
    search_in_memory: searchInMemory,
};
