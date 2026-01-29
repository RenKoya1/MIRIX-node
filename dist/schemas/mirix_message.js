/**
 * Mirix Message Types
 * Converted from: mirix/schemas/mirix_message.py
 */
import { z } from 'zod';
import { MirixAssistantMessageContentUnionSchema, MirixUserMessageContentUnionSchema, } from './mirix_message_content.js';
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
};
// -------------------------------
// Base Message Schema
// -------------------------------
export const MirixMessageBaseSchema = z.object({
    id: z.string(),
    date: z.date(),
    name: z.string().nullable().optional(),
    messageType: z.nativeEnum(MessageType).describe('The type of the message'),
    otid: z.string().nullable().optional(),
    senderId: z.string().nullable().optional(),
});
// -------------------------------
// Concrete Message Types
// -------------------------------
export const SystemMessageSchema = MirixMessageBaseSchema.extend({
    messageType: z.literal(MessageType.SYSTEM_MESSAGE),
    content: z.string().describe('The message content sent by the system'),
});
export const UserMessageSchema = MirixMessageBaseSchema.extend({
    messageType: z.literal(MessageType.USER_MESSAGE),
    content: z.union([
        z.string(),
        z.array(MirixUserMessageContentUnionSchema),
    ]).describe('The message content sent by the user'),
});
export const ReasoningMessageSchema = MirixMessageBaseSchema.extend({
    messageType: z.literal(MessageType.REASONING_MESSAGE),
    source: z.enum(['reasoner_model', 'non_reasoner_model']).default('non_reasoner_model'),
    reasoning: z.string(),
    signature: z.string().nullable().optional(),
});
export const HiddenReasoningMessageSchema = MirixMessageBaseSchema.extend({
    messageType: z.literal(MessageType.HIDDEN_REASONING_MESSAGE),
    state: z.enum(['redacted', 'omitted']),
    hiddenReasoning: z.string().nullable().optional(),
});
// Tool Call Types
export const ToolCallSchema = z.object({
    name: z.string(),
    arguments: z.string(),
    toolCallId: z.string(),
});
export const ToolCallDeltaSchema = z.object({
    name: z.string().nullable().optional(),
    arguments: z.string().nullable().optional(),
    toolCallId: z.string().nullable().optional(),
});
export const ToolCallMessageSchema = MirixMessageBaseSchema.extend({
    messageType: z.literal(MessageType.TOOL_CALL_MESSAGE),
    toolCall: z.union([ToolCallSchema, ToolCallDeltaSchema]),
});
export const ToolReturnMessageSchema = MirixMessageBaseSchema.extend({
    messageType: z.literal(MessageType.TOOL_RETURN_MESSAGE),
    toolReturn: z.string(),
    status: z.enum(['success', 'error']),
    toolCallId: z.string(),
    stdout: z.array(z.string()).nullable().optional(),
    stderr: z.array(z.string()).nullable().optional(),
});
export const AssistantMessageSchema = MirixMessageBaseSchema.extend({
    messageType: z.literal(MessageType.ASSISTANT_MESSAGE),
    content: z.union([
        z.string(),
        z.array(MirixAssistantMessageContentUnionSchema),
    ]).describe('The message content sent by the agent'),
});
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
// -------------------------------
// Message Update Types
// -------------------------------
export const UpdateSystemMessageSchema = z.object({
    messageType: z.literal('system_message'),
    content: z.string(),
});
export const UpdateUserMessageSchema = z.object({
    messageType: z.literal('user_message'),
    content: z.union([
        z.string(),
        z.array(MirixUserMessageContentUnionSchema),
    ]),
});
export const UpdateReasoningMessageSchema = z.object({
    messageType: z.literal('reasoning_message'),
    reasoning: z.string(),
});
export const UpdateAssistantMessageSchema = z.object({
    messageType: z.literal('assistant_message'),
    content: z.union([
        z.string(),
        z.array(MirixAssistantMessageContentUnionSchema),
    ]),
});
export const MirixMessageUpdateUnionSchema = z.discriminatedUnion('messageType', [
    UpdateSystemMessageSchema,
    UpdateUserMessageSchema,
    UpdateReasoningMessageSchema,
    UpdateAssistantMessageSchema,
]);
// -------------------------------
// Helper Functions
// -------------------------------
export function createSystemMessage(id, content, date = new Date()) {
    return {
        id,
        date,
        messageType: MessageType.SYSTEM_MESSAGE,
        content,
    };
}
export function createUserMessage(id, content, date = new Date()) {
    return {
        id,
        date,
        messageType: MessageType.USER_MESSAGE,
        content,
    };
}
export function createAssistantMessage(id, content, date = new Date()) {
    return {
        id,
        date,
        messageType: MessageType.ASSISTANT_MESSAGE,
        content,
    };
}
export function createToolCallMessage(id, toolCall, date = new Date()) {
    return {
        id,
        date,
        messageType: MessageType.TOOL_CALL_MESSAGE,
        toolCall,
    };
}
export function createToolReturnMessage(id, toolReturn, status, toolCallId, date = new Date()) {
    return {
        id,
        date,
        messageType: MessageType.TOOL_RETURN_MESSAGE,
        toolReturn,
        status,
        toolCallId,
    };
}
//# sourceMappingURL=mirix_message.js.map