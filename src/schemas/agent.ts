/**
 * Agent Schemas for Mirix TypeScript
 * Converted from: mirix/schemas/agent.py
 */

import { z } from 'zod';
import { OrmMetadataBaseSchema, generateId, IdPrefix } from './mirix_base.js';
import { LLMConfigSchema } from './llm_config.js';
import { ToolSchema } from './tool.js';
import { BlockSchema, CreateBlockSchema } from './block.js';
import {
    DEFAULT_EMBEDDING_CHUNK_SIZE,
    CORE_MEMORY_BLOCK_CHAR_LIMIT,
} from '../constants.js';
import {
    BaseToolRuleSchema,
    BaseToolRule,
    ChildToolRuleSchema,
    ChildToolRule,
    ParentToolRuleSchema,
    ParentToolRule,
    ConditionalToolRuleSchema,
    ConditionalToolRule,
    InitToolRuleSchema,
    InitToolRule,
    TerminalToolRuleSchema,
    TerminalToolRule,
    ContinueToolRuleSchema,
    ContinueToolRule,
    MaxCountPerStepToolRuleSchema,
    MaxCountPerStepToolRule,
    ToolRuleSchema,
    ToolRule,
    getValidTools,
} from './tool_rule.js';

// Re-export constants for convenience
export { DEFAULT_EMBEDDING_CHUNK_SIZE, CORE_MEMORY_BLOCK_CHAR_LIMIT };

// Re-export tool rule schemas and types from tool_rule.ts
export {
    BaseToolRuleSchema,
    BaseToolRule,
    ChildToolRuleSchema,
    ChildToolRule,
    ParentToolRuleSchema,
    ParentToolRule,
    ConditionalToolRuleSchema,
    ConditionalToolRule,
    InitToolRuleSchema,
    InitToolRule,
    TerminalToolRuleSchema,
    TerminalToolRule,
    ContinueToolRuleSchema,
    ContinueToolRule,
    MaxCountPerStepToolRuleSchema,
    MaxCountPerStepToolRule,
    ToolRuleSchema,
    ToolRule,
    getValidTools,
};

// -------------------------------
// Agent Type Enum
// -------------------------------

export const AgentType = {
    CODER_AGENT: 'coder_agent',
    CHAT_AGENT: 'chat_agent',
    REFLEXION_AGENT: 'reflexion_agent',
    BACKGROUND_AGENT: 'background_agent',
    EPISODIC_MEMORY_AGENT: 'episodic_memory_agent',
    PROCEDURAL_MEMORY_AGENT: 'procedural_memory_agent',
    RESOURCE_MEMORY_AGENT: 'resource_memory_agent',
    KNOWLEDGE_MEMORY_AGENT: 'knowledge_memory_agent',
    META_MEMORY_AGENT: 'meta_memory_agent',
    SEMANTIC_MEMORY_AGENT: 'semantic_memory_agent',
    CORE_MEMORY_AGENT: 'core_memory_agent',
    META_AGENT: 'meta_agent',
} as const;

export type AgentType = (typeof AgentType)[keyof typeof AgentType];

// -------------------------------
// Embedding Config Schema
// -------------------------------

export const EmbeddingEndpointType = {
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    BEDROCK: 'bedrock',
    COHERE: 'cohere',
    GOOGLE_AI: 'google_ai',
    AZURE: 'azure',
    GROQ: 'groq',
    OLLAMA: 'ollama',
    WEBUI: 'webui',
    WEBUI_LEGACY: 'webui-legacy',
    LMSTUDIO: 'lmstudio',
    LMSTUDIO_LEGACY: 'lmstudio-legacy',
    LLAMACPP: 'llamacpp',
    KOBOLDCPP: 'koboldcpp',
    VLLM: 'vllm',
    HUGGING_FACE: 'hugging-face',
    MISTRAL: 'mistral',
    TOGETHER: 'together',
} as const;

export type EmbeddingEndpointType = (typeof EmbeddingEndpointType)[keyof typeof EmbeddingEndpointType];

export const AgentEmbeddingConfigSchema = z.object({
    /** The endpoint type for the model */
    embeddingEndpointType: z.enum([
        'openai',
        'anthropic',
        'bedrock',
        'cohere',
        'google_ai',
        'azure',
        'groq',
        'ollama',
        'webui',
        'webui-legacy',
        'lmstudio',
        'lmstudio-legacy',
        'llamacpp',
        'koboldcpp',
        'vllm',
        'hugging-face',
        'mistral',
        'together',
    ]).describe('The endpoint type for the model'),

    /** The endpoint for the model (null if local) */
    embeddingEndpoint: z.string().nullable().optional().describe('The endpoint for the model (null if local)'),

    /** The model for the embedding */
    embeddingModel: z.string().describe('The model for the embedding'),

    /** The dimension of the embedding */
    embeddingDim: z.number().int().describe('The dimension of the embedding'),

    /** The chunk size of the embedding */
    embeddingChunkSize: z.number().int().default(DEFAULT_EMBEDDING_CHUNK_SIZE).optional().describe('The chunk size of the embedding'),

    /** The handle for this config */
    handle: z.string().nullable().optional().describe('The handle for this config, in the format provider/model-name'),

    /** Custom API key for this specific embedding configuration */
    apiKey: z.string().nullable().optional().describe('Custom API key for this specific embedding configuration'),

    /** Name of registered auth provider for dynamic header injection */
    authProvider: z.string().nullable().optional().describe('Name of registered auth provider for dynamic header injection'),

    // Azure only
    /** The Azure endpoint for the model */
    azureEndpoint: z.string().nullable().optional().describe('The Azure endpoint for the model'),

    /** The Azure version for the model */
    azureVersion: z.string().nullable().optional().describe('The Azure version for the model'),

    /** The Azure deployment for the model */
    azureDeployment: z.string().nullable().optional().describe('The Azure deployment for the model'),
});

export type AgentEmbeddingConfig = z.infer<typeof AgentEmbeddingConfigSchema>;

// -------------------------------
// Memory Schema (for Agent State)
// -------------------------------

export const MemorySchema = z.object({
    /** Memory blocks contained in the agent's in-context memory */
    blocks: z.array(BlockSchema).describe("Memory blocks contained in the agent's in-context memory"),

    /** Jinja2 template for compiling memory blocks into a prompt string */
    promptTemplate: z.string().default(
        '{% for block in blocks %}' +
        '{% set percentage = ((block.value|length / block.limit) * 100)|int %}' +
        '{% set status = \'\' %}' +
        '{% if percentage >= 90 %}' +
        '{% set status = \' NEARLY FULL - USE core_memory_rewrite TO CONDENSE\' %}' +
        '{% elif percentage >= 75 %}' +
        '{% set status = \' Getting Full - Consider Rewriting Soon\' %}' +
        '{% endif %}' +
        '<{{ block.label }} characters="{{ block.value|length }}/{{ block.limit }}" ({{ percentage }}% full){{ status }}>\\n' +
        '{{ block.value|line_numbers }}\\n' +
        '</{{ block.label }}>' +
        '{% if not loop.last %}\\n{% endif %}' +
        '{% endfor %}'
    ).describe('Jinja2 template for compiling memory blocks into a prompt string with usage statistics'),
});

export type AgentMemory = z.infer<typeof MemorySchema>;

// -------------------------------
// Usage Statistics Schema
// -------------------------------

export const UsageStatisticsSchema = z.object({
    /** Completion tokens */
    completionTokens: z.number().int().optional(),

    /** Prompt tokens */
    promptTokens: z.number().int().optional(),

    /** Total tokens */
    totalTokens: z.number().int().optional(),
});

export type UsageStatistics = z.infer<typeof UsageStatisticsSchema>;

// -------------------------------
// Message Schema (simplified for agent usage)
// -------------------------------

export const MessageSchema = z.object({
    /** The unique identifier of the message */
    id: z.string(),

    /** The date of the message */
    date: z.date(),

    /** The type of the message */
    messageType: z.string(),

    /** Message content (varies by type) */
    content: z.any().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

export const MessageCreateSchema = z.object({
    /** The type of the message */
    messageType: z.string(),

    /** Message content */
    content: z.any().optional(),
});

export type MessageCreate = z.infer<typeof MessageCreateSchema>;

// -------------------------------
// Agent State Schema
// -------------------------------

export const AgentStateSchema = OrmMetadataBaseSchema.extend({
    /** The id of the agent. Assigned by the database. */
    id: z.string().describe('The id of the agent. Assigned by the database.'),

    /** The name of the agent */
    name: z.string().describe('The name of the agent'),

    /** The list of tool rules */
    toolRules: z.array(ToolRuleSchema).nullable().optional().describe('The list of tool rules'),

    /** The ids of the messages in the agent's in-context memory */
    messageIds: z.array(z.string()).nullable().optional().describe("The ids of the messages in the agent's in-context memory"),

    /** The system prompt used by the agent */
    system: z.string().describe('The system prompt used by the agent'),

    /** The type of agent */
    agentType: z.nativeEnum(AgentType as unknown as { [k: string]: string }).describe('The type of agent'),

    /** The LLM configuration used by the agent */
    llmConfig: LLMConfigSchema.describe('The LLM configuration used by the agent'),

    /** Optional LLM configuration used for topic extraction */
    topicExtractionLlmConfig: LLMConfigSchema.nullable().optional().describe('Optional LLM configuration used for topic extraction'),

    /** The embedding configuration used by the agent */
    embeddingConfig: AgentEmbeddingConfigSchema.nullable().optional().describe('The embedding configuration used by the agent'),

    /** The unique identifier of the organization associated with the agent */
    organizationId: z.string().nullable().optional().describe('The unique identifier of the organization associated with the agent'),

    /** The description of the agent */
    description: z.string().nullable().optional().describe('The description of the agent'),

    /** The parent agent ID (for sub-agents in a meta-agent) */
    parentId: z.string().nullable().optional().describe('The parent agent ID (for sub-agents in a meta-agent)'),

    /** Child agents (sub-agents) if this is a parent agent - uses z.any() to avoid circular reference */
    children: z.array(z.lazy(() => z.any())).nullable().optional().describe('Child agents (sub-agents) if this is a parent agent'),

    /** The in-context memory of the agent */
    memory: MemorySchema.describe('The in-context memory of the agent'),

    /** The tools used by the agent */
    tools: z.array(ToolSchema).describe('The tools used by the agent'),

    /** List of connected MCP server names */
    mcpTools: z.array(z.string()).default([]).optional().describe("List of connected MCP server names (e.g., ['gmail-native'])"),

    /** Memory configuration including decay settings */
    memoryConfig: z.record(z.any()).nullable().optional().describe('Memory configuration including decay settings (fade_after_days, expire_after_days)'),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

// -------------------------------
// Create Agent Schema
// -------------------------------

/** Validate agent name */
function validateAgentName(name: string | null | undefined): string | null | undefined {
    if (!name) return name;

    // Length check
    if (name.length < 1 || name.length > 50) {
        throw new Error('Name length must be between 1 and 50 characters.');
    }

    // Regex for allowed characters (alphanumeric, spaces, hyphens, underscores)
    if (!/^[A-Za-z0-9 _-]+$/.test(name)) {
        throw new Error('Name contains invalid characters.');
    }

    return name;
}

/** Validate model handle format */
function validateModelHandle(model: string | null | undefined): string | null | undefined {
    if (!model) return model;

    const parts = model.split('/');
    if (parts.length < 2 || !parts[0] || !parts[1]) {
        throw new Error('The llm config handle should be in the format provider/model-name');
    }

    return model;
}

/** Validate embedding handle format */
function validateEmbeddingHandle(embedding: string | null | undefined): string | null | undefined {
    if (!embedding) return embedding;

    const parts = embedding.split('/');
    if (parts.length < 2 || !parts[0] || !parts[1]) {
        throw new Error('The embedding config handle should be in the format provider/model-name');
    }

    return embedding;
}

export const CreateAgentSchema = z.object({
    /** The name of the agent. If not provided, server will generate one. */
    name: z.string().nullable().optional()
        .transform(validateAgentName)
        .describe('The name of the agent. If not provided, server will generate one.'),

    /** The blocks to create in the agent's in-context memory */
    memoryBlocks: z.array(CreateBlockSchema).nullable().optional().describe("The blocks to create in the agent's in-context memory"),

    /** The tools used by the agent (legacy field) */
    tools: z.array(z.string()).nullable().optional().describe('The tools used by the agent'),

    /** The ids of the tools used by the agent */
    toolIds: z.array(z.string()).nullable().optional().describe('The ids of the tools used by the agent'),

    /** The tool rules governing the agent */
    toolRules: z.array(ToolRuleSchema).nullable().optional().describe('The tool rules governing the agent'),

    /** The system prompt used by the agent */
    system: z.string().nullable().optional().describe('The system prompt used by the agent'),

    /** The type of agent */
    agentType: z.nativeEnum(AgentType as unknown as { [k: string]: string }).default(AgentType.CHAT_AGENT).describe('The type of agent'),

    /** The LLM configuration used by the agent */
    llmConfig: LLMConfigSchema.nullable().optional().describe('The LLM configuration used by the agent'),

    /** Optional LLM configuration used for topic extraction */
    topicExtractionLlmConfig: LLMConfigSchema.nullable().optional().describe('Optional LLM configuration used for topic extraction'),

    /** The embedding configuration used by the agent */
    embeddingConfig: AgentEmbeddingConfigSchema.nullable().optional().describe('The embedding configuration used by the agent'),

    /** The initial set of messages to put in the agent's in-context memory */
    initialMessageSequence: z.array(MessageCreateSchema).nullable().optional().describe("The initial set of messages to put in the agent's in-context memory"),

    /** If true, attaches the Mirix core tools */
    includeBaseTools: z.boolean().default(true).describe('If true, attaches the Mirix core tools (e.g. archival_memory and core_memory related functions)'),

    /** If true, attaches the Mirix multi-agent tools */
    includeMultiAgentTools: z.boolean().default(false).describe('If true, attaches the Mirix multi-agent tools (e.g. sending a message to another agent)'),

    /** The parent agent ID (for sub-agents in a meta-agent) */
    parentId: z.string().nullable().optional().describe('The parent agent ID (for sub-agents in a meta-agent)'),

    /** The LLM configuration handle */
    model: z.string().nullable().optional()
        .transform(validateModelHandle)
        .describe('The LLM configuration handle used by the agent, specified in the format provider/model-name'),

    /** The embedding configuration handle */
    embedding: z.string().nullable().optional()
        .transform(validateEmbeddingHandle)
        .describe('The embedding configuration handle used by the agent, specified in the format provider/model-name'),

    /** The context window limit used by the agent */
    contextWindowLimit: z.number().int().nullable().optional().describe('The context window limit used by the agent'),

    /** The embedding chunk size used by the agent */
    embeddingChunkSize: z.number().int().default(DEFAULT_EMBEDDING_CHUNK_SIZE).optional().describe('The embedding chunk size used by the agent'),

    /** The template id used to configure the agent */
    fromTemplate: z.string().nullable().optional().describe('The template id used to configure the agent'),

    /** Whether the agent is a template */
    template: z.boolean().default(false).describe('Whether the agent is a template'),

    /** The project slug that the agent will be associated with */
    project: z.string().nullable().optional().describe('The project slug that the agent will be associated with'),

    /** The environment variables for tool execution specific to this agent */
    toolExecEnvironmentVariables: z.record(z.string()).nullable().optional().describe('The environment variables for tool execution specific to this agent'),

    /** The variables that should be set for the agent */
    memoryVariables: z.record(z.string()).nullable().optional().describe('The variables that should be set for the agent'),

    /** List of MCP server names to connect to this agent */
    mcpTools: z.array(z.string()).nullable().optional().describe('List of MCP server names to connect to this agent'),

    /** Memory configuration including decay settings */
    memoryConfig: z.record(z.any()).nullable().optional().describe('Memory configuration including decay settings (fade_after_days, expire_after_days)'),
});

export type CreateAgent = z.infer<typeof CreateAgentSchema>;

// -------------------------------
// Update Agent Schema
// -------------------------------

export const UpdateAgentSchema = z.object({
    /** The name of the agent */
    name: z.string().nullable().optional().describe('The name of the agent'),

    /** The ids of the tools used by the agent */
    toolIds: z.array(z.string()).nullable().optional().describe('The ids of the tools used by the agent'),

    /** The ids of the blocks used by the agent */
    blockIds: z.array(z.string()).nullable().optional().describe('The ids of the blocks used by the agent'),

    /** The system prompt used by the agent */
    system: z.string().nullable().optional().describe('The system prompt used by the agent'),

    /** The tool rules governing the agent */
    toolRules: z.array(ToolRuleSchema).nullable().optional().describe('The tool rules governing the agent'),

    /** The LLM configuration used by the agent */
    llmConfig: LLMConfigSchema.nullable().optional().describe('The LLM configuration used by the agent'),

    /** Optional LLM configuration used for topic extraction */
    topicExtractionLlmConfig: LLMConfigSchema.nullable().optional().describe('Optional LLM configuration used for topic extraction'),

    /** The embedding configuration used by the agent */
    embeddingConfig: AgentEmbeddingConfigSchema.nullable().optional().describe('The embedding configuration used by the agent'),

    /** If true, clear the embedding configuration */
    clearEmbeddingConfig: z.boolean().default(false).describe('If true, clear the embedding configuration'),

    /** The ids of the messages in the agent's in-context memory */
    messageIds: z.array(z.string()).nullable().optional().describe("The ids of the messages in the agent's in-context memory"),

    /** The description of the agent */
    description: z.string().nullable().optional().describe('The description of the agent'),

    /** The parent agent ID (for sub-agents in a meta-agent) */
    parentId: z.string().nullable().optional().describe('The parent agent ID (for sub-agents in a meta-agent)'),

    /** List of MCP server names to connect to this agent */
    mcpTools: z.array(z.string()).nullable().optional().describe('List of MCP server names to connect to this agent'),

    /** Memory configuration including decay settings */
    memoryConfig: z.record(z.any()).nullable().optional().describe('Memory configuration including decay settings (fade_after_days, expire_after_days)'),
}).passthrough(); // Allow extra fields (equivalent to extra = "ignore" in Pydantic)

export type UpdateAgent = z.infer<typeof UpdateAgentSchema>;

// -------------------------------
// Memory Block Config Schema
// -------------------------------

export const MemoryBlockConfigSchema = z.object({
    /** Label for the memory block (e.g., 'human', 'persona') */
    label: z.string().describe("Label for the memory block (e.g., 'human', 'persona')"),

    /** Initial value for the memory block */
    value: z.string().default('').describe('Initial value for the memory block'),

    /** Character limit for the block */
    limit: z.number().int().nullable().optional().describe('Character limit for the block'),
});

export type MemoryBlockConfig = z.infer<typeof MemoryBlockConfigSchema>;

// -------------------------------
// Memory Decay Config Schema
// -------------------------------

export const MemoryDecayConfigSchema = z.object({
    /** Memories older than this many days become inactive */
    fadeAfterDays: z.number().int().nullable().optional().describe('Memories older than this many days become inactive (excluded from retrieval). Set to null to disable fading.'),

    /** Memories older than this many days are permanently deleted */
    expireAfterDays: z.number().int().nullable().optional().describe('Memories older than this many days are permanently deleted. Set to null to disable expiration.'),
});

export type MemoryDecayConfig = z.infer<typeof MemoryDecayConfigSchema>;

// -------------------------------
// Memory Config Schema
// -------------------------------

export const MemoryConfigSchema = z.object({
    /** List of core memory blocks to create for core_memory_agent */
    core: z.array(MemoryBlockConfigSchema).default([
        { label: 'human', value: '', limit: null },
        { label: 'persona', value: 'I am a helpful assistant.', limit: null },
    ]).describe('List of core memory blocks to create for core_memory_agent'),

    /** Memory decay configuration */
    decay: MemoryDecayConfigSchema.nullable().optional().describe('Memory decay configuration. Controls automatic aging and cleanup of memories.'),
});

export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;

// -------------------------------
// Create Meta Agent Schema
// -------------------------------

export const CreateMetaAgentSchema = z.object({
    /** Optional name for the MetaAgent */
    name: z.string().nullable().optional().describe('Optional name for the MetaAgent. If null, a random name will be generated.'),

    /** List of memory agent names to create */
    agents: z.array(z.string()).default([
        'core_memory_agent',
        'resource_memory_agent',
        'semantic_memory_agent',
        'episodic_memory_agent',
        'procedural_memory_agent',
        'knowledge_memory_agent',
        'meta_memory_agent',
        'reflexion_agent',
        'background_agent',
    ]).describe("List of memory agent names to create. Each agent is specified as a string (e.g., 'episodic_memory_agent')."),

    /** Memory configuration containing blocks for core_memory_agent */
    memory: MemoryConfigSchema.nullable().optional().describe('Memory configuration containing blocks for core_memory_agent. If not provided, default blocks are created.'),

    /** Dictionary mapping agent names to their system prompt text */
    systemPrompts: z.record(z.string()).nullable().optional().describe('Dictionary mapping agent names to their system prompt text. Takes precedence over system_prompts_folder.'),

    /** LLM configuration for memory agents */
    llmConfig: LLMConfigSchema.nullable().optional().describe('LLM configuration for memory agents. Required if no default is set.'),

    /** Optional LLM configuration used for topic extraction across memory agents */
    topicExtractionLlmConfig: LLMConfigSchema.nullable().optional().describe('Optional LLM configuration used for topic extraction across memory agents.'),

    /** Embedding configuration for memory agents */
    embeddingConfig: AgentEmbeddingConfigSchema.nullable().optional().describe('Embedding configuration for memory agents. Required if no default is set.'),
});

export type CreateMetaAgent = z.infer<typeof CreateMetaAgentSchema>;

// -------------------------------
// Update Meta Agent Schema
// -------------------------------

export const UpdateMetaAgentSchema = z.object({
    /** Optional new name for the MetaAgent */
    name: z.string().nullable().optional().describe('Optional new name for the MetaAgent.'),

    /** List of memory agent names */
    agents: z.array(z.string()).nullable().optional().describe('List of memory agent names. Will be compared with existing agents to determine what to add/remove.'),

    /** Memory configuration containing blocks for core_memory_agent */
    memory: MemoryConfigSchema.nullable().optional().describe('Memory configuration containing blocks for core_memory_agent. Updates the memory structure.'),

    /** Dictionary mapping agent names to their system prompt text */
    systemPrompts: z.record(z.string()).nullable().optional().describe('Dictionary mapping agent names to their system prompt text. Updates only the specified agents.'),

    /** LLM configuration for meta agent and its sub-agents */
    llmConfig: LLMConfigSchema.nullable().optional().describe('LLM configuration for meta agent and its sub-agents.'),

    /** Optional LLM configuration used for topic extraction across the meta agent */
    topicExtractionLlmConfig: LLMConfigSchema.nullable().optional().describe('Optional LLM configuration used for topic extraction across the meta agent.'),

    /** Embedding configuration for meta agent and its sub-agents */
    embeddingConfig: AgentEmbeddingConfigSchema.nullable().optional().describe('Embedding configuration for meta agent and its sub-agents.'),

    /** If true, clear embedding configuration for meta agent and its sub-agents */
    clearEmbeddingConfig: z.boolean().default(false).describe('If true, clear embedding configuration for meta agent and its sub-agents.'),
}).passthrough(); // Allow extra fields

export type UpdateMetaAgent = z.infer<typeof UpdateMetaAgentSchema>;

// -------------------------------
// Agent Step Response Schema
// -------------------------------

export const AgentStepResponseSchema = z.object({
    /** The messages generated during the agent's step */
    messages: z.array(MessageSchema).describe("The messages generated during the agent's step"),

    /** Whether the agent requested a continue_chaining (i.e. follow-up execution) */
    continueChaining: z.boolean().describe('Whether the agent requested a continue_chaining (i.e. follow-up execution)'),

    /** Whether the agent step ended because a function call failed */
    functionFailed: z.boolean().describe('Whether the agent step ended because a function call failed'),

    /** Whether the agent step ended because the in-context memory is near its limit */
    inContextMemoryWarning: z.boolean().describe('Whether the agent step ended because the in-context memory is near its limit'),

    /** Usage statistics of the LLM call during the agent's step */
    usage: UsageStatisticsSchema.describe("Usage statistics of the LLM call during the agent's step"),

    /** Action, Observation, State at the current step */
    traj: z.record(z.any()).nullable().optional().describe('Action, Observation, State at the current step'),
});

export type AgentStepResponse = z.infer<typeof AgentStepResponseSchema>;

// -------------------------------
// Agent Step State Schema
// -------------------------------

export const AgentStepStateSchema = z.object({
    /** The current step number in the agent loop */
    stepNumber: z.number().int().describe('The current step number in the agent loop'),

    /** The current state of the ToolRulesSolver */
    toolRulesSolver: z.any().describe('The current state of the ToolRulesSolver'),
});

export type AgentStepState = z.infer<typeof AgentStepStateSchema>;

// -------------------------------
// Helper Functions
// -------------------------------

/**
 * Get the prompt template for a given agent type
 */
export function getPromptTemplateForAgentType(_agentType?: AgentType): string {
    // Note: 'sleeptime_agent' type from Python isn't in the TypeScript AgentType enum
    // Using the default template for all agent types
    return (
        '{% for block in blocks %}' +
        '<{{ block.label }} characters="{{ block.value|length }}/{{ block.limit }}">\\n' +
        '{{ block.value }}\\n' +
        '</{{ block.label }}>' +
        '{% if not loop.last %}\\n{% endif %}' +
        '{% endfor %}'
    );
}

/**
 * Create a default embedding config for known models
 */
export function createDefaultEmbeddingConfig(
    modelName?: string,
    provider?: string
): AgentEmbeddingConfig {
    if (modelName === 'text-embedding-3-small' || (!modelName && provider === 'openai')) {
        return {
            embeddingModel: 'text-embedding-3-small',
            embeddingEndpointType: 'openai',
            embeddingEndpoint: 'https://api.openai.com/v1',
            embeddingDim: 1536,
            embeddingChunkSize: 8191,
        };
    } else if (modelName === 'text-embedding-004' || (!modelName && provider === 'google_ai')) {
        return {
            embeddingModel: 'text-embedding-004',
            embeddingEndpointType: 'google_ai',
            embeddingEndpoint: 'https://generativelanguage.googleapis.com',
            embeddingDim: 768,
            embeddingChunkSize: 2048,
        };
    } else {
        throw new Error(`Model ${modelName} not supported.`);
    }
}

/**
 * Generate an agent ID
 */
export function generateAgentId(): string {
    return generateId(IdPrefix.AGENT);
}
