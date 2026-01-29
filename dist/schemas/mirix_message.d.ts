/**
 * Mirix Message Types
 * Converted from: mirix/schemas/mirix_message.py
 */
import { z } from 'zod';
import { MirixAssistantMessageContentUnionSchema, MirixUserMessageContentUnionSchema } from './mirix_message_content.js';
/**
 * Message types
 */
export declare const MessageType: {
    readonly SYSTEM_MESSAGE: "system_message";
    readonly USER_MESSAGE: "user_message";
    readonly ASSISTANT_MESSAGE: "assistant_message";
    readonly REASONING_MESSAGE: "reasoning_message";
    readonly HIDDEN_REASONING_MESSAGE: "hidden_reasoning_message";
    readonly TOOL_CALL_MESSAGE: "tool_call_message";
    readonly TOOL_RETURN_MESSAGE: "tool_return_message";
};
export type MessageType = (typeof MessageType)[keyof typeof MessageType];
export declare const MirixMessageBaseSchema: z.ZodObject<{
    id: z.ZodString;
    date: z.ZodDate;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    messageType: z.ZodNativeEnum<{
        [k: string]: string;
    }>;
    otid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    senderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    date: Date;
    id: string;
    messageType: string;
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}, {
    date: Date;
    id: string;
    messageType: string;
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}>;
export type MirixMessageBase = z.infer<typeof MirixMessageBaseSchema>;
export declare const SystemMessageSchema: z.ZodObject<{
    id: z.ZodString;
    date: z.ZodDate;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    otid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    senderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
} & {
    messageType: z.ZodLiteral<"system_message">;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: Date;
    id: string;
    content: string;
    messageType: "system_message";
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}, {
    date: Date;
    id: string;
    content: string;
    messageType: "system_message";
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}>;
export type SystemMessage = z.infer<typeof SystemMessageSchema>;
export declare const UserMessageSchema: z.ZodObject<{
    id: z.ZodString;
    date: z.ZodDate;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    otid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    senderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
} & {
    messageType: z.ZodLiteral<"user_message">;
    content: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "text";
        text: string;
    }, {
        type: "text";
        text: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"image_url">;
        imageId: z.ZodString;
        detail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        type: "image_url";
        imageId: string;
        detail?: string | null | undefined;
    }, {
        type: "image_url";
        imageId: string;
        detail?: string | null | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"file_uri">;
        fileId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "file_uri";
        fileId: string;
    }, {
        type: "file_uri";
        fileId: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"google_cloud_file_uri">;
        cloudFileUri: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "google_cloud_file_uri";
        cloudFileUri: string;
    }, {
        type: "google_cloud_file_uri";
        cloudFileUri: string;
    }>]>, "many">]>;
}, "strip", z.ZodTypeAny, {
    date: Date;
    id: string;
    content: string | ({
        type: "text";
        text: string;
    } | {
        type: "image_url";
        imageId: string;
        detail?: string | null | undefined;
    } | {
        type: "file_uri";
        fileId: string;
    } | {
        type: "google_cloud_file_uri";
        cloudFileUri: string;
    })[];
    messageType: "user_message";
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}, {
    date: Date;
    id: string;
    content: string | ({
        type: "text";
        text: string;
    } | {
        type: "image_url";
        imageId: string;
        detail?: string | null | undefined;
    } | {
        type: "file_uri";
        fileId: string;
    } | {
        type: "google_cloud_file_uri";
        cloudFileUri: string;
    })[];
    messageType: "user_message";
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}>;
export type UserMessage = z.infer<typeof UserMessageSchema>;
export declare const ReasoningMessageSchema: z.ZodObject<{
    id: z.ZodString;
    date: z.ZodDate;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    otid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    senderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
} & {
    messageType: z.ZodLiteral<"reasoning_message">;
    source: z.ZodDefault<z.ZodEnum<["reasoner_model", "non_reasoner_model"]>>;
    reasoning: z.ZodString;
    signature: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    reasoning: string;
    date: Date;
    id: string;
    messageType: "reasoning_message";
    source: "reasoner_model" | "non_reasoner_model";
    name?: string | null | undefined;
    signature?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}, {
    reasoning: string;
    date: Date;
    id: string;
    messageType: "reasoning_message";
    name?: string | null | undefined;
    signature?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
    source?: "reasoner_model" | "non_reasoner_model" | undefined;
}>;
export type ReasoningMessage = z.infer<typeof ReasoningMessageSchema>;
export declare const HiddenReasoningMessageSchema: z.ZodObject<{
    id: z.ZodString;
    date: z.ZodDate;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    otid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    senderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
} & {
    messageType: z.ZodLiteral<"hidden_reasoning_message">;
    state: z.ZodEnum<["redacted", "omitted"]>;
    hiddenReasoning: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    date: Date;
    id: string;
    messageType: "hidden_reasoning_message";
    state: "redacted" | "omitted";
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
    hiddenReasoning?: string | null | undefined;
}, {
    date: Date;
    id: string;
    messageType: "hidden_reasoning_message";
    state: "redacted" | "omitted";
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
    hiddenReasoning?: string | null | undefined;
}>;
export type HiddenReasoningMessage = z.infer<typeof HiddenReasoningMessageSchema>;
export declare const ToolCallSchema: z.ZodObject<{
    name: z.ZodString;
    arguments: z.ZodString;
    toolCallId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    toolCallId: string;
    arguments: string;
}, {
    name: string;
    toolCallId: string;
    arguments: string;
}>;
export type ToolCall = z.infer<typeof ToolCallSchema>;
export declare const ToolCallDeltaSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    arguments: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    toolCallId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string | null | undefined;
    toolCallId?: string | null | undefined;
    arguments?: string | null | undefined;
}, {
    name?: string | null | undefined;
    toolCallId?: string | null | undefined;
    arguments?: string | null | undefined;
}>;
export type ToolCallDelta = z.infer<typeof ToolCallDeltaSchema>;
export declare const ToolCallMessageSchema: z.ZodObject<{
    id: z.ZodString;
    date: z.ZodDate;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    otid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    senderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
} & {
    messageType: z.ZodLiteral<"tool_call_message">;
    toolCall: z.ZodUnion<[z.ZodObject<{
        name: z.ZodString;
        arguments: z.ZodString;
        toolCallId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        toolCallId: string;
        arguments: string;
    }, {
        name: string;
        toolCallId: string;
        arguments: string;
    }>, z.ZodObject<{
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        arguments: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        toolCallId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name?: string | null | undefined;
        toolCallId?: string | null | undefined;
        arguments?: string | null | undefined;
    }, {
        name?: string | null | undefined;
        toolCallId?: string | null | undefined;
        arguments?: string | null | undefined;
    }>]>;
}, "strip", z.ZodTypeAny, {
    date: Date;
    id: string;
    messageType: "tool_call_message";
    toolCall: {
        name: string;
        toolCallId: string;
        arguments: string;
    } | {
        name?: string | null | undefined;
        toolCallId?: string | null | undefined;
        arguments?: string | null | undefined;
    };
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}, {
    date: Date;
    id: string;
    messageType: "tool_call_message";
    toolCall: {
        name: string;
        toolCallId: string;
        arguments: string;
    } | {
        name?: string | null | undefined;
        toolCallId?: string | null | undefined;
        arguments?: string | null | undefined;
    };
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}>;
export type ToolCallMessage = z.infer<typeof ToolCallMessageSchema>;
export declare const ToolReturnMessageSchema: z.ZodObject<{
    id: z.ZodString;
    date: z.ZodDate;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    otid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    senderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
} & {
    messageType: z.ZodLiteral<"tool_return_message">;
    toolReturn: z.ZodString;
    status: z.ZodEnum<["success", "error"]>;
    toolCallId: z.ZodString;
    stdout: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    stderr: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    status: "success" | "error";
    date: Date;
    id: string;
    toolCallId: string;
    messageType: "tool_return_message";
    toolReturn: string;
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
    stdout?: string[] | null | undefined;
    stderr?: string[] | null | undefined;
}, {
    status: "success" | "error";
    date: Date;
    id: string;
    toolCallId: string;
    messageType: "tool_return_message";
    toolReturn: string;
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
    stdout?: string[] | null | undefined;
    stderr?: string[] | null | undefined;
}>;
export type ToolReturnMessage = z.infer<typeof ToolReturnMessageSchema>;
export declare const AssistantMessageSchema: z.ZodObject<{
    id: z.ZodString;
    date: z.ZodDate;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    otid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    senderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
} & {
    messageType: z.ZodLiteral<"assistant_message">;
    content: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "text";
        text: string;
    }, {
        type: "text";
        text: string;
    }>]>, "many">]>;
}, "strip", z.ZodTypeAny, {
    date: Date;
    id: string;
    content: string | {
        type: "text";
        text: string;
    }[];
    messageType: "assistant_message";
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}, {
    date: Date;
    id: string;
    content: string | {
        type: "text";
        text: string;
    }[];
    messageType: "assistant_message";
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}>;
export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;
export declare const MirixMessageUnionSchema: z.ZodDiscriminatedUnion<"messageType", [z.ZodObject<{
    id: z.ZodString;
    date: z.ZodDate;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    otid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    senderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
} & {
    messageType: z.ZodLiteral<"system_message">;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: Date;
    id: string;
    content: string;
    messageType: "system_message";
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}, {
    date: Date;
    id: string;
    content: string;
    messageType: "system_message";
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    date: z.ZodDate;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    otid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    senderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
} & {
    messageType: z.ZodLiteral<"user_message">;
    content: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "text";
        text: string;
    }, {
        type: "text";
        text: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"image_url">;
        imageId: z.ZodString;
        detail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        type: "image_url";
        imageId: string;
        detail?: string | null | undefined;
    }, {
        type: "image_url";
        imageId: string;
        detail?: string | null | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"file_uri">;
        fileId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "file_uri";
        fileId: string;
    }, {
        type: "file_uri";
        fileId: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"google_cloud_file_uri">;
        cloudFileUri: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "google_cloud_file_uri";
        cloudFileUri: string;
    }, {
        type: "google_cloud_file_uri";
        cloudFileUri: string;
    }>]>, "many">]>;
}, "strip", z.ZodTypeAny, {
    date: Date;
    id: string;
    content: string | ({
        type: "text";
        text: string;
    } | {
        type: "image_url";
        imageId: string;
        detail?: string | null | undefined;
    } | {
        type: "file_uri";
        fileId: string;
    } | {
        type: "google_cloud_file_uri";
        cloudFileUri: string;
    })[];
    messageType: "user_message";
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}, {
    date: Date;
    id: string;
    content: string | ({
        type: "text";
        text: string;
    } | {
        type: "image_url";
        imageId: string;
        detail?: string | null | undefined;
    } | {
        type: "file_uri";
        fileId: string;
    } | {
        type: "google_cloud_file_uri";
        cloudFileUri: string;
    })[];
    messageType: "user_message";
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    date: z.ZodDate;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    otid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    senderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
} & {
    messageType: z.ZodLiteral<"reasoning_message">;
    source: z.ZodDefault<z.ZodEnum<["reasoner_model", "non_reasoner_model"]>>;
    reasoning: z.ZodString;
    signature: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    reasoning: string;
    date: Date;
    id: string;
    messageType: "reasoning_message";
    source: "reasoner_model" | "non_reasoner_model";
    name?: string | null | undefined;
    signature?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}, {
    reasoning: string;
    date: Date;
    id: string;
    messageType: "reasoning_message";
    name?: string | null | undefined;
    signature?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
    source?: "reasoner_model" | "non_reasoner_model" | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    date: z.ZodDate;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    otid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    senderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
} & {
    messageType: z.ZodLiteral<"hidden_reasoning_message">;
    state: z.ZodEnum<["redacted", "omitted"]>;
    hiddenReasoning: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    date: Date;
    id: string;
    messageType: "hidden_reasoning_message";
    state: "redacted" | "omitted";
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
    hiddenReasoning?: string | null | undefined;
}, {
    date: Date;
    id: string;
    messageType: "hidden_reasoning_message";
    state: "redacted" | "omitted";
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
    hiddenReasoning?: string | null | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    date: z.ZodDate;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    otid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    senderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
} & {
    messageType: z.ZodLiteral<"tool_call_message">;
    toolCall: z.ZodUnion<[z.ZodObject<{
        name: z.ZodString;
        arguments: z.ZodString;
        toolCallId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        toolCallId: string;
        arguments: string;
    }, {
        name: string;
        toolCallId: string;
        arguments: string;
    }>, z.ZodObject<{
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        arguments: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        toolCallId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name?: string | null | undefined;
        toolCallId?: string | null | undefined;
        arguments?: string | null | undefined;
    }, {
        name?: string | null | undefined;
        toolCallId?: string | null | undefined;
        arguments?: string | null | undefined;
    }>]>;
}, "strip", z.ZodTypeAny, {
    date: Date;
    id: string;
    messageType: "tool_call_message";
    toolCall: {
        name: string;
        toolCallId: string;
        arguments: string;
    } | {
        name?: string | null | undefined;
        toolCallId?: string | null | undefined;
        arguments?: string | null | undefined;
    };
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}, {
    date: Date;
    id: string;
    messageType: "tool_call_message";
    toolCall: {
        name: string;
        toolCallId: string;
        arguments: string;
    } | {
        name?: string | null | undefined;
        toolCallId?: string | null | undefined;
        arguments?: string | null | undefined;
    };
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    date: z.ZodDate;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    otid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    senderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
} & {
    messageType: z.ZodLiteral<"tool_return_message">;
    toolReturn: z.ZodString;
    status: z.ZodEnum<["success", "error"]>;
    toolCallId: z.ZodString;
    stdout: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    stderr: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    status: "success" | "error";
    date: Date;
    id: string;
    toolCallId: string;
    messageType: "tool_return_message";
    toolReturn: string;
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
    stdout?: string[] | null | undefined;
    stderr?: string[] | null | undefined;
}, {
    status: "success" | "error";
    date: Date;
    id: string;
    toolCallId: string;
    messageType: "tool_return_message";
    toolReturn: string;
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
    stdout?: string[] | null | undefined;
    stderr?: string[] | null | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    date: z.ZodDate;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    otid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    senderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
} & {
    messageType: z.ZodLiteral<"assistant_message">;
    content: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "text";
        text: string;
    }, {
        type: "text";
        text: string;
    }>]>, "many">]>;
}, "strip", z.ZodTypeAny, {
    date: Date;
    id: string;
    content: string | {
        type: "text";
        text: string;
    }[];
    messageType: "assistant_message";
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}, {
    date: Date;
    id: string;
    content: string | {
        type: "text";
        text: string;
    }[];
    messageType: "assistant_message";
    name?: string | null | undefined;
    otid?: string | null | undefined;
    senderId?: string | null | undefined;
}>]>;
export type MirixMessageUnion = z.infer<typeof MirixMessageUnionSchema>;
export declare const UpdateSystemMessageSchema: z.ZodObject<{
    messageType: z.ZodLiteral<"system_message">;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
    messageType: "system_message";
}, {
    content: string;
    messageType: "system_message";
}>;
export type UpdateSystemMessage = z.infer<typeof UpdateSystemMessageSchema>;
export declare const UpdateUserMessageSchema: z.ZodObject<{
    messageType: z.ZodLiteral<"user_message">;
    content: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "text";
        text: string;
    }, {
        type: "text";
        text: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"image_url">;
        imageId: z.ZodString;
        detail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        type: "image_url";
        imageId: string;
        detail?: string | null | undefined;
    }, {
        type: "image_url";
        imageId: string;
        detail?: string | null | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"file_uri">;
        fileId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "file_uri";
        fileId: string;
    }, {
        type: "file_uri";
        fileId: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"google_cloud_file_uri">;
        cloudFileUri: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "google_cloud_file_uri";
        cloudFileUri: string;
    }, {
        type: "google_cloud_file_uri";
        cloudFileUri: string;
    }>]>, "many">]>;
}, "strip", z.ZodTypeAny, {
    content: string | ({
        type: "text";
        text: string;
    } | {
        type: "image_url";
        imageId: string;
        detail?: string | null | undefined;
    } | {
        type: "file_uri";
        fileId: string;
    } | {
        type: "google_cloud_file_uri";
        cloudFileUri: string;
    })[];
    messageType: "user_message";
}, {
    content: string | ({
        type: "text";
        text: string;
    } | {
        type: "image_url";
        imageId: string;
        detail?: string | null | undefined;
    } | {
        type: "file_uri";
        fileId: string;
    } | {
        type: "google_cloud_file_uri";
        cloudFileUri: string;
    })[];
    messageType: "user_message";
}>;
export type UpdateUserMessage = z.infer<typeof UpdateUserMessageSchema>;
export declare const UpdateReasoningMessageSchema: z.ZodObject<{
    messageType: z.ZodLiteral<"reasoning_message">;
    reasoning: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reasoning: string;
    messageType: "reasoning_message";
}, {
    reasoning: string;
    messageType: "reasoning_message";
}>;
export type UpdateReasoningMessage = z.infer<typeof UpdateReasoningMessageSchema>;
export declare const UpdateAssistantMessageSchema: z.ZodObject<{
    messageType: z.ZodLiteral<"assistant_message">;
    content: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "text";
        text: string;
    }, {
        type: "text";
        text: string;
    }>]>, "many">]>;
}, "strip", z.ZodTypeAny, {
    content: string | {
        type: "text";
        text: string;
    }[];
    messageType: "assistant_message";
}, {
    content: string | {
        type: "text";
        text: string;
    }[];
    messageType: "assistant_message";
}>;
export type UpdateAssistantMessage = z.infer<typeof UpdateAssistantMessageSchema>;
export declare const MirixMessageUpdateUnionSchema: z.ZodDiscriminatedUnion<"messageType", [z.ZodObject<{
    messageType: z.ZodLiteral<"system_message">;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
    messageType: "system_message";
}, {
    content: string;
    messageType: "system_message";
}>, z.ZodObject<{
    messageType: z.ZodLiteral<"user_message">;
    content: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "text";
        text: string;
    }, {
        type: "text";
        text: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"image_url">;
        imageId: z.ZodString;
        detail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        type: "image_url";
        imageId: string;
        detail?: string | null | undefined;
    }, {
        type: "image_url";
        imageId: string;
        detail?: string | null | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"file_uri">;
        fileId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "file_uri";
        fileId: string;
    }, {
        type: "file_uri";
        fileId: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"google_cloud_file_uri">;
        cloudFileUri: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "google_cloud_file_uri";
        cloudFileUri: string;
    }, {
        type: "google_cloud_file_uri";
        cloudFileUri: string;
    }>]>, "many">]>;
}, "strip", z.ZodTypeAny, {
    content: string | ({
        type: "text";
        text: string;
    } | {
        type: "image_url";
        imageId: string;
        detail?: string | null | undefined;
    } | {
        type: "file_uri";
        fileId: string;
    } | {
        type: "google_cloud_file_uri";
        cloudFileUri: string;
    })[];
    messageType: "user_message";
}, {
    content: string | ({
        type: "text";
        text: string;
    } | {
        type: "image_url";
        imageId: string;
        detail?: string | null | undefined;
    } | {
        type: "file_uri";
        fileId: string;
    } | {
        type: "google_cloud_file_uri";
        cloudFileUri: string;
    })[];
    messageType: "user_message";
}>, z.ZodObject<{
    messageType: z.ZodLiteral<"reasoning_message">;
    reasoning: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reasoning: string;
    messageType: "reasoning_message";
}, {
    reasoning: string;
    messageType: "reasoning_message";
}>, z.ZodObject<{
    messageType: z.ZodLiteral<"assistant_message">;
    content: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "text";
        text: string;
    }, {
        type: "text";
        text: string;
    }>]>, "many">]>;
}, "strip", z.ZodTypeAny, {
    content: string | {
        type: "text";
        text: string;
    }[];
    messageType: "assistant_message";
}, {
    content: string | {
        type: "text";
        text: string;
    }[];
    messageType: "assistant_message";
}>]>;
export type MirixMessageUpdateUnion = z.infer<typeof MirixMessageUpdateUnionSchema>;
export declare function createSystemMessage(id: string, content: string, date?: Date): SystemMessage;
export declare function createUserMessage(id: string, content: string | z.infer<typeof MirixUserMessageContentUnionSchema>[], date?: Date): UserMessage;
export declare function createAssistantMessage(id: string, content: string | z.infer<typeof MirixAssistantMessageContentUnionSchema>[], date?: Date): AssistantMessage;
export declare function createToolCallMessage(id: string, toolCall: ToolCall | ToolCallDelta, date?: Date): ToolCallMessage;
export declare function createToolReturnMessage(id: string, toolReturn: string, status: 'success' | 'error', toolCallId: string, date?: Date): ToolReturnMessage;
//# sourceMappingURL=mirix_message.d.ts.map