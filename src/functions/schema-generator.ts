/**
 * Schema Generator
 * Generates JSON schemas from TypeScript function definitions
 */

import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

export interface FunctionSchema {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, PropertySchema>;
        required: string[];
    };
}

export interface PropertySchema {
    type: string;
    description?: string;
    enum?: string[];
    items?: PropertySchema;
    properties?: Record<string, PropertySchema>;
    default?: unknown;
}

// ============================================================================
// ZOD TO JSON SCHEMA
// ============================================================================

/**
 * Convert Zod schema to JSON schema
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): PropertySchema {
    const def = schema._def;

    // Handle ZodString
    if (def.typeName === 'ZodString') {
        return { type: 'string', description: def.description };
    }

    // Handle ZodNumber
    if (def.typeName === 'ZodNumber') {
        return { type: 'number', description: def.description };
    }

    // Handle ZodBoolean
    if (def.typeName === 'ZodBoolean') {
        return { type: 'boolean', description: def.description };
    }

    // Handle ZodArray
    if (def.typeName === 'ZodArray') {
        return {
            type: 'array',
            items: zodToJsonSchema(def.type),
            description: def.description,
        };
    }

    // Handle ZodObject
    if (def.typeName === 'ZodObject') {
        const shape = def.shape();
        const properties: Record<string, PropertySchema> = {};
        const required: string[] = [];

        for (const [key, value] of Object.entries(shape)) {
            properties[key] = zodToJsonSchema(value as z.ZodTypeAny);
            if (!isOptional(value as z.ZodTypeAny)) {
                required.push(key);
            }
        }

        return {
            type: 'object',
            properties,
            description: def.description,
        };
    }

    // Handle ZodEnum
    if (def.typeName === 'ZodEnum') {
        return {
            type: 'string',
            enum: def.values,
            description: def.description,
        };
    }

    // Handle ZodOptional
    if (def.typeName === 'ZodOptional') {
        return zodToJsonSchema(def.innerType);
    }

    // Handle ZodNullable
    if (def.typeName === 'ZodNullable') {
        return zodToJsonSchema(def.innerType);
    }

    // Handle ZodDefault
    if (def.typeName === 'ZodDefault') {
        const inner = zodToJsonSchema(def.innerType);
        inner.default = def.defaultValue();
        return inner;
    }

    // Handle ZodUnion
    if (def.typeName === 'ZodUnion') {
        // Simplify to first option for JSON schema
        return zodToJsonSchema(def.options[0]);
    }

    // Handle ZodLiteral
    if (def.typeName === 'ZodLiteral') {
        const value = def.value;
        return {
            type: typeof value as string,
            enum: [value],
            description: def.description,
        };
    }

    // Handle ZodRecord
    if (def.typeName === 'ZodRecord') {
        return {
            type: 'object',
            description: def.description,
        };
    }

    // Default to unknown
    return { type: 'object', description: def.description };
}

/**
 * Check if a Zod schema is optional
 */
function isOptional(schema: z.ZodTypeAny): boolean {
    const def = schema._def;
    return (
        def.typeName === 'ZodOptional' ||
        def.typeName === 'ZodNullable' ||
        def.typeName === 'ZodDefault'
    );
}

// ============================================================================
// FUNCTION SCHEMA BUILDER
// ============================================================================

/**
 * Build a function schema from name, description, and Zod parameters
 */
export function buildFunctionSchema(
    name: string,
    description: string,
    parameters: z.ZodObject<z.ZodRawShape>
): FunctionSchema {
    const shape = parameters._def.shape();
    const properties: Record<string, PropertySchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(value as z.ZodTypeAny);
        if (!isOptional(value as z.ZodTypeAny)) {
            required.push(key);
        }
    }

    return {
        name,
        description,
        parameters: {
            type: 'object',
            properties,
            required,
        },
    };
}

// ============================================================================
// OPENAI FORMAT CONVERSION
// ============================================================================

/**
 * Convert function schema to OpenAI tool format
 */
export function toOpenAITool(schema: FunctionSchema): {
    type: 'function';
    function: FunctionSchema;
} {
    return {
        type: 'function',
        function: schema,
    };
}

/**
 * Convert multiple function schemas to OpenAI tools format
 */
export function toOpenAITools(schemas: FunctionSchema[]): Array<{
    type: 'function';
    function: FunctionSchema;
}> {
    return schemas.map(toOpenAITool);
}

// ============================================================================
// ANTHROPIC FORMAT CONVERSION
// ============================================================================

/**
 * Convert function schema to Anthropic tool format
 */
export function toAnthropicTool(schema: FunctionSchema): {
    name: string;
    description: string;
    input_schema: {
        type: 'object';
        properties: Record<string, PropertySchema>;
        required: string[];
    };
} {
    return {
        name: schema.name,
        description: schema.description,
        input_schema: schema.parameters,
    };
}

/**
 * Convert multiple function schemas to Anthropic tools format
 */
export function toAnthropicTools(schemas: FunctionSchema[]): Array<{
    name: string;
    description: string;
    input_schema: {
        type: 'object';
        properties: Record<string, PropertySchema>;
        required: string[];
    };
}> {
    return schemas.map(toAnthropicTool);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a simple string parameter schema
 */
export function stringParam(description: string): PropertySchema {
    return { type: 'string', description };
}

/**
 * Create a simple number parameter schema
 */
export function numberParam(description: string): PropertySchema {
    return { type: 'number', description };
}

/**
 * Create a simple boolean parameter schema
 */
export function booleanParam(description: string): PropertySchema {
    return { type: 'boolean', description };
}

/**
 * Create an enum parameter schema
 */
export function enumParam(description: string, values: string[]): PropertySchema {
    return { type: 'string', description, enum: values };
}

/**
 * Create an array parameter schema
 */
export function arrayParam(description: string, items: PropertySchema): PropertySchema {
    return { type: 'array', description, items };
}

/**
 * Create an object parameter schema
 */
export function objectParam(
    description: string,
    properties: Record<string, PropertySchema>
): PropertySchema {
    return { type: 'object', description, properties };
}
