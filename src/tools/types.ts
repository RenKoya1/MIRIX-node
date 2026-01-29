/**
 * Tool System Type Definitions
 * Defines the core types for the MIRIX tool system
 */

import { z } from 'zod';
import { ToolType, ToolSourceType } from '@prisma/client';

// ============================================================================
// TOOL EXECUTION TYPES
// ============================================================================

/**
 * Result of a tool execution
 */
export interface ToolExecutionResult {
    success: boolean;
    result?: unknown;
    error?: string;
    executionTime?: number;
}

/**
 * Context provided to tools during execution
 */
export interface ToolExecutionContext {
    agentId: string;
    userId: string;
    organizationId: string;
    clientId?: string;
    messageId?: string;
    stepId?: string;
}

/**
 * Tool call request from LLM
 */
export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}

/**
 * Tool return value
 */
export interface ToolReturn {
    toolCallId: string;
    name: string;
    result: unknown;
    error?: string;
}

// ============================================================================
// TOOL DEFINITION TYPES
// ============================================================================

/**
 * JSON Schema for tool parameters
 */
export interface ToolParameterSchema {
    type: 'object';
    properties: Record<string, {
        type: string;
        description?: string;
        enum?: string[];
        items?: { type: string };
        default?: unknown;
    }>;
    required?: string[];
    additionalProperties?: boolean;
}

/**
 * Tool definition
 */
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: ToolParameterSchema;
    returnCharLimit?: number;
    toolType: ToolType;
    sourceType: ToolSourceType;
    handler?: ToolHandler;
    tags?: string[];
}

/**
 * Tool handler function signature
 */
export type ToolHandler = (
    args: Record<string, unknown>,
    context: ToolExecutionContext
) => Promise<ToolExecutionResult>;

// ============================================================================
// TOOL RULE TYPES
// ============================================================================

/**
 * Rule types for controlling tool availability
 */
export enum ToolRuleType {
    InitToolRule = 'InitToolRule',
    TerminalToolRule = 'TerminalToolRule',
    ChildToolRule = 'ChildToolRule',
    ConditionalToolRule = 'ConditionalToolRule',
    MaxCountToolRule = 'MaxCountToolRule',
    RequiredToolRule = 'RequiredToolRule',
}

/**
 * Base interface for tool rules
 */
export interface BaseToolRule {
    type: ToolRuleType;
    toolName: string;
}

/**
 * InitToolRule - Tool must be called first
 */
export interface InitToolRule extends BaseToolRule {
    type: ToolRuleType.InitToolRule;
}

/**
 * TerminalToolRule - When called, ends the agent's turn
 */
export interface TerminalToolRule extends BaseToolRule {
    type: ToolRuleType.TerminalToolRule;
}

/**
 * ChildToolRule - Specifies valid child tools
 */
export interface ChildToolRule extends BaseToolRule {
    type: ToolRuleType.ChildToolRule;
    children: string[];
}

/**
 * ConditionalToolRule - Tool available based on condition
 */
export interface ConditionalToolRule extends BaseToolRule {
    type: ToolRuleType.ConditionalToolRule;
    condition: string; // Expression to evaluate
}

/**
 * MaxCountToolRule - Limit tool calls per session
 */
export interface MaxCountToolRule extends BaseToolRule {
    type: ToolRuleType.MaxCountToolRule;
    maxCount: number;
}

/**
 * RequiredToolRule - Tool must be called eventually
 */
export interface RequiredToolRule extends BaseToolRule {
    type: ToolRuleType.RequiredToolRule;
}

export type ToolRule =
    | InitToolRule
    | TerminalToolRule
    | ChildToolRule
    | ConditionalToolRule
    | MaxCountToolRule
    | RequiredToolRule;

// ============================================================================
// MCP (MODEL CONTEXT PROTOCOL) TYPES
// ============================================================================

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
    id: string;
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
    timeout?: number;
}

/**
 * MCP Tool definition (from server)
 */
export interface MCPToolDefinition {
    name: string;
    description?: string;
    inputSchema: ToolParameterSchema;
}

/**
 * MCP Resource definition
 */
export interface MCPResource {
    uri: string;
    name?: string;
    description?: string;
    mimeType?: string;
}

/**
 * MCP Prompt definition
 */
export interface MCPPrompt {
    name: string;
    description?: string;
    arguments?: {
        name: string;
        description?: string;
        required?: boolean;
    }[];
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const ToolCallSchema = z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.record(z.unknown()),
});

export const ToolReturnSchema = z.object({
    toolCallId: z.string(),
    name: z.string(),
    result: z.unknown(),
    error: z.string().optional(),
});

export const ToolExecutionResultSchema = z.object({
    success: z.boolean(),
    result: z.unknown().optional(),
    error: z.string().optional(),
    executionTime: z.number().optional(),
});

export const MCPServerConfigSchema = z.object({
    id: z.string(),
    name: z.string(),
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
    cwd: z.string().optional(),
    timeout: z.number().optional(),
});
