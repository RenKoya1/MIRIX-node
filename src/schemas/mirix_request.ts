/**
 * Mirix Request Types
 * Converted from: mirix/schemas/mirix_request.py
 */

import { z } from 'zod';
import { MessageRole } from './enums';
import {
    MirixUserMessageContentUnionSchema,
    type MirixUserMessageContentUnion,
} from './mirix_message_content';
import { DEFAULT_MESSAGE_TOOL, DEFAULT_MESSAGE_TOOL_KWARG } from '../constants';

// -------------------------------
// Request Message Create Schema
// (Distinct from agent.ts MessageCreateSchema which is for internal agent use)
// -------------------------------

/**
 * Request to create a message (for API requests)
 * This is used in MirixRequest to send messages to an agent.
 */
export const RequestMessageCreateSchema = z.object({
    role: z.enum([MessageRole.USER, MessageRole.SYSTEM]).describe('The role of the participant'),
    content: z.union([
        z.string(),
        z.array(MirixUserMessageContentUnionSchema),
    ]).describe('The content of the message'),
    name: z.string().nullable().optional().describe('The name of the participant'),
    otid: z.string().nullable().optional().describe('The offline threading id associated with this message'),
    senderId: z.string().nullable().optional().describe('The id of the sender of the message, can be an identity id or agent id'),
    groupId: z.string().nullable().optional().describe('The multi-agent group that the message was sent in'),
    filterTags: z.record(z.string(), z.unknown()).nullable().optional().describe('Optional tags for filtering and categorizing this message and related memories'),
});

export type RequestMessageCreate = z.infer<typeof RequestMessageCreateSchema>;

// -------------------------------
// Request Config Schema
// -------------------------------

/**
 * Configuration options for MirixRequest
 */
export const MirixRequestConfigSchema = z.object({
    useAssistantMessage: z.boolean()
        .default(true)
        .describe('Whether the server should parse specific tool call arguments (default `send_message`) as `AssistantMessage` objects'),
    assistantMessageToolName: z.string()
        .default(DEFAULT_MESSAGE_TOOL)
        .describe('The name of the designated message tool'),
    assistantMessageToolKwarg: z.string()
        .default(DEFAULT_MESSAGE_TOOL_KWARG)
        .describe('The name of the message argument in the designated message tool'),
});

export type MirixRequestConfig = z.infer<typeof MirixRequestConfigSchema>;

// -------------------------------
// Request Schema
// -------------------------------

/**
 * Request object for agent interaction
 */
export const MirixRequestSchema = z.object({
    messages: z.array(RequestMessageCreateSchema).describe('The messages to be sent to the agent'),
    config: MirixRequestConfigSchema.default({
        useAssistantMessage: true,
        assistantMessageToolName: DEFAULT_MESSAGE_TOOL,
        assistantMessageToolKwarg: DEFAULT_MESSAGE_TOOL_KWARG,
    }).describe('Configuration options for the MirixRequest'),
});

export type MirixRequest = z.infer<typeof MirixRequestSchema>;

// -------------------------------
// Streaming Request Schema
// -------------------------------

/**
 * Request object for streaming agent interaction
 */
export const MirixStreamingRequestSchema = MirixRequestSchema.extend({
    streamTokens: z.boolean()
        .default(false)
        .describe('Flag to determine if individual tokens should be streamed. Set to True for token streaming (requires stream_steps = True)'),
});

export type MirixStreamingRequest = z.infer<typeof MirixStreamingRequestSchema>;

// -------------------------------
// Helper Functions
// (Named with "Request" prefix to avoid conflicts with mirix_message.ts helpers)
// -------------------------------

export function createRequestUserMessage(content: string | MirixUserMessageContentUnion[]): RequestMessageCreate {
    return {
        role: MessageRole.USER,
        content,
    };
}

export function createRequestSystemMessage(content: string): RequestMessageCreate {
    return {
        role: MessageRole.SYSTEM,
        content,
    };
}

export function createMirixRequest(
    messages: RequestMessageCreate[],
    config?: Partial<MirixRequestConfig>
): MirixRequest {
    return {
        messages,
        config: {
            useAssistantMessage: config?.useAssistantMessage ?? true,
            assistantMessageToolName: config?.assistantMessageToolName ?? DEFAULT_MESSAGE_TOOL,
            assistantMessageToolKwarg: config?.assistantMessageToolKwarg ?? DEFAULT_MESSAGE_TOOL_KWARG,
        },
    };
}

export function createMirixStreamingRequest(
    messages: RequestMessageCreate[],
    config?: Partial<MirixRequestConfig>,
    streamTokens: boolean = false
): MirixStreamingRequest {
    return {
        ...createMirixRequest(messages, config),
        streamTokens,
    };
}

/**
 * Default request config
 */
export const defaultRequestConfig: MirixRequestConfig = {
    useAssistantMessage: true,
    assistantMessageToolName: DEFAULT_MESSAGE_TOOL,
    assistantMessageToolKwarg: DEFAULT_MESSAGE_TOOL_KWARG,
};
