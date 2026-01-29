/**
 * Client Module
 * Central exports for MIRIX SDK client
 */

export {
    MirixClient,
    createMirixClient,
    MirixApiError,
    // Provider configuration
    PROVIDER_DEFAULTS,
    DEFAULT_META_AGENT_CONFIG,
    getProviderConfig,
} from './sdk.js';

export type {
    // Client config
    MirixClientConfig,
    AgentConfig,
    AgentInfo,
    ListResponse,
    // Chat types
    ChatMessage,
    ChatResponse,
    // Provider types
    ProviderLlmConfig,
    ProviderEmbeddingConfig,
    ProviderConfig,
    MetaAgentConfig,
    InitializeMetaAgentConfig,
    // Memory API types
    MessageContent,
    ConversationMessage,
    AddMemoryOptions,
    AddMemoryResult,
    RetrieveWithConversationOptions,
    RetrieveWithTopicOptions,
    SearchOptions,
    SearchAllUsersOptions,
    MemoryRetrievalResult,
    MemorySearchResult,
} from './sdk.js';
