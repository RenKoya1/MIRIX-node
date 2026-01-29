/**
 * Mirix Message Content Types
 * Converted from: mirix/schemas/mirix_message_content.py
 */
import { z } from 'zod';
/**
 * Message content types
 */
export declare const MessageContentType: {
    readonly TEXT: "text";
    readonly IMAGE_URL: "image_url";
    readonly FILE_URI: "file_uri";
    readonly GOOGLE_CLOUD_FILE_URI: "google_cloud_file_uri";
    readonly TOOL_CALL: "tool_call";
    readonly TOOL_RETURN: "tool_return";
    readonly REASONING: "reasoning";
    readonly REDACTED_REASONING: "redacted_reasoning";
    readonly OMITTED_REASONING: "omitted_reasoning";
};
export type MessageContentType = (typeof MessageContentType)[keyof typeof MessageContentType];
export declare const TextContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "text";
    text: string;
}, {
    type: "text";
    text: string;
}>;
export type TextContent = z.infer<typeof TextContentSchema>;
export declare const ImageContentSchema: z.ZodObject<{
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
}>;
export type ImageContent = z.infer<typeof ImageContentSchema>;
export declare const FileContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"file_uri">;
    fileId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "file_uri";
    fileId: string;
}, {
    type: "file_uri";
    fileId: string;
}>;
export type FileContent = z.infer<typeof FileContentSchema>;
export declare const CloudFileContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"google_cloud_file_uri">;
    cloudFileUri: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "google_cloud_file_uri";
    cloudFileUri: string;
}, {
    type: "google_cloud_file_uri";
    cloudFileUri: string;
}>;
export type CloudFileContent = z.infer<typeof CloudFileContentSchema>;
export declare const MirixUserMessageContentUnionSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
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
}>]>;
export type MirixUserMessageContentUnion = z.infer<typeof MirixUserMessageContentUnionSchema>;
export declare const MirixAssistantMessageContentUnionSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "text";
    text: string;
}, {
    type: "text";
    text: string;
}>]>;
export type MirixAssistantMessageContentUnion = z.infer<typeof MirixAssistantMessageContentUnionSchema>;
export declare const ToolCallContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_call">;
    id: z.ZodString;
    name: z.ZodString;
    input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "tool_call";
    id: string;
    name: string;
    input: Record<string, unknown>;
}, {
    type: "tool_call";
    id: string;
    name: string;
    input: Record<string, unknown>;
}>;
export type ToolCallContent = z.infer<typeof ToolCallContentSchema>;
export declare const ToolReturnContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_return">;
    toolCallId: z.ZodString;
    content: z.ZodString;
    isError: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    type: "tool_return";
    toolCallId: string;
    content: string;
    isError: boolean;
}, {
    type: "tool_return";
    toolCallId: string;
    content: string;
    isError: boolean;
}>;
export type ToolReturnContent = z.infer<typeof ToolReturnContentSchema>;
export declare const ReasoningContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"reasoning">;
    isNative: z.ZodBoolean;
    reasoning: z.ZodString;
    signature: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "reasoning";
    reasoning: string;
    isNative: boolean;
    signature?: string | null | undefined;
}, {
    type: "reasoning";
    reasoning: string;
    isNative: boolean;
    signature?: string | null | undefined;
}>;
export type ReasoningContent = z.infer<typeof ReasoningContentSchema>;
export declare const RedactedReasoningContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"redacted_reasoning">;
    data: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "redacted_reasoning";
    data: string;
}, {
    type: "redacted_reasoning";
    data: string;
}>;
export type RedactedReasoningContent = z.infer<typeof RedactedReasoningContentSchema>;
export declare const OmittedReasoningContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"omitted_reasoning">;
    tokens: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "omitted_reasoning";
    tokens: number;
}, {
    type: "omitted_reasoning";
    tokens: number;
}>;
export type OmittedReasoningContent = z.infer<typeof OmittedReasoningContentSchema>;
export declare const MirixMessageContentUnionSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
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
}>, z.ZodObject<{
    type: z.ZodLiteral<"tool_call">;
    id: z.ZodString;
    name: z.ZodString;
    input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "tool_call";
    id: string;
    name: string;
    input: Record<string, unknown>;
}, {
    type: "tool_call";
    id: string;
    name: string;
    input: Record<string, unknown>;
}>, z.ZodObject<{
    type: z.ZodLiteral<"tool_return">;
    toolCallId: z.ZodString;
    content: z.ZodString;
    isError: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    type: "tool_return";
    toolCallId: string;
    content: string;
    isError: boolean;
}, {
    type: "tool_return";
    toolCallId: string;
    content: string;
    isError: boolean;
}>, z.ZodObject<{
    type: z.ZodLiteral<"reasoning">;
    isNative: z.ZodBoolean;
    reasoning: z.ZodString;
    signature: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "reasoning";
    reasoning: string;
    isNative: boolean;
    signature?: string | null | undefined;
}, {
    type: "reasoning";
    reasoning: string;
    isNative: boolean;
    signature?: string | null | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"redacted_reasoning">;
    data: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "redacted_reasoning";
    data: string;
}, {
    type: "redacted_reasoning";
    data: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"omitted_reasoning">;
    tokens: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "omitted_reasoning";
    tokens: number;
}, {
    type: "omitted_reasoning";
    tokens: number;
}>]>;
export type MirixMessageContentUnion = z.infer<typeof MirixMessageContentUnionSchema>;
export declare function createTextContent(text: string): TextContent;
export declare function createImageContent(imageId: string, detail?: string): ImageContent;
export declare function createFileContent(fileId: string): FileContent;
export declare function createToolCallContent(id: string, name: string, input: Record<string, unknown>): ToolCallContent;
export declare function createToolReturnContent(toolCallId: string, content: string, isError: boolean): ToolReturnContent;
//# sourceMappingURL=mirix_message_content.d.ts.map