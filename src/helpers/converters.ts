/**
 * Converters
 * Type conversion utilities for LLM configs, messages, and tool rules
 */

import type { LLMConfig } from '../schemas/llm_config.js';

// ============================================================================
// MESSAGE CONTENT TYPES
// ============================================================================

export interface TextContent {
    type: 'text';
    text: string;
}

export interface ImageContent {
    type: 'image';
    url?: string;
    base64?: string;
    mimeType?: string;
}

export interface FileContent {
    type: 'file';
    url?: string;
    base64?: string;
    mimeType?: string;
    filename?: string;
}

export interface CloudFileContent {
    type: 'cloud_file';
    provider: string;
    fileId: string;
    filename?: string;
}

export type MessageContent = TextContent | ImageContent | FileContent | CloudFileContent;

// ============================================================================
// LLM CONFIG CONVERTERS
// ============================================================================

/**
 * Serialize LLM config to JSON-safe object
 */
export function serializeLLMConfig(config: LLMConfig): Record<string, unknown> {
    return {
        model: config.model,
        modelEndpointType: config.modelEndpointType,
        modelEndpoint: config.modelEndpoint ?? null,
        modelWrapper: config.modelWrapper ?? null,
        contextWindow: config.contextWindow,
        handle: config.handle ?? null,
        temperature: config.temperature,
        maxTokens: config.maxTokens ?? null,
        enableReasoner: config.enableReasoner,
        reasoningEffort: config.reasoningEffort ?? null,
        maxReasoningTokens: config.maxReasoningTokens,
        putInnerThoughtsInKwargs: config.putInnerThoughtsInKwargs ?? null,
        apiKey: config.apiKey ?? null,
        authProvider: config.authProvider ?? null,
        isLocalModel: config.isLocalModel,
        apiVersion: config.apiVersion ?? null,
        azureEndpoint: config.azureEndpoint ?? null,
        azureDeployment: config.azureDeployment ?? null,
    };
}

/**
 * Deserialize JSON object to LLM config
 */
export function deserializeLLMConfig(data: Record<string, unknown>): Partial<LLMConfig> {
    return {
        model: data.model as string,
        modelEndpointType: data.modelEndpointType as LLMConfig['modelEndpointType'],
        modelEndpoint: data.modelEndpoint as string | undefined,
        modelWrapper: data.modelWrapper as string | undefined,
        contextWindow: data.contextWindow as number,
        handle: data.handle as string | undefined,
        temperature: data.temperature as number,
        maxTokens: data.maxTokens as number | undefined,
        enableReasoner: data.enableReasoner as boolean,
        reasoningEffort: data.reasoningEffort as LLMConfig['reasoningEffort'],
        maxReasoningTokens: data.maxReasoningTokens as number,
        putInnerThoughtsInKwargs: data.putInnerThoughtsInKwargs as boolean | undefined,
        apiKey: data.apiKey as string | undefined,
        authProvider: data.authProvider as string | undefined,
        isLocalModel: data.isLocalModel as boolean,
        apiVersion: data.apiVersion as string | undefined,
        azureEndpoint: data.azureEndpoint as string | undefined,
        azureDeployment: data.azureDeployment as string | undefined,
    };
}

// ============================================================================
// MESSAGE CONTENT CONVERTERS
// ============================================================================

/**
 * Convert message content to standardized format
 */
export function convertMessageContent(content: unknown): MessageContent[] {
    if (typeof content === 'string') {
        return [{ type: 'text', text: content }];
    }

    if (Array.isArray(content)) {
        return content.map(convertSingleContent);
    }

    if (typeof content === 'object' && content !== null) {
        return [convertSingleContent(content)];
    }

    return [{ type: 'text', text: String(content) }];
}

/**
 * Convert a single content item
 */
function convertSingleContent(item: unknown): MessageContent {
    if (typeof item === 'string') {
        return { type: 'text', text: item };
    }

    if (typeof item !== 'object' || item === null) {
        return { type: 'text', text: String(item) };
    }

    const obj = item as Record<string, unknown>;
    const type = obj.type as string;

    switch (type) {
        case 'text':
            return {
                type: 'text',
                text: obj.text as string,
            };

        case 'image':
            return {
                type: 'image',
                url: obj.url as string | undefined,
                base64: obj.base64 as string | undefined,
                mimeType: obj.mimeType as string | undefined,
            };

        case 'file':
            return {
                type: 'file',
                url: obj.url as string | undefined,
                base64: obj.base64 as string | undefined,
                mimeType: obj.mimeType as string | undefined,
                filename: obj.filename as string | undefined,
            };

        case 'cloud_file':
            return {
                type: 'cloud_file',
                provider: obj.provider as string,
                fileId: obj.fileId as string,
                filename: obj.filename as string | undefined,
            };

        default:
            // Try to extract text from common properties
            if ('text' in obj) {
                return { type: 'text', text: obj.text as string };
            }
            if ('content' in obj) {
                return { type: 'text', text: obj.content as string };
            }
            return { type: 'text', text: JSON.stringify(obj) };
    }
}

/**
 * Extract text from message content
 */
export function extractTextFromContent(content: MessageContent[]): string {
    return content
        .filter((c): c is TextContent => c.type === 'text')
        .map((c) => c.text)
        .join('\n');
}

// ============================================================================
// TOOL RULE CONVERTERS
// ============================================================================

export interface ToolRuleInput {
    type: string;
    toolName: string;
    children?: string[];
    maxCount?: number;
}

export interface ToolRuleOutput {
    type: string;
    tool_name: string;
    children?: string[];
    max_count?: number;
}

/**
 * Convert tool rules from camelCase to snake_case
 */
export function convertToolRulesToSnakeCase(rules: ToolRuleInput[]): ToolRuleOutput[] {
    return rules.map((rule) => ({
        type: rule.type,
        tool_name: rule.toolName,
        children: rule.children,
        max_count: rule.maxCount,
    }));
}

/**
 * Convert tool rules from snake_case to camelCase
 */
export function convertToolRulesToCamelCase(rules: ToolRuleOutput[]): ToolRuleInput[] {
    return rules.map((rule) => ({
        type: rule.type,
        toolName: rule.tool_name,
        children: rule.children,
        maxCount: rule.max_count,
    }));
}

// ============================================================================
// CASE CONVERSION UTILITIES
// ============================================================================

/**
 * Convert string from camelCase to snake_case
 */
export function camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert string from snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert object keys from camelCase to snake_case
 */
export function objectToSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = camelToSnake(key);
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[snakeKey] = objectToSnakeCase(value as Record<string, unknown>);
        } else if (Array.isArray(value)) {
            result[snakeKey] = value.map((item) =>
                typeof item === 'object' && item !== null
                    ? objectToSnakeCase(item as Record<string, unknown>)
                    : item
            );
        } else {
            result[snakeKey] = value;
        }
    }
    return result;
}

/**
 * Convert object keys from snake_case to camelCase
 */
export function objectToCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = snakeToCamel(key);
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[camelKey] = objectToCamelCase(value as Record<string, unknown>);
        } else if (Array.isArray(value)) {
            result[camelKey] = value.map((item) =>
                typeof item === 'object' && item !== null
                    ? objectToCamelCase(item as Record<string, unknown>)
                    : item
            );
        } else {
            result[camelKey] = value;
        }
    }
    return result;
}
