/**
 * Memory Schemas for Mirix TypeScript
 * Converted from:
 *   - mirix/schemas/memory.py
 *   - mirix/schemas/episodic_memory.py
 *   - mirix/schemas/semantic_memory.py
 *   - mirix/schemas/procedural_memory.py
 *   - mirix/schemas/resource_memory.py
 *   - mirix/schemas/knowledge.py
 */

import { z } from 'zod';
import { generateId, IdPrefix } from './mirix_base';
import { Block, BlockSchema } from './block';
import { MAX_EMBEDDING_DIM, CORE_MEMORY_BLOCK_CHAR_LIMIT } from '../constants';
import { getUtcTime, getUtcTimeIso } from '../utils';

// Re-export Block for convenience
export { Block, BlockSchema };

// Re-export utility functions from utils.ts (for backward compatibility)
export { getUtcTime, getUtcTimeIso };

/**
 * Pad an embedding array to MAX_EMBEDDING_DIM
 */
export function padEmbedding(embedding: number[] | null | undefined): number[] | null {
    if (!embedding || embedding.length === 0) {
        return null;
    }
    if (embedding.length === MAX_EMBEDDING_DIM) {
        return embedding;
    }
    const padded = new Array(MAX_EMBEDDING_DIM).fill(0);
    for (let i = 0; i < embedding.length; i++) {
        padded[i] = embedding[i];
    }
    return padded;
}

/**
 * Add line numbers to a string (for memory display)
 */
export function lineNumbers(value: string, prefix: string = 'Line '): string {
    return value
        .split('\n')
        .map((line, idx) => `${prefix}${idx + 1}:\t${line}`)
        .join('\n');
}

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * Last modification info schema
 */
export const LastModifySchema = z.object({
    timestamp: z.string().describe('ISO timestamp of the modification'),
    operation: z.string().describe('Type of operation (created, updated, deleted)'),
});

export type LastModify = z.infer<typeof LastModifySchema>;

/**
 * Filter tags schema for flexible filtering and categorization
 */
export const FilterTagsSchema = z.record(z.any()).nullable().optional()
    .describe('Custom filter tags for filtering and categorization');

export type FilterTags = z.infer<typeof FilterTagsSchema>;

/**
 * Embedding configuration schema (simplified)
 */
export const EmbeddingConfigSchema = z.object({
    model: z.string().describe('Embedding model name'),
    embeddingEndpointType: z.string().describe('Endpoint type for embeddings'),
    embeddingEndpoint: z.string().nullable().optional().describe('Endpoint URL'),
    embeddingDim: z.number().describe('Embedding dimension'),
}).nullable().optional();

export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;

// ============================================================================
// Memory (Core Memory) Schemas
// ============================================================================

/**
 * Archival memory summary schema
 */
export const ArchivalMemorySummarySchema = z.object({
    size: z.number().describe('Number of rows in archival memory'),
});

export type ArchivalMemorySummary = z.infer<typeof ArchivalMemorySummarySchema>;

/**
 * Recall memory summary schema
 */
export const RecallMemorySummarySchema = z.object({
    size: z.number().describe('Number of rows in recall memory'),
});

export type RecallMemorySummary = z.infer<typeof RecallMemorySummarySchema>;

/**
 * Create archival memory request schema
 */
export const CreateArchivalMemorySchema = z.object({
    text: z.string().describe('Text to write to archival memory'),
});

export type CreateArchivalMemory = z.infer<typeof CreateArchivalMemorySchema>;

/**
 * Update memory request schema
 */
export const UpdateMemorySchema = z.object({});

export type UpdateMemory = z.infer<typeof UpdateMemorySchema>;

/**
 * Context window overview schema
 */
export const ContextWindowOverviewSchema = z.object({
    // Top-level information
    contextWindowSizeMax: z.number().describe('The maximum amount of tokens the context window can hold'),
    contextWindowSizeCurrent: z.number().describe('The current number of tokens in the context window'),

    // Context window breakdown (in messages)
    numMessages: z.number().describe('The number of messages in the context window'),
    numArchivalMemory: z.number().describe('The number of messages in the archival memory'),
    numRecallMemory: z.number().describe('The number of messages in the recall memory'),
    numTokensExternalMemorySummary: z.number().describe('The number of tokens in the external memory summary'),
    externalMemorySummary: z.string().describe('The metadata summary of the external memory sources'),

    // Context window breakdown (in tokens)
    numTokensSystem: z.number().describe('The number of tokens in the system prompt'),
    systemPrompt: z.string().describe('The content of the system prompt'),

    numTokensCoreMemory: z.number().describe('The number of tokens in the core memory'),
    coreMemory: z.string().describe('The content of the core memory'),

    numTokensSummaryMemory: z.number().describe('The number of tokens in the summary memory'),
    summaryMemory: z.string().nullable().optional().describe('The content of the summary memory'),

    numTokensFunctionsDefinitions: z.number().describe('The number of tokens in the functions definitions'),
    functionsDefinitions: z.array(z.any()).nullable().optional().describe('The content of the functions definitions'),

    numTokensMessages: z.number().describe('The number of tokens in the messages list'),
    messages: z.array(z.any()).describe('The messages in the context window'),
});

export type ContextWindowOverview = z.infer<typeof ContextWindowOverviewSchema>;

/**
 * Block usage statistics
 */
export interface BlockUsageStats {
    currentSize: number;
    limit: number;
    percentage: number;
    status: 'good' | 'moderate' | 'warning' | 'critical';
    recommendation: string;
}

/**
 * Memory class for managing core memory blocks
 */
export class Memory {
    blocks: Block[];
    promptTemplate: string;

    constructor(blocks: Block[] = []) {
        this.blocks = blocks;
        this.promptTemplate = this.getDefaultTemplate();
    }

    private getDefaultTemplate(): string {
        // Simple template - actual Jinja2 would need a template engine
        return 'default';
    }

    /**
     * Get the current Jinja2 template string
     */
    getPromptTemplate(): string {
        return this.promptTemplate;
    }

    /**
     * Set a new template string
     */
    setPromptTemplate(template: string): void {
        this.promptTemplate = template;
    }

    /**
     * Get usage statistics for a specific block
     */
    getBlockUsageStats(label: string): BlockUsageStats {
        const block = this.getBlock(label);
        const value = block.value ?? '';
        const currentSize = value.length;
        const limit = block.limit;
        const percentage = Math.floor((currentSize / limit) * 100);

        let status: BlockUsageStats['status'];
        let recommendation: string;

        if (percentage >= 90) {
            status = 'critical';
            recommendation = 'USE core_memory_rewrite NOW';
        } else if (percentage >= 75) {
            status = 'warning';
            recommendation = 'Consider using core_memory_rewrite soon';
        } else if (percentage >= 50) {
            status = 'moderate';
            recommendation = 'Healthy usage';
        } else {
            status = 'good';
            recommendation = 'Plenty of space available';
        }

        return { currentSize, limit, percentage, status, recommendation };
    }

    /**
     * Compile memory blocks into a prompt string
     */
    compile(): string {
        const blocks = this.blocks ?? [];
        return blocks.map(block => {
            const value = block.value ?? '';
            const blockLabel = block.label ?? 'unknown';
            const percentage = Math.floor((value.length / block.limit) * 100);
            let status = '';
            if (percentage >= 90) {
                status = ' - NEARLY FULL - USE core_memory_rewrite TO CONDENSE';
            } else if (percentage >= 75) {
                status = ' - Getting Full - Consider Rewriting Soon';
            }
            const header = `<${blockLabel} characters="${value.length}/${block.limit}" (${percentage}% full)${status}>`;
            const content = lineNumbers(value);
            const footer = `</${blockLabel}>`;
            return `${header}\n${content}\n${footer}`;
        }).join('\n');
    }

    /**
     * Return a list of the block labels
     */
    listBlockLabels(): string[] {
        return (this.blocks ?? []).map(block => block.label).filter((label): label is string => label != null);
    }

    /**
     * Get a block by label
     */
    getBlock(label: string): Block {
        const blocks = this.blocks ?? [];
        const block = blocks.find(b => b.label === label);
        if (!block) {
            const keys = blocks.map(b => b.label);
            throw new Error(`Block field ${label} does not exist (available sections = ${keys.join(', ')})`);
        }
        return block;
    }

    /**
     * Get all blocks
     */
    getBlocks(): Block[] {
        return this.blocks ?? [];
    }

    /**
     * Set a block (add or update)
     */
    setBlock(block: Block): void {
        if (!this.blocks) {
            this.blocks = [];
        }
        const index = this.blocks.findIndex(b => b.label === block.label);
        if (index >= 0) {
            this.blocks[index] = block;
        } else {
            this.blocks.push(block);
        }
    }

    /**
     * Update the value of a block
     */
    updateBlockValue(label: string, value: string): void {
        if (typeof value !== 'string') {
            throw new Error('Provided value must be a string');
        }
        if (!this.blocks) {
            this.blocks = [];
        }
        const block = this.blocks.find(b => b.label === label);
        if (!block) {
            throw new Error(`Block with label ${label} does not exist`);
        }
        block.value = value;
    }
}

/**
 * BasicBlockMemory - basic implementation of Memory with block editing functions
 */
export class BasicBlockMemory extends Memory {
    constructor(blocks: Block[] = []) {
        super(blocks);
    }
}

/**
 * ChatMemory - initializes with persona and human blocks
 */
export class ChatMemory extends BasicBlockMemory {
    constructor(
        persona: string,
        human: string,
        userId: string,
        limit: number = CORE_MEMORY_BLOCK_CHAR_LIMIT
    ) {
        super([
            {
                id: generateId(IdPrefix.BLOCK),
                value: persona,
                limit,
                label: 'persona',
                userId,
            },
            {
                id: generateId(IdPrefix.BLOCK),
                value: human,
                limit,
                label: 'human',
                userId,
            },
        ]);
    }
}

// ============================================================================
// Episodic Memory Schemas
// ============================================================================

/**
 * Base schema for episodic memory events
 */
export const EpisodicEventBaseSchema = z.object({
    eventType: z.string().describe('Type/category of the episodic event (e.g., user_message, inference)'),
    summary: z.string().describe('Short textual summary of the event'),
    details: z.string().describe('Detailed description or text for the event'),
    actor: z.string().describe('The actor who generated the event (user or assistant)'),
});

export type EpisodicEventBase = z.infer<typeof EpisodicEventBaseSchema>;

/**
 * Schema for creating a new episodic memory record (for LLM output)
 */
export const EpisodicEventForLLMSchema = EpisodicEventBaseSchema.extend({
    occurredAt: z.string().describe("When the event happened (format: 'YYYY-MM-DD HH:MM:SS')"),
});

export type EpisodicEventForLLM = z.infer<typeof EpisodicEventForLLMSchema>;

/**
 * Full episodic memory event schema
 */
export const EpisodicEventSchema = EpisodicEventBaseSchema.extend({
    id: z.string().optional().default(() => generateId(IdPrefix.EPISODIC_MEMORY))
        .describe('Unique identifier for the episodic event'),
    agentId: z.string().nullable().optional()
        .describe('The id of the agent this episodic event belongs to'),
    clientId: z.string().nullable().optional()
        .describe('The id of the client application that created this event'),
    userId: z.string().describe('The id of the user who generated the episodic event'),
    occurredAt: z.date().default(() => getUtcTime())
        .describe('When the event actually happened'),
    createdAt: z.date().default(() => getUtcTime())
        .describe('Timestamp when this memory record was created'),
    updatedAt: z.date().nullable().optional()
        .describe('When this memory record was last updated'),
    lastModify: LastModifySchema.default(() => ({
        timestamp: getUtcTimeIso(),
        operation: 'created',
    })).describe('Last modification info'),
    organizationId: z.string().describe('Unique identifier of the organization'),
    detailsEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the event details'),
    summaryEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the summary'),
    embeddingConfig: EmbeddingConfigSchema
        .describe('The embedding configuration used'),
    filterTags: FilterTagsSchema
        .describe('Custom filter tags for filtering and categorization'),
});

export type EpisodicEvent = z.infer<typeof EpisodicEventSchema>;

/**
 * Schema for updating an episodic memory record
 */
export const EpisodicEventUpdateSchema = z.object({
    id: z.string().describe('Unique ID for this episodic memory record'),
    agentId: z.string().nullable().optional()
        .describe('The id of the agent this episodic event belongs to'),
    eventType: z.string().nullable().optional()
        .describe('Type/category of the event'),
    summary: z.string().nullable().optional()
        .describe('Short textual summary of the event'),
    details: z.string().nullable().optional()
        .describe('Detailed text describing the event'),
    organizationId: z.string().nullable().optional()
        .describe('Unique identifier of the organization'),
    occurredAt: z.date().nullable().optional()
        .describe("If the event's time is updated"),
    updatedAt: z.date().default(() => getUtcTime())
        .describe('Timestamp when this memory record was last updated'),
    lastModify: LastModifySchema.nullable().optional()
        .describe('Last modification info'),
    summaryEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the summary'),
    detailsEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the event'),
    embeddingConfig: EmbeddingConfigSchema
        .describe('The embedding configuration used'),
    filterTags: FilterTagsSchema
        .describe('Custom filter tags for filtering and categorization'),
});

export type EpisodicEventUpdate = z.infer<typeof EpisodicEventUpdateSchema>;

// ============================================================================
// Semantic Memory Schemas
// ============================================================================

/**
 * Base schema for semantic memory items
 */
export const SemanticMemoryItemBaseSchema = z.object({
    name: z.string().describe('The name or main concept/object for the knowledge entry'),
    summary: z.string().describe('A concise explanation or summary of the concept'),
    details: z.string().describe('Detailed explanation or additional context for the concept'),
    source: z.string().describe('Reference or origin of this information'),
});

export type SemanticMemoryItemBase = z.infer<typeof SemanticMemoryItemBaseSchema>;

/**
 * Full semantic memory item schema
 */
export const SemanticMemoryItemSchema = SemanticMemoryItemBaseSchema.extend({
    id: z.string().optional().default(() => generateId(IdPrefix.SEMANTIC_MEMORY))
        .describe('Unique identifier for the semantic memory item'),
    agentId: z.string().nullable().optional()
        .describe('The id of the agent this semantic memory item belongs to'),
    clientId: z.string().nullable().optional()
        .describe('The id of the client application that created this item'),
    userId: z.string().describe('The id of the user who generated the semantic memory'),
    createdAt: z.date().default(() => getUtcTime())
        .describe('Creation timestamp'),
    updatedAt: z.date().nullable().optional()
        .describe('Last update timestamp'),
    lastModify: LastModifySchema.default(() => ({
        timestamp: getUtcTimeIso(),
        operation: 'created',
    })).describe('Last modification info'),
    organizationId: z.string().describe('The unique identifier of the organization'),
    detailsEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the details'),
    nameEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the name'),
    summaryEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the summary'),
    embeddingConfig: EmbeddingConfigSchema
        .describe('The embedding configuration used'),
    filterTags: FilterTagsSchema
        .describe('Custom filter tags for filtering and categorization'),
});

export type SemanticMemoryItem = z.infer<typeof SemanticMemoryItemSchema>;

/**
 * Schema for updating a semantic memory item
 */
export const SemanticMemoryItemUpdateSchema = z.object({
    id: z.string().describe('Unique ID for this semantic memory entry'),
    agentId: z.string().nullable().optional()
        .describe('The id of the agent this semantic memory item belongs to'),
    name: z.string().nullable().optional()
        .describe('The name or main concept for the knowledge entry'),
    summary: z.string().nullable().optional()
        .describe('A concise explanation or summary of the concept'),
    details: z.string().nullable().optional()
        .describe('Detailed explanation or additional context for the concept'),
    source: z.string().nullable().optional()
        .describe('Reference or origin of this information'),
    actor: z.string().nullable().optional()
        .describe('The actor who generated the semantic memory'),
    organizationId: z.string().nullable().optional()
        .describe('The organization ID'),
    updatedAt: z.date().default(() => getUtcTime())
        .describe('Update timestamp'),
    lastModify: LastModifySchema.nullable().optional()
        .describe('Last modification info'),
    detailsEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the details'),
    nameEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the name'),
    summaryEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the summary'),
    embeddingConfig: EmbeddingConfigSchema
        .describe('The embedding configuration used'),
    filterTags: FilterTagsSchema
        .describe('Custom filter tags for filtering and categorization'),
});

export type SemanticMemoryItemUpdate = z.infer<typeof SemanticMemoryItemUpdateSchema>;

/**
 * Response schema for semantic memory item
 */
export const SemanticMemoryItemResponseSchema = SemanticMemoryItemSchema;

export type SemanticMemoryItemResponse = z.infer<typeof SemanticMemoryItemResponseSchema>;

// ============================================================================
// Procedural Memory Schemas
// ============================================================================

/**
 * Base schema for procedural memory items
 */
export const ProceduralMemoryItemBaseSchema = z.object({
    entryType: z.string().describe("Category (e.g., 'workflow', 'guide', 'script')"),
    summary: z.string().describe('Short descriptive text about the procedure'),
    steps: z.array(z.string()).describe('Step-by-step instructions as a list of strings'),
});

export type ProceduralMemoryItemBase = z.infer<typeof ProceduralMemoryItemBaseSchema>;

/**
 * Full procedural memory item schema
 */
export const ProceduralMemoryItemSchema = ProceduralMemoryItemBaseSchema.extend({
    id: z.string().optional().default(() => generateId(IdPrefix.PROCEDURAL_MEMORY))
        .describe('Unique identifier for the procedural memory item'),
    agentId: z.string().nullable().optional()
        .describe('The id of the agent this procedural memory item belongs to'),
    clientId: z.string().nullable().optional()
        .describe('The id of the client application that created this item'),
    userId: z.string().describe('The id of the user who generated the procedure'),
    createdAt: z.date().default(() => getUtcTime())
        .describe('Creation timestamp'),
    updatedAt: z.date().nullable().optional()
        .describe('Last update timestamp'),
    lastModify: LastModifySchema.default(() => ({
        timestamp: getUtcTimeIso(),
        operation: 'created',
    })).describe('Last modification info'),
    organizationId: z.string().describe('The unique identifier of the organization'),
    summaryEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the summary'),
    stepsEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the steps'),
    embeddingConfig: EmbeddingConfigSchema
        .describe('The embedding configuration used'),
    filterTags: FilterTagsSchema
        .describe('Custom filter tags for filtering and categorization'),
});

export type ProceduralMemoryItem = z.infer<typeof ProceduralMemoryItemSchema>;

/**
 * Schema for updating a procedural memory item
 */
export const ProceduralMemoryItemUpdateSchema = z.object({
    id: z.string().describe('Unique ID for this procedural memory entry'),
    agentId: z.string().nullable().optional()
        .describe('The id of the agent this procedural memory item belongs to'),
    entryType: z.string().nullable().optional()
        .describe("Category (e.g., 'workflow', 'guide', 'script')"),
    summary: z.string().nullable().optional()
        .describe('Short descriptive text'),
    steps: z.array(z.string()).nullable().optional()
        .describe('Step-by-step instructions as a list of strings'),
    organizationId: z.string().nullable().optional()
        .describe('The organization ID'),
    updatedAt: z.date().default(() => getUtcTime())
        .describe('Update timestamp'),
    lastModify: LastModifySchema.nullable().optional()
        .describe('Last modification info'),
    stepsEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the steps'),
    summaryEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the summary'),
    embeddingConfig: EmbeddingConfigSchema
        .describe('The embedding configuration used'),
    filterTags: FilterTagsSchema
        .describe('Custom filter tags for filtering and categorization'),
});

export type ProceduralMemoryItemUpdate = z.infer<typeof ProceduralMemoryItemUpdateSchema>;

/**
 * Response schema for procedural memory item
 */
export const ProceduralMemoryItemResponseSchema = ProceduralMemoryItemSchema;

export type ProceduralMemoryItemResponse = z.infer<typeof ProceduralMemoryItemResponseSchema>;

// ============================================================================
// Resource Memory Schemas
// ============================================================================

/**
 * Base schema for resource memory items
 */
export const ResourceMemoryItemBaseSchema = z.object({
    title: z.string().describe('Short name/title of the resource'),
    summary: z.string().describe('Short description or summary of the resource'),
    resourceType: z.string().describe("File type or format (e.g. 'doc', 'markdown', 'pdf_text')"),
    content: z.string().describe('Full or partial text content of the resource'),
});

export type ResourceMemoryItemBase = z.infer<typeof ResourceMemoryItemBaseSchema>;

/**
 * Full resource memory item schema
 */
export const ResourceMemoryItemSchema = ResourceMemoryItemBaseSchema.extend({
    id: z.string().optional().default(() => generateId(IdPrefix.RESOURCE_MEMORY))
        .describe('Unique identifier for the resource memory item'),
    agentId: z.string().nullable().optional()
        .describe('The id of the agent this resource memory item belongs to'),
    clientId: z.string().nullable().optional()
        .describe('The id of the client application that created this item'),
    userId: z.string().describe('The id of the user who generated the resource'),
    createdAt: z.date().default(() => getUtcTime())
        .describe('Creation timestamp'),
    updatedAt: z.date().nullable().optional()
        .describe('Last update timestamp'),
    lastModify: LastModifySchema.default(() => ({
        timestamp: getUtcTimeIso(),
        operation: 'created',
    })).describe('Last modification info'),
    organizationId: z.string().describe('The unique identifier of the organization'),
    summaryEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the summary'),
    embeddingConfig: EmbeddingConfigSchema
        .describe('The embedding configuration used'),
    filterTags: FilterTagsSchema
        .describe('Custom filter tags for filtering and categorization'),
});

export type ResourceMemoryItem = z.infer<typeof ResourceMemoryItemSchema>;

/**
 * Schema for updating a resource memory item
 */
export const ResourceMemoryItemUpdateSchema = z.object({
    id: z.string().describe('Unique ID for this resource memory entry'),
    agentId: z.string().nullable().optional()
        .describe('The id of the agent this resource memory item belongs to'),
    title: z.string().nullable().optional()
        .describe('Short name/title of the resource'),
    summary: z.string().nullable().optional()
        .describe('Short description or summary of the resource'),
    resourceType: z.string().nullable().optional()
        .describe("File type/format (e.g. 'doc', 'markdown')"),
    content: z.string().nullable().optional()
        .describe('Full or partial text content'),
    organizationId: z.string().nullable().optional()
        .describe('The organization ID'),
    updatedAt: z.date().default(() => getUtcTime())
        .describe('Update timestamp'),
    lastModify: LastModifySchema.nullable().optional()
        .describe('Last modification info'),
    summaryEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the summary'),
    embeddingConfig: EmbeddingConfigSchema
        .describe('The embedding configuration used'),
    filterTags: FilterTagsSchema
        .describe('Custom filter tags for filtering and categorization'),
});

export type ResourceMemoryItemUpdate = z.infer<typeof ResourceMemoryItemUpdateSchema>;

/**
 * Response schema for resource memory item
 */
export const ResourceMemoryItemResponseSchema = ResourceMemoryItemSchema;

export type ResourceMemoryItemResponse = z.infer<typeof ResourceMemoryItemResponseSchema>;

// ============================================================================
// Knowledge Memory Schemas
// ============================================================================

/**
 * Base schema for knowledge items
 */
export const KnowledgeItemBaseSchema = z.object({
    entryType: z.string().describe("Category (e.g., 'credential', 'bookmark', 'api_key')"),
    source: z.string().describe('Information on who/where it was provided'),
    sensitivity: z.string().describe("Data sensitivity level ('low', 'medium', 'high')"),
    secretValue: z.string().describe('The actual credential or data value'),
    caption: z.string().describe("Description of the knowledge item (e.g. 'API key for OpenAI Service')"),
});

export type KnowledgeItemBase = z.infer<typeof KnowledgeItemBaseSchema>;

/**
 * Full knowledge item schema
 */
export const KnowledgeItemSchema = KnowledgeItemBaseSchema.extend({
    id: z.string().optional().default(() => generateId(IdPrefix.KNOWLEDGE))
        .describe('Unique identifier for the knowledge item'),
    agentId: z.string().nullable().optional()
        .describe('The id of the agent this knowledge item belongs to'),
    clientId: z.string().nullable().optional()
        .describe('The id of the client application that created this item'),
    userId: z.string().describe('The id of the user who generated the knowledge item'),
    createdAt: z.date().default(() => getUtcTime())
        .describe('The creation date of the knowledge item'),
    updatedAt: z.date().nullable().optional()
        .describe('The last update date of the knowledge item'),
    lastModify: LastModifySchema.default(() => ({
        timestamp: getUtcTimeIso(),
        operation: 'created',
    })).describe('Last modification info'),
    organizationId: z.string().describe('The unique identifier of the organization'),
    captionEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the caption'),
    embeddingConfig: EmbeddingConfigSchema
        .describe('The embedding configuration used'),
    filterTags: FilterTagsSchema
        .describe('Custom filter tags for filtering and categorization'),
});

export type KnowledgeItem = z.infer<typeof KnowledgeItemSchema>;

/**
 * Schema for creating a new knowledge item
 */
export const KnowledgeItemCreateSchema = KnowledgeItemBaseSchema;

export type KnowledgeItemCreate = z.infer<typeof KnowledgeItemCreateSchema>;

/**
 * Schema for updating a knowledge item
 */
export const KnowledgeItemUpdateSchema = z.object({
    id: z.string().describe('Unique ID for this knowledge entry'),
    agentId: z.string().nullable().optional()
        .describe('The id of the agent this knowledge item belongs to'),
    entryType: z.string().nullable().optional()
        .describe("Category (e.g., 'credential', 'bookmark', 'api_key')"),
    source: z.string().nullable().optional()
        .describe('Information on who/where it was provided'),
    sensitivity: z.string().nullable().optional()
        .describe("Data sensitivity level ('low', 'medium', 'high')"),
    secretValue: z.string().nullable().optional()
        .describe('The actual credential or data value'),
    organizationId: z.string().nullable().optional()
        .describe('The unique identifier of the organization'),
    updatedAt: z.date().default(() => getUtcTime())
        .describe('The update date'),
    lastModify: LastModifySchema.nullable().optional()
        .describe('Last modification info'),
    captionEmbedding: z.array(z.number()).nullable().optional()
        .transform(padEmbedding)
        .describe('The embedding of the caption'),
    embeddingConfig: EmbeddingConfigSchema
        .describe('The embedding configuration used'),
    filterTags: FilterTagsSchema
        .describe('Custom filter tags for filtering and categorization'),
});

export type KnowledgeItemUpdate = z.infer<typeof KnowledgeItemUpdateSchema>;

/**
 * Response schema for knowledge item
 */
export const KnowledgeItemResponseSchema = KnowledgeItemSchema;

export type KnowledgeItemResponse = z.infer<typeof KnowledgeItemResponseSchema>;
