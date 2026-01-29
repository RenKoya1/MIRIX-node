/**
 * Core Memory Tools
 * Tools for reading and modifying core memory blocks
 */

import { ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types';
import { blockManager } from '../../services/block-manager';
import { logger } from '../../log';

// ============================================================================
// CORE MEMORY READ TOOL
// ============================================================================

async function handleCoreMemoryGet(
    args: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const label = args.label as string | undefined;

    try {
        const blocks = await blockManager.getAgentBlocks(
            context.agentId,
            { id: context.userId, organizationId: context.organizationId }
        );

        if (label) {
            const block = blocks.find((b) => b.label === label);
            if (!block) {
                return {
                    success: false,
                    error: `Block with label '${label}' not found`,
                };
            }
            return {
                success: true,
                result: {
                    label: block.label,
                    value: block.value,
                    limit: block.limit,
                },
            };
        }

        return {
            success: true,
            result: blocks.map((b) => ({
                label: b.label,
                value: b.value,
                limit: b.limit,
            })),
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ error: errorMessage }, 'core_memory_get failed');
        return {
            success: false,
            error: errorMessage,
        };
    }
}

export const coreMemoryGetTool: ToolDefinition = {
    name: 'core_memory_get',
    description: 'Retrieves core memory blocks. If label is provided, returns that specific block. Otherwise returns all blocks.',
    parameters: {
        type: 'object',
        properties: {
            label: {
                type: 'string',
                description: 'The label of the specific block to retrieve (optional)',
            },
        },
        additionalProperties: false,
    },
    handler: handleCoreMemoryGet,
    toolType: 'mirix_memory_core',
    sourceType: 'json',
    tags: ['memory', 'core-memory', 'read'],
};

// ============================================================================
// CORE MEMORY UPDATE TOOL
// ============================================================================

async function handleCoreMemoryUpdate(
    args: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const label = args.label as string;
    const value = args.value as string;

    if (!label || !value) {
        return {
            success: false,
            error: 'Both label and value are required',
        };
    }

    try {
        const actor = { id: context.userId, organizationId: context.organizationId };
        const blocks = await blockManager.getAgentBlocks(context.agentId, actor);
        const block = blocks.find((b) => b.label === label);

        if (!block) {
            return {
                success: false,
                error: `Block with label '${label}' not found`,
            };
        }

        await blockManager.updateValue(block.id, value, actor);

        logger.debug(
            { agentId: context.agentId, label, valueLength: value.length },
            'core_memory_update completed'
        );

        return {
            success: true,
            result: {
                label,
                newValue: value.substring(0, 100) + (value.length > 100 ? '...' : ''),
                updatedAt: new Date().toISOString(),
            },
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ error: errorMessage }, 'core_memory_update failed');
        return {
            success: false,
            error: errorMessage,
        };
    }
}

export const coreMemoryUpdateTool: ToolDefinition = {
    name: 'core_memory_update',
    description: 'Updates a core memory block with new content. Use this to store important information.',
    parameters: {
        type: 'object',
        properties: {
            label: {
                type: 'string',
                description: 'The label of the block to update (e.g., "persona", "human", "notes")',
            },
            value: {
                type: 'string',
                description: 'The new content to store in the block',
            },
        },
        required: ['label', 'value'],
        additionalProperties: false,
    },
    handler: handleCoreMemoryUpdate,
    toolType: 'mirix_memory_core',
    sourceType: 'json',
    tags: ['memory', 'core-memory', 'write'],
};

// ============================================================================
// CORE MEMORY APPEND TOOL
// ============================================================================

async function handleCoreMemoryAppend(
    args: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const label = args.label as string;
    const content = args.content as string;

    if (!label || !content) {
        return {
            success: false,
            error: 'Both label and content are required',
        };
    }

    try {
        const actor = { id: context.userId, organizationId: context.organizationId };
        const blocks = await blockManager.getAgentBlocks(context.agentId, actor);
        const block = blocks.find((b) => b.label === label);

        if (!block) {
            return {
                success: false,
                error: `Block with label '${label}' not found`,
            };
        }

        const newValue = block.value + '\n' + content;

        if (block.limit && newValue.length > block.limit) {
            return {
                success: false,
                error: `Appending would exceed block limit of ${block.limit} characters`,
            };
        }

        await blockManager.updateValue(block.id, newValue, actor);

        logger.debug(
            { agentId: context.agentId, label, appendedLength: content.length },
            'core_memory_append completed'
        );

        return {
            success: true,
            result: {
                label,
                appendedContent: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
                newLength: newValue.length,
                updatedAt: new Date().toISOString(),
            },
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ error: errorMessage }, 'core_memory_append failed');
        return {
            success: false,
            error: errorMessage,
        };
    }
}

export const coreMemoryAppendTool: ToolDefinition = {
    name: 'core_memory_append',
    description: 'Appends content to a core memory block. Use this to add information without replacing existing content.',
    parameters: {
        type: 'object',
        properties: {
            label: {
                type: 'string',
                description: 'The label of the block to append to',
            },
            content: {
                type: 'string',
                description: 'The content to append to the block',
            },
        },
        required: ['label', 'content'],
        additionalProperties: false,
    },
    handler: handleCoreMemoryAppend,
    toolType: 'mirix_memory_core',
    sourceType: 'json',
    tags: ['memory', 'core-memory', 'write'],
};

// ============================================================================
// EXPORTS
// ============================================================================

export const coreMemoryTools = [
    coreMemoryGetTool,
    coreMemoryUpdateTool,
    coreMemoryAppendTool,
];

export default coreMemoryTools;
