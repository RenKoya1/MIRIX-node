/**
 * Mirix Message Types
 * Converted from: mirix/schemas/mirix_message.py
 */

import { z } from 'zod';
import {
    MirixAssistantMessageContentUnionSchema,
    MirixUserMessageContentUnionSchema,
} from './mirix_message_content.js';

/**
 * Message types
 */
export const MessageType = {
    SYSTEM_MESSAGE: 'system_message',
    USER_MESSAGE: 'user_message',
    ASSISTANT_MESSAGE: 'assistant_message',
    REASONING_MESSAGE: 'reasoning_message',
    HIDDEN_REASONING_MESSAGE: 'hidden_reasoning_message',
    TOOL_CALL_MESSAGE: 'tool_call_message',
    TOOL_RETURN_MESSAGE: 'tool_return_message',
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

// -------------------------------
// Base Message Schema
// -------------------------------

export const MirixMessageBaseSchema = z.object({
    id: z.string(),
    date: z.date(),
    name: z.string().nullable().optional(),
    messageType: z.nativeEnum(
        MessageType as unknown as { [k: string]: string }
    ).describe('The type of the message'),
    otid: z.string().nullable().optional(),
    senderId: z.string().nullable().optional(),
});

export type MirixMessageBase = z.infer<typeof MirixMessageBaseSchema>;

// -------------------------------
// Concrete Message Types
// -------------------------------

export const SystemMessageSchema = MirixMessageBaseSchema.extend({
    messageType: z.literal(MessageType.SYSTEM_MESSAGE),
    content: z.string().describe('The message content sent by the system'),
});

export type SystemMessage = z.infer<typeof SystemMessageSchema>;

export const UserMessageSchema = MirixMessageBaseSchema.extend({
    messageType: z.literal(MessageType.USER_MESSAGE),
    content: z.union([
        z.string(),
        z.array(MirixUserMessageContentUnionSchema),
    ]).describe('The message content sent by the user'),
});

export type UserMessage = z.infer<typeof UserMessageSchema>;

export const ReasoningMessageSchema = MirixMessageBaseSchema.extend({
    messageType: z.literal(MessageType.REASONING_MESSAGE),
    source: z.enum(['reasoner_model', 'non_reasoner_model']).default('non_reasoner_model'),
    reasoning: z.string(),
    signature: z.string().nullable().optional(),
});

export type ReasoningMessage = z.infer<typeof ReasoningMessageSchema>;

export const HiddenReasoningMessageSchema = MirixMessageBaseSchema.extend({
    messageType: z.literal(MessageType.HIDDEN_REASONING_MESSAGE),
    state: z.enum(['redacted', 'omitted']),
    hiddenReasoning: z.string().nullable().optional(),
});

export type HiddenReasoningMessage = z.infer<typeof HiddenReasoningMessageSchema>;

// Tool Call Types
export const ToolCallSchema = z.object({
    name: z.string(),
    arguments: z.string(),
    toolCallId: z.string(),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

export const ToolCallDeltaSchema = z.object({
    name: z.string().nullable().optional(),
    arguments: z.string().nullable().optional(),
    toolCallId: z.string().nullable().optional(),
});

export type ToolCallDelta = z.infer<typeof ToolCallDeltaSchema>;

export const ToolCallMessageSchema = MirixMessageBaseSchema.extend({
    messageType: z.literal(MessageType.TOOL_CALL_MESSAGE),
    toolCall: z.union([ToolCallSchema, ToolCallDeltaSchema]),
});

export type ToolCallMessage = z.infer<typeof ToolCallMessageSchema>;

export const ToolReturnMessageSchema = MirixMessageBaseSchema.extend({
    messageType: z.literal(MessageType.TOOL_RETURN_MESSAGE),
    toolReturn: z.string(),
    status: z.enum(['success', 'error']),
    toolCallId: z.string(),
    stdout: z.array(z.string()).nullable().optional(),
    stderr: z.array(z.string()).nullable().optional(),
});

export type ToolReturnMessage = z.infer<typeof ToolReturnMessageSchema>;

export const AssistantMessageSchema = MirixMessageBaseSchema.extend({
    messageType: z.literal(MessageType.ASSISTANT_MESSAGE),
    content: z.union([
        z.string(),
        z.array(MirixAssistantMessageContentUnionSchema),
    ]).describe('The message content sent by the agent'),
});

export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;

// -------------------------------
// Mirix Message Union
// -------------------------------

export const MirixMessageUnionSchema = z.discriminatedUnion('messageType', [
    SystemMessageSchema,
    UserMessageSchema,
    ReasoningMessageSchema,
    HiddenReasoningMessageSchema,
    ToolCallMessageSchema,
    ToolReturnMessageSchema,
    AssistantMessageSchema,
]);

export type MirixMessageUnion = z.infer<typeof MirixMessageUnionSchema>;

// -------------------------------
// Message Update Types
// -------------------------------

export const UpdateSystemMessageSchema = z.object({
    messageType: z.literal('system_message'),
    content: z.string(),
});

export type UpdateSystemMessage = z.infer<typeof UpdateSystemMessageSchema>;

export const UpdateUserMessageSchema = z.object({
    messageType: z.literal('user_message'),
    content: z.union([
        z.string(),
        z.array(MirixUserMessageContentUnionSchema),
    ]),
});

export type UpdateUserMessage = z.infer<typeof UpdateUserMessageSchema>;

export const UpdateReasoningMessageSchema = z.object({
    messageType: z.literal('reasoning_message'),
    reasoning: z.string(),
});

export type UpdateReasoningMessage = z.infer<typeof UpdateReasoningMessageSchema>;

export const UpdateAssistantMessageSchema = z.object({
    messageType: z.literal('assistant_message'),
    content: z.union([
        z.string(),
        z.array(MirixAssistantMessageContentUnionSchema),
    ]),
});

export type UpdateAssistantMessage = z.infer<typeof UpdateAssistantMessageSchema>;

export const MirixMessageUpdateUnionSchema = z.discriminatedUnion('messageType', [
    UpdateSystemMessageSchema,
    UpdateUserMessageSchema,
    UpdateReasoningMessageSchema,
    UpdateAssistantMessageSchema,
]);

export type MirixMessageUpdateUnion = z.infer<typeof MirixMessageUpdateUnionSchema>;

// -------------------------------
// Helper Functions
// -------------------------------

export function createSystemMessage(
    id: string,
    content: string,
    date: Date = new Date()
): SystemMessage {
    return {
        id,
        date,
        messageType: MessageType.SYSTEM_MESSAGE,
        content,
    };
}

export function createUserMessage(
    id: string,
    content: string | z.infer<typeof MirixUserMessageContentUnionSchema>[],
    date: Date = new Date()
): UserMessage {
    return {
        id,
        date,
        messageType: MessageType.USER_MESSAGE,
        content,
    };
}

export function createAssistantMessage(
    id: string,
    content: string | z.infer<typeof MirixAssistantMessageContentUnionSchema>[],
    date: Date = new Date()
): AssistantMessage {
    return {
        id,
        date,
        messageType: MessageType.ASSISTANT_MESSAGE,
        content,
    };
}

export function createToolCallMessage(
    id: string,
    toolCall: ToolCall | ToolCallDelta,
    date: Date = new Date()
): ToolCallMessage {
    return {
        id,
        date,
        messageType: MessageType.TOOL_CALL_MESSAGE,
        toolCall,
    };
}

export function createToolReturnMessage(
    id: string,
    toolReturn: string,
    status: 'success' | 'error',
    toolCallId: string,
    date: Date = new Date()
): ToolReturnMessage {
    return {
        id,
        date,
        messageType: MessageType.TOOL_RETURN_MESSAGE,
        toolReturn,
        status,
        toolCallId,
    };
}
