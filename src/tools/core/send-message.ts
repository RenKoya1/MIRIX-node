/**
 * Send Message Tool
 * Core tool for sending messages to users
 */

import { ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { logger } from '../../log.js';

// ============================================================================
// SEND MESSAGE TOOL
// ============================================================================

export interface SendMessageArgs {
    message: string;
    recipientId?: string;
}

async function handleSendMessage(
    args: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const message = args.message as string;
    const recipientId = args.recipientId as string | undefined;

    if (!message || typeof message !== 'string') {
        return {
            success: false,
            error: 'Message is required and must be a string',
        };
    }

    logger.debug(
        { agentId: context.agentId, messageLength: message.length, recipientId },
        'send_message called'
    );

    // The actual message sending is handled by the agent framework
    // This tool just validates and returns the message content
    return {
        success: true,
        result: {
            status: 'sent',
            message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        },
    };
}

export const sendMessageTool: ToolDefinition = {
    name: 'send_message',
    description: 'Sends a message to the user. This is the primary way to communicate with users.',
    parameters: {
        type: 'object',
        properties: {
            message: {
                type: 'string',
                description: 'The message content to send to the user',
            },
            recipientId: {
                type: 'string',
                description: 'Optional recipient ID for targeted messages',
            },
        },
        required: ['message'],
        additionalProperties: false,
    },
    handler: handleSendMessage,
    toolType: 'mirix_core',
    sourceType: 'json',
    tags: ['core', 'messaging'],
};

export default sendMessageTool;
