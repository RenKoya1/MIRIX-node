/**
 * Block schemas for Mirix TypeScript
 * Block represents a reserved section of the LLM's context window which is editable.
 * Converted from: mirix/schemas/block.py
 */

import { z } from 'zod';
import { createIdSchema, IdPrefix } from './mirix_base';
import { CORE_MEMORY_BLOCK_CHAR_LIMIT } from '../constants';

// -------------------------------
// Character Limit Validation
// -------------------------------

/**
 * Refinement function to verify character limit.
 */
function verifyCharLimit(data: { value?: string | null; limit: number }, ctx: z.RefinementCtx) {
    if (data.value && data.value.length > data.limit) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Edit failed: Exceeds ${data.limit} character limit (requested ${data.value.length}).`,
            path: ['value'],
        });
    }
}

// -------------------------------
// Base Block Schema (without refinement for extension)
// -------------------------------

/**
 * Base block fields without refinement.
 * Use this for extending.
 */
const BaseBlockFieldsSchema = z.object({
    /** Value of the block */
    value: z.string().nullable().optional().describe('Value of the block.'),
    /** Character limit of the block */
    limit: z.number().int().default(CORE_MEMORY_BLOCK_CHAR_LIMIT).describe('Character limit of the block.'),
    /** Label of the block (e.g. "human", "persona") in the context window */
    label: z.string().nullable().optional().describe('Label of the block (e.g. "human", "persona") in the context window.'),
});

/**
 * Base block of the LLM context with validation.
 * Contains the core fields shared by all block types.
 */
export const BaseBlockSchema = BaseBlockFieldsSchema.superRefine(verifyCharLimit);

export type BaseBlock = z.infer<typeof BaseBlockSchema>;

// -------------------------------
// Block Schema (Full Entity)
// -------------------------------

/**
 * Block fields schema (without refinement for extension).
 */
const BlockFieldsSchema = BaseBlockFieldsSchema.extend({
    /** Unique identifier for the block */
    id: createIdSchema(IdPrefix.BLOCK),
    /** The unique identifier of the user associated with the block */
    userId: z.string().nullable().optional().describe('The unique identifier of the user associated with the block.'),
    /** The unique identifier of the agent associated with the block */
    agentId: z.string().nullable().optional().describe('The unique identifier of the agent associated with the block.'),
    /** The unique identifier of the organization associated with the block */
    organizationId: z.string().nullable().optional().describe('The unique identifier of the organization associated with the block.'),
    /** The id of the user that made this Block */
    createdById: z.string().nullable().optional().describe('The id of the user that made this Block.'),
    /** The id of the user that last updated this Block */
    lastUpdatedById: z.string().nullable().optional().describe('The id of the user that last updated this Block.'),
});

/**
 * A Block represents a reserved section of the LLM's context window which is editable.
 * Block objects contained in the Memory object, which is able to edit the Block values.
 */
export const BlockSchema = BlockFieldsSchema.superRefine(verifyCharLimit);

export type Block = z.infer<typeof BlockSchema>;

// -------------------------------
// Human Block Schema
// -------------------------------

/**
 * Human block of the LLM context.
 * Represents information about the human user.
 */
export const HumanBlockSchema = BlockFieldsSchema.extend({
    label: z.literal('human').default('human'),
}).superRefine(verifyCharLimit);

export type HumanBlock = z.infer<typeof HumanBlockSchema>;

// -------------------------------
// Persona Block Schema
// -------------------------------

/**
 * Persona block of the LLM context.
 * Represents the agent's personality and identity.
 */
export const PersonaBlockSchema = BlockFieldsSchema.extend({
    label: z.literal('persona').default('persona'),
}).superRefine(verifyCharLimit);

export type PersonaBlock = z.infer<typeof PersonaBlockSchema>;

// -------------------------------
// Block Label Update Schema
// -------------------------------

/**
 * Update the label of a block.
 */
export const BlockLabelUpdateSchema = z.object({
    /** Current label of the block */
    currentLabel: z.string().describe('Current label of the block.'),
    /** New label of the block */
    newLabel: z.string().describe('New label of the block.'),
});

export type BlockLabelUpdate = z.infer<typeof BlockLabelUpdateSchema>;

// -------------------------------
// Block Update Schema
// -------------------------------

/**
 * Update a block.
 */
export const BlockUpdateSchema = z.object({
    /** Character limit of the block */
    limit: z.number().int().optional().default(CORE_MEMORY_BLOCK_CHAR_LIMIT).describe('Character limit of the block.'),
    /** Value of the block */
    value: z.string().nullable().optional().describe('Value of the block.'),
}).superRefine((data, ctx) => {
    // Verify character limit
    if (data.value && data.limit && data.value.length > data.limit) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Edit failed: Exceeds ${data.limit} character limit (requested ${data.value.length}).`,
            path: ['value'],
        });
    }
});

export type BlockUpdate = z.infer<typeof BlockUpdateSchema>;

// -------------------------------
// Block Limit Update Schema
// -------------------------------

/**
 * Update the limit of a block.
 */
export const BlockLimitUpdateSchema = z.object({
    /** Label of the block */
    label: z.string().describe('Label of the block.'),
    /** New limit of the block */
    limit: z.number().int().describe('New limit of the block.'),
});

export type BlockLimitUpdate = z.infer<typeof BlockLimitUpdateSchema>;

// -------------------------------
// Create Block Schema
// -------------------------------

/**
 * Create block fields schema (without refinement for extension).
 */
const CreateBlockFieldsSchema = z.object({
    /** Label of the block */
    label: z.string().describe('Label of the block.'),
    /** Character limit of the block */
    limit: z.number().int().default(CORE_MEMORY_BLOCK_CHAR_LIMIT).describe('Character limit of the block.'),
    /** Value of the block */
    value: z.string().describe('Value of the block.'),
});

/**
 * Create a block.
 */
export const CreateBlockSchema = CreateBlockFieldsSchema.superRefine(verifyCharLimit);

export type CreateBlock = z.infer<typeof CreateBlockSchema>;

// -------------------------------
// Create Human Block Schema
// -------------------------------

/**
 * Create a human block.
 */
export const CreateHumanBlockSchema = CreateBlockFieldsSchema.extend({
    label: z.literal('human').default('human'),
}).superRefine(verifyCharLimit);

export type CreateHumanBlock = z.infer<typeof CreateHumanBlockSchema>;

// -------------------------------
// Create Persona Block Schema
// -------------------------------

/**
 * Create a persona block.
 */
export const CreatePersonaBlockSchema = CreateBlockFieldsSchema.extend({
    label: z.literal('persona').default('persona'),
}).superRefine(verifyCharLimit);

export type CreatePersonaBlock = z.infer<typeof CreatePersonaBlockSchema>;

// -------------------------------
// Create Block Template Schemas
// -------------------------------

/**
 * Create a block template.
 */
export const CreateBlockTemplateSchema = CreateBlockSchema;

export type CreateBlockTemplate = z.infer<typeof CreateBlockTemplateSchema>;

/**
 * Create a human block template.
 */
export const CreateHumanBlockTemplateSchema = CreateHumanBlockSchema;

export type CreateHumanBlockTemplate = z.infer<typeof CreateHumanBlockTemplateSchema>;

/**
 * Create a persona block template.
 */
export const CreatePersonaBlockTemplateSchema = CreatePersonaBlockSchema;

export type CreatePersonaBlockTemplate = z.infer<typeof CreatePersonaBlockTemplateSchema>;

// -------------------------------
// Helper Functions
// -------------------------------

/**
 * Create a new block with generated ID.
 */
export function createBlock(data: Omit<Block, 'id'> & { id?: string }): Block {
    return BlockSchema.parse(data);
}

/**
 * Create a new human block with generated ID.
 */
export function createHumanBlock(data: Omit<HumanBlock, 'id' | 'label'> & { id?: string }): HumanBlock {
    return HumanBlockSchema.parse({ ...data, label: 'human' });
}

/**
 * Create a new persona block with generated ID.
 */
export function createPersonaBlock(data: Omit<PersonaBlock, 'id' | 'label'> & { id?: string }): PersonaBlock {
    return PersonaBlockSchema.parse({ ...data, label: 'persona' });
}

/**
 * Validate that a block value is within the character limit.
 */
export function validateBlockCharLimit(value: string, limit: number = CORE_MEMORY_BLOCK_CHAR_LIMIT): boolean {
    return value.length <= limit;
}
