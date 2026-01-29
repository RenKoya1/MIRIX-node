/**
 * Services Module
 * Exports all service managers
 */

// Base manager
export {
    BaseManager,
    AccessType,
    type ActorContext,
    type PaginationOptions,
    type SortOptions,
    type ListOptions,
    type ListResult,
    type CacheConfig,
    type AccessPermission,
} from './base-manager';

// Organization manager
export {
    organizationManager,
    type CreateOrganizationInput,
    type UpdateOrganizationInput,
} from './organization-manager';

// User manager
export {
    userManager,
    type CreateUserInput,
    type UpdateUserInput,
    type UserListOptions,
} from './user-manager';

// Agent manager
export {
    agentManager,
    ToolRuleType as AgentToolRuleType,
    type ToolRule,
    type EmbeddingConfig,
    type MemoryConfig,
    type CreateAgentInput,
    type UpdateAgentInput,
    type AgentListOptions,
    type AgentWithRelations,
} from './agent-manager';

// Client manager
export {
    clientManager,
    type CreateClientInput,
    type UpdateClientInput,
    type ClientListOptions,
} from './client-manager';

// Block manager
export {
    blockManager,
    type CreateBlockInput,
    type UpdateBlockInput,
    type BlockListOptions,
} from './block-manager';

// Tool manager
export {
    toolManager,
    type CreateToolInput,
    type UpdateToolInput,
    type ToolListOptions,
} from './tool-manager';

// Message manager
export {
    messageManager,
    type MessageRole,
    type CreateMessageInput,
    type UpdateMessageInput,
    type MessageListOptions,
} from './message-manager';

// Step manager
export {
    stepManager,
    type CreateStepInput,
    type UpdateStepInput,
    type StepListOptions,
} from './step-manager';

// Provider manager
export {
    providerManager,
    type CreateProviderInput,
    type UpdateProviderInput,
    type ProviderListOptions,
} from './provider-manager';

// File manager
export {
    fileManager,
    type CreateFileInput,
    type UpdateFileInput,
    type FileListOptions,
    type CreateCloudMappingInput,
    type UpdateCloudMappingInput,
} from './file-manager';

// Memory managers
export {
    // Base memory manager
    BaseMemoryManager,
    type MemoryListOptions,
    type CacheConfig as MemoryCacheConfig,
    // Episodic memory
    episodicMemoryManager,
    type CreateEpisodicEventInput,
    type UpdateEpisodicEventInput,
    type LastModify,
    // Semantic memory
    semanticMemoryManager,
    type CreateSemanticMemoryInput,
    type UpdateSemanticMemoryInput,
    // Procedural memory
    proceduralMemoryManager,
    type CreateProceduralMemoryInput,
    type UpdateProceduralMemoryInput,
    // Resource memory
    resourceMemoryManager,
    type CreateResourceMemoryInput,
    type UpdateResourceMemoryInput,
    // Knowledge memory
    knowledgeMemoryManager,
    type CreateKnowledgeItemInput,
    type UpdateKnowledgeItemInput,
} from './memory/index';
