/**
 * Tool Registry
 * Central registry for managing and accessing tools
 */

import { ToolType } from '@prisma/client';
import {
    ToolDefinition,
    ToolHandler,
    ToolExecutionContext,
    ToolExecutionResult,
    ToolParameterSchema,
} from './types.js';
import { logger } from '../log.js';
import { NotFoundError, ValidationError } from '../errors.js';

// ============================================================================
// TOOL REGISTRY
// ============================================================================

class ToolRegistry {
    private tools: Map<string, ToolDefinition> = new Map();
    private readonly logger = logger;

    /**
     * Register a tool in the registry
     */
    register(definition: ToolDefinition): void {
        if (this.tools.has(definition.name)) {
            this.logger.warn(
                { toolName: definition.name },
                'Overwriting existing tool registration'
            );
        }

        this.tools.set(definition.name, definition);
        this.logger.debug({ toolName: definition.name }, 'Tool registered');
    }

    /**
     * Register multiple tools at once
     */
    registerMany(definitions: ToolDefinition[]): void {
        for (const definition of definitions) {
            this.register(definition);
        }
    }

    /**
     * Unregister a tool
     */
    unregister(name: string): boolean {
        const existed = this.tools.delete(name);
        if (existed) {
            this.logger.debug({ toolName: name }, 'Tool unregistered');
        }
        return existed;
    }

    /**
     * Get a tool by name
     */
    get(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    /**
     * Get a tool by name or throw
     */
    getOrThrow(name: string): ToolDefinition {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new NotFoundError('Tool', name);
        }
        return tool;
    }

    /**
     * Check if a tool exists
     */
    has(name: string): boolean {
        return this.tools.has(name);
    }

    /**
     * Get all registered tools
     */
    getAll(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get tools by type
     */
    getByType(toolType: ToolType): ToolDefinition[] {
        return this.getAll().filter((t) => t.toolType === toolType);
    }

    /**
     * Get tools by tags
     */
    getByTags(tags: string[]): ToolDefinition[] {
        return this.getAll().filter((t) =>
            t.tags?.some((tag) => tags.includes(tag))
        );
    }

    /**
     * Get tool names
     */
    getNames(): string[] {
        return Array.from(this.tools.keys());
    }

    /**
     * Get tool count
     */
    get size(): number {
        return this.tools.size;
    }

    /**
     * Clear all registered tools
     */
    clear(): void {
        this.tools.clear();
        this.logger.debug('All tools cleared from registry');
    }

    /**
     * Execute a tool by name
     */
    async execute(
        name: string,
        args: Record<string, unknown>,
        context: ToolExecutionContext
    ): Promise<ToolExecutionResult> {
        const tool = this.getOrThrow(name);

        if (!tool.handler) {
            throw new ValidationError(`Tool '${name}' has no handler`, {
                field: 'handler',
            });
        }

        const startTime = Date.now();

        try {
            this.logger.debug({ toolName: name, args }, 'Executing tool');

            const result = await tool.handler(args, context);
            const executionTime = Date.now() - startTime;

            // Apply return char limit if specified
            if (tool.returnCharLimit && result.result) {
                const resultStr = typeof result.result === 'string'
                    ? result.result
                    : JSON.stringify(result.result);

                if (resultStr.length > tool.returnCharLimit) {
                    result.result = resultStr.substring(0, tool.returnCharLimit) + '...';
                }
            }

            this.logger.debug(
                { toolName: name, success: result.success, executionTime },
                'Tool execution completed'
            );

            return { ...result, executionTime };
        } catch (error) {
            const executionTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            this.logger.error(
                { toolName: name, error: errorMessage, executionTime },
                'Tool execution failed'
            );

            return {
                success: false,
                error: errorMessage,
                executionTime,
            };
        }
    }

    /**
     * Validate tool arguments against schema
     */
    validateArgs(
        name: string,
        args: Record<string, unknown>
    ): { valid: boolean; errors: string[] } {
        const tool = this.getOrThrow(name);
        const schema = tool.parameters;
        const errors: string[] = [];

        // Check required fields
        if (schema.required) {
            for (const required of schema.required) {
                if (!(required in args) || args[required] === undefined) {
                    errors.push(`Missing required parameter: ${required}`);
                }
            }
        }

        // Check types
        for (const [key, value] of Object.entries(args)) {
            const propSchema = schema.properties[key];

            if (!propSchema) {
                if (schema.additionalProperties === false) {
                    errors.push(`Unknown parameter: ${key}`);
                }
                continue;
            }

            const expectedType = propSchema.type;
            const actualType = Array.isArray(value) ? 'array' : typeof value;

            if (expectedType === 'integer' && actualType === 'number') {
                if (!Number.isInteger(value)) {
                    errors.push(`Parameter '${key}' must be an integer`);
                }
            } else if (expectedType !== actualType && value !== null) {
                errors.push(
                    `Parameter '${key}' must be of type ${expectedType}, got ${actualType}`
                );
            }

            // Check enum
            if (propSchema.enum && !propSchema.enum.includes(value as string)) {
                errors.push(
                    `Parameter '${key}' must be one of: ${propSchema.enum.join(', ')}`
                );
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Get tool definitions for LLM (OpenAI format)
     */
    getForLLM(names?: string[]): Array<{
        type: 'function';
        function: {
            name: string;
            description: string;
            parameters: ToolParameterSchema;
        };
    }> {
        const tools = names
            ? names.map((n) => this.getOrThrow(n))
            : this.getAll();

        return tools.map((tool) => ({
            type: 'function' as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
            },
        }));
    }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a simple tool definition
 */
export function createTool(
    name: string,
    description: string,
    parameters: ToolParameterSchema,
    handler: ToolHandler,
    options: {
        toolType?: ToolType;
        returnCharLimit?: number;
        tags?: string[];
    } = {}
): ToolDefinition {
    return {
        name,
        description,
        parameters,
        handler,
        toolType: options.toolType ?? 'custom',
        sourceType: 'json',
        returnCharLimit: options.returnCharLimit,
        tags: options.tags,
    };
}

export default toolRegistry;
