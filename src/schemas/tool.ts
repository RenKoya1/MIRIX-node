/**
 * Tool schemas for Mirix TypeScript
 * Converted from: mirix/schemas/tool.py
 */

import { z } from 'zod';
import { ToolType } from './enums';
import { createIdSchema, IdPrefix } from './mirix_base';

/**
 * Default character limit for function return values (~300 words)
 * Note: This constant is also exported from constants.ts for convenience
 */
const FUNCTION_RETURN_CHAR_LIMIT = 60000;

/**
 * Base Tool schema with ID prefix
 */
const toolIdSchema = createIdSchema(IdPrefix.TOOL);

/**
 * Tool JSON Schema type (OpenAI function calling format)
 */
export const ToolJsonSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    parameters: z.record(z.unknown()).optional(),
}).passthrough();

export type ToolJsonSchema = z.infer<typeof ToolJsonSchema>;

/**
 * Tool schema - Representation of a tool that can be called by the agent
 *
 * A tool is a function that can be invoked by agents during execution.
 * Tools can be custom (user-defined with source code) or built-in (Mirix core tools).
 */
export const ToolSchema = z.object({
    /** The unique identifier of the tool */
    id: toolIdSchema,

    /** The type of the tool */
    toolType: z.nativeEnum(ToolType).default(ToolType.CUSTOM),

    /** The description of the tool */
    description: z.string().nullable().optional(),

    /** The type of the source code (e.g., 'python') */
    sourceType: z.string().nullable().optional(),

    /** The unique identifier of the organization associated with the tool */
    organizationId: z.string().nullable().optional(),

    /** The name of the function */
    name: z.string().nullable().optional(),

    /** Metadata tags */
    tags: z.array(z.string()).default([]),

    /** The source code of the function */
    sourceCode: z.string().nullable().optional(),

    /** The JSON schema of the function (OpenAI function calling format) */
    jsonSchema: ToolJsonSchema.nullable().optional(),

    /** The maximum number of characters in the response */
    returnCharLimit: z.number().int().default(FUNCTION_RETURN_CHAR_LIMIT),

    /** The id of the user that created this Tool */
    createdById: z.string().nullable().optional(),

    /** The id of the user that last updated this Tool */
    lastUpdatedById: z.string().nullable().optional(),
});

export type Tool = z.infer<typeof ToolSchema>;

/**
 * ToolCreate schema - Used when creating a new tool
 *
 * The source_code is required for custom tools.
 * Name and json_schema can be auto-generated from source_code.
 */
export const ToolCreateSchema = z.object({
    /** The name of the function (auto-generated from source_code if not provided) */
    name: z.string().nullable().optional(),

    /** The description of the tool */
    description: z.string().nullable().optional(),

    /** Metadata tags */
    tags: z.array(z.string()).default([]),

    /** The source code of the function */
    sourceCode: z.string(),

    /** The source type of the function */
    sourceType: z.string().default('python'),

    /** The JSON schema of the function (auto-generated from source_code if not provided) */
    jsonSchema: ToolJsonSchema.nullable().optional(),

    /** The maximum number of characters in the response */
    returnCharLimit: z.number().int().default(FUNCTION_RETURN_CHAR_LIMIT),
});

export type ToolCreate = z.infer<typeof ToolCreateSchema>;

/**
 * ToolUpdate schema - Used when updating an existing tool
 *
 * All fields are optional since this is a partial update.
 */
export const ToolUpdateSchema = z.object({
    /** The description of the tool */
    description: z.string().nullable().optional(),

    /** The name of the function */
    name: z.string().nullable().optional(),

    /** Metadata tags */
    tags: z.array(z.string()).nullable().optional(),

    /** The source code of the function */
    sourceCode: z.string().nullable().optional(),

    /** The type of the source code */
    sourceType: z.string().nullable().optional(),

    /** The JSON schema of the function (auto-generated from source_code if not provided) */
    jsonSchema: ToolJsonSchema.nullable().optional(),

    /** The maximum number of characters in the response */
    returnCharLimit: z.number().int().nullable().optional(),
}).passthrough(); // Allow extra fields without validation errors (matches Python Config extra="ignore")

export type ToolUpdate = z.infer<typeof ToolUpdateSchema>;

/**
 * ToolRunFromSource schema - Used to run a tool directly from source code
 */
export const ToolRunFromSourceSchema = z.object({
    /** The source code of the function */
    sourceCode: z.string(),

    /** The arguments to pass to the tool */
    args: z.record(z.unknown()),

    /** The environment variables to pass to the tool */
    envVars: z.record(z.string()).nullable().optional(),

    /** The name of the tool to run */
    name: z.string().nullable().optional(),

    /** The type of the source code */
    sourceType: z.string().nullable().optional(),
});

export type ToolRunFromSource = z.infer<typeof ToolRunFromSourceSchema>;

/**
 * Validates a Tool and populates missing fields (name, description) from jsonSchema
 *
 * This is a TypeScript equivalent of the Python model_validator.
 * Note: Schema generation from source code requires runtime tooling and is not included here.
 *
 * @param tool - The tool to validate
 * @returns The validated tool with populated fields
 */
export function validateAndPopulateTool(tool: Tool): Tool {
    const result = { ...tool };

    // For custom tools, ensure source_code is present
    if (result.toolType === ToolType.CUSTOM) {
        if (!result.sourceCode) {
            throw new Error(
                `Custom tool with id=${result.id} is missing sourceCode field.`
            );
        }
    }

    // For MCP tools, ensure json_schema is present
    if (result.toolType === ToolType.MIRIX_MCP) {
        if (!result.jsonSchema) {
            throw new Error(`MCP tool ${result.name} is missing jsonSchema field`);
        }
    }

    // Derive name from the JSON schema if not provided
    if (!result.name && result.jsonSchema?.name) {
        result.name = result.jsonSchema.name;
    }

    // Derive description from the JSON schema if not provided
    if (!result.description && result.jsonSchema?.description) {
        result.description = result.jsonSchema.description;
    }

    return result;
}
