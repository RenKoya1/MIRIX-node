/**
 * Tool Rule Schemas for Mirix TypeScript
 * Converted from: mirix/schemas/tool_rule.py
 */

import { z } from 'zod';
import { ToolRuleType } from './enums.js';
import { createIdSchema, IdPrefix } from './mirix_base.js';

/**
 * Base Tool Rule Schema
 * All tool rules extend from this base schema
 */
export const BaseToolRuleSchema = z.object({
    id: createIdSchema(IdPrefix.TOOL),
    toolName: z.string().describe(
        'The name of the tool. Must exist in the database for the user\'s organization.'
    ),
    type: z.nativeEnum(ToolRuleType).describe('The type of the tool rule.'),
});

export type BaseToolRule = z.infer<typeof BaseToolRuleSchema>;

/**
 * Child Tool Rule Schema
 * A ToolRule represents a tool that can be invoked by the agent.
 * When this tool is called, it constrains the next tool to be one of the children.
 */
export const ChildToolRuleSchema = BaseToolRuleSchema.extend({
    type: z.literal(ToolRuleType.CONSTRAIN_CHILD_TOOLS),
    children: z.array(z.string()).describe('The children tools that can be invoked.'),
});

export type ChildToolRule = z.infer<typeof ChildToolRuleSchema>;

/**
 * Parent Tool Rule Schema
 * A ToolRule that only allows a child tool to be called if the parent has been called.
 */
export const ParentToolRuleSchema = BaseToolRuleSchema.extend({
    type: z.literal(ToolRuleType.PARENT_LAST_TOOL),
    children: z.array(z.string()).describe('The children tools that can be invoked.'),
});

export type ParentToolRule = z.infer<typeof ParentToolRuleSchema>;

/**
 * Conditional Tool Rule Schema
 * A ToolRule that conditionally maps to different child tools based on the output.
 */
export const ConditionalToolRuleSchema = BaseToolRuleSchema.extend({
    type: z.literal(ToolRuleType.CONDITIONAL),
    defaultChild: z.string().nullable().optional().describe(
        'The default child tool to be called. If null, any tool can be called.'
    ),
    childOutputMapping: z.record(z.string()).describe(
        'The output case to check for mapping'
    ),
    requireOutputMapping: z.boolean().default(false).describe(
        'Whether to throw an error when output doesn\'t match any case'
    ),
});

export type ConditionalToolRule = z.infer<typeof ConditionalToolRuleSchema>;

/**
 * Init Tool Rule Schema
 * Represents the initial tool rule configuration.
 * This tool must run first before any other tools.
 */
export const InitToolRuleSchema = BaseToolRuleSchema.extend({
    type: z.literal(ToolRuleType.RUN_FIRST),
});

export type InitToolRule = z.infer<typeof InitToolRuleSchema>;

/**
 * Terminal Tool Rule Schema
 * Represents a terminal tool rule configuration where if this tool gets called,
 * it must end the agent loop.
 */
export const TerminalToolRuleSchema = BaseToolRuleSchema.extend({
    type: z.literal(ToolRuleType.EXIT_LOOP),
});

export type TerminalToolRule = z.infer<typeof TerminalToolRuleSchema>;

/**
 * Continue Tool Rule Schema
 * Represents a tool rule configuration where if this tool gets called,
 * it must continue the agent loop.
 */
export const ContinueToolRuleSchema = BaseToolRuleSchema.extend({
    type: z.literal(ToolRuleType.CONTINUE_LOOP),
});

export type ContinueToolRule = z.infer<typeof ContinueToolRuleSchema>;

/**
 * Max Count Per Step Tool Rule Schema
 * Represents a tool rule configuration which constrains the total number of times
 * this tool can be invoked in a single step.
 */
export const MaxCountPerStepToolRuleSchema = BaseToolRuleSchema.extend({
    type: z.literal(ToolRuleType.MAX_COUNT_PER_STEP),
    maxCountLimit: z.number().int().positive().describe(
        'The max limit for the total number of times this tool can be invoked in a single step.'
    ),
});

export type MaxCountPerStepToolRule = z.infer<typeof MaxCountPerStepToolRuleSchema>;

/**
 * Union of all tool rule types with discriminator
 */
export const ToolRuleSchema = z.discriminatedUnion('type', [
    ChildToolRuleSchema,
    ParentToolRuleSchema,
    ConditionalToolRuleSchema,
    InitToolRuleSchema,
    TerminalToolRuleSchema,
    ContinueToolRuleSchema,
    MaxCountPerStepToolRuleSchema,
]);

export type ToolRule = z.infer<typeof ToolRuleSchema>;

/**
 * Helper function to get valid tools based on tool call history
 * This is equivalent to the get_valid_tools method in Python
 */
export function getValidTools(
    rule: ToolRule,
    toolCallHistory: string[],
    availableTools: Set<string>,
    lastFunctionResponse?: string | null
): Set<string> {
    const lastTool = toolCallHistory.length > 0 ? toolCallHistory[toolCallHistory.length - 1] : null;

    switch (rule.type) {
        case ToolRuleType.CONSTRAIN_CHILD_TOOLS: {
            return lastTool === rule.toolName
                ? new Set(rule.children)
                : availableTools;
        }

        case ToolRuleType.PARENT_LAST_TOOL: {
            const childrenSet = new Set(rule.children);
            if (lastTool === rule.toolName) {
                return childrenSet;
            }
            // Return available tools minus children
            return new Set(Array.from(availableTools).filter(t => !childrenSet.has(t)));
        }

        case ToolRuleType.CONDITIONAL: {
            if (!toolCallHistory.length || lastTool !== rule.toolName) {
                return availableTools;
            }

            if (!lastFunctionResponse) {
                throw new Error(
                    'Conditional tool rule requires an LLM response to determine which child tool to use'
                );
            }

            let functionOutput: string;
            try {
                const jsonResponse = JSON.parse(lastFunctionResponse);
                functionOutput = jsonResponse.message ?? '';
            } catch {
                if (rule.requireOutputMapping) {
                    return new Set<string>();
                }
                return rule.defaultChild
                    ? new Set([rule.defaultChild])
                    : availableTools;
            }

            // Match function output to a mapped child tool
            for (const [key, tool] of Object.entries(rule.childOutputMapping)) {
                if (matchesKey(functionOutput, key)) {
                    return new Set([tool]);
                }
            }

            // If no match found, use default or allow all tools if no default is set
            if (rule.requireOutputMapping) {
                return new Set<string>();
            }

            return rule.defaultChild
                ? new Set([rule.defaultChild])
                : availableTools;
        }

        case ToolRuleType.MAX_COUNT_PER_STEP: {
            const count = toolCallHistory.filter(t => t === rule.toolName).length;
            if (count >= rule.maxCountLimit) {
                return new Set(Array.from(availableTools).filter(t => t !== rule.toolName));
            }
            return availableTools;
        }

        case ToolRuleType.RUN_FIRST:
        case ToolRuleType.EXIT_LOOP:
        case ToolRuleType.CONTINUE_LOOP:
            // These rules don't modify available tools
            return availableTools;

        default:
            return availableTools;
    }
}

/**
 * Helper function to determine if function output matches a mapping key
 */
function matchesKey(functionOutput: string, key: string): boolean {
    // Try boolean
    if (key === 'true' || key === 'false') {
        return functionOutput.toLowerCase() === key;
    }

    // Try number
    const numKey = Number(key);
    if (!isNaN(numKey)) {
        const numOutput = Number(functionOutput);
        if (!isNaN(numOutput)) {
            return numOutput === numKey;
        }
        return false;
    }

    // String comparison
    return functionOutput === key;
}
