/**
 * ORM Types
 * Re-exports Prisma types with additional type utilities
 */

import type {
    Organization,
    User,
    Client,
    ClientApiKey,
    Agent,
    AgentType,
    Tool,
    ToolType,
    ToolSourceType,
    ToolsAgents,
    Block,
    BlocksAgents,
    Message,
    Step,
    EpisodicEvent,
    SemanticMemoryItem,
    ProceduralMemoryItem,
    ResourceMemoryItem,
    KnowledgeItem,
    MemoryAgentTrace,
    MemoryAgentToolCall,
    MemoryQueueTrace,
    TraceStatus,
    FileMetadata,
    CloudFileMapping,
    Provider,
} from '@prisma/client';

// ============================================================================
// RE-EXPORT PRISMA TYPES
// ============================================================================

// Core entities
export type {
    Organization,
    User,
    Client,
    ClientApiKey,
};

// Agent types
export type {
    Agent,
    AgentType,
    Tool,
    ToolType,
    ToolSourceType,
    ToolsAgents,
    Block,
    BlocksAgents,
};

// Message types
export type {
    Message,
    Step,
};

// Memory types
export type {
    EpisodicEvent,
    SemanticMemoryItem,
    ProceduralMemoryItem,
    ResourceMemoryItem,
    KnowledgeItem,
};

// Trace types
export type {
    MemoryAgentTrace,
    MemoryAgentToolCall,
    MemoryQueueTrace,
    TraceStatus,
};

// File types
export type {
    FileMetadata,
    CloudFileMapping,
    Provider,
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Base entity type with common audit fields
 */
export interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    isDeleted: boolean;
    createdById?: string | null;
    lastUpdatedById?: string | null;
}

/**
 * Entity with organization scope
 */
export interface OrganizationScopedEntity extends BaseEntity {
    organizationId?: string | null;
}

/**
 * Entity with user scope
 */
export interface UserScopedEntity extends OrganizationScopedEntity {
    userId: string;
}

/**
 * Agent-related entity
 */
export interface AgentScopedEntity extends UserScopedEntity {
    agentId?: string | null;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

/**
 * Common create input fields
 */
export interface CreateInput {
    organizationId?: string;
    createdById?: string;
}

/**
 * Common update input fields
 */
export interface UpdateInput {
    lastUpdatedById?: string;
}

// ============================================================================
// RELATION TYPES
// ============================================================================

/**
 * Agent with all relations loaded
 */
export interface AgentWithRelations extends Agent {
    organization?: Organization | null;
    tools: Array<ToolsAgents & { tool: Tool }>;
    coreMemory: Block[];
    messages: Message[];
}

/**
 * Message with relations
 */
export interface MessageWithRelations extends Message {
    agent: Agent;
    user: User;
    organization?: Organization | null;
    client?: Client | null;
    step?: Step | null;
}

/**
 * Tool with relations
 */
export interface ToolWithRelations extends Tool {
    organization?: Organization | null;
    agents: Array<ToolsAgents & { agent: Agent }>;
}

// ============================================================================
// MEMORY UNION TYPE
// ============================================================================

/**
 * Union type for all memory items
 */
export type MemoryItem =
    | EpisodicEvent
    | SemanticMemoryItem
    | ProceduralMemoryItem
    | ResourceMemoryItem
    | KnowledgeItem;

/**
 * Memory type discriminator
 */
export type MemoryType =
    | 'episodic'
    | 'semantic'
    | 'procedural'
    | 'resource'
    | 'knowledge';

/**
 * Memory search result
 */
export interface MemorySearchResult<T extends MemoryItem = MemoryItem> {
    item: T;
    score: number;
    memoryType: MemoryType;
}

// ============================================================================
// JSON FIELD TYPES
// ============================================================================

/**
 * LLM configuration stored in Agent.llmConfig
 */
export interface AgentLLMConfig {
    model: string;
    modelEndpointType: string;
    modelEndpoint?: string;
    contextWindow?: number;
    temperature?: number;
    maxTokens?: number;
    enableReasoner?: boolean;
    maxReasoningTokens?: number;
}

/**
 * Embedding configuration stored in Agent.embeddingConfig
 */
export interface AgentEmbeddingConfig {
    model: string;
    modelEndpointType: string;
    modelEndpoint?: string;
    embeddingDim: number;
}

/**
 * Memory configuration stored in Agent.memoryConfig
 */
export interface AgentMemoryConfig {
    fadeAfterDays?: number;
    expireAfterDays?: number;
}

/**
 * Tool rule stored in Agent.toolRules
 */
export interface AgentToolRule {
    type: string;
    toolName: string;
    children?: string[];
    maxCount?: number;
}

/**
 * Tool JSON schema stored in Tool.jsonSchema
 */
export interface ToolJsonSchema {
    type: 'object';
    properties?: Record<string, {
        type: string;
        description?: string;
        enum?: string[];
        default?: unknown;
    }>;
    required?: string[];
}

/**
 * Message tool call stored in Message.toolCalls
 */
export interface MessageToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

/**
 * Last modify metadata stored in memory items
 */
export interface LastModifyMetadata {
    timestamp: string;
    operation: 'created' | 'updated' | 'deleted';
}

/**
 * Filter tags stored in memory items
 */
export type FilterTags = Record<string, string | string[]>;
