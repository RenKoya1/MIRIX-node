/**
 * MIRIX SDK Client
 * TypeScript client for communicating with MIRIX server
 */

import { logger } from '../log.js';
import { jsonStringify, jsonParse } from '../helpers/json-helpers.js';

// ============================================================================
// PROVIDER DEFAULTS
// ============================================================================

/**
 * Default configurations for different LLM providers
 */
export const PROVIDER_DEFAULTS: Record<string, ProviderConfig> = {
    openai: {
        llmConfig: {
            model: 'gpt-4o-mini',
            modelEndpointType: 'openai',
            modelEndpoint: 'https://api.openai.com/v1',
            contextWindow: 128000,
        },
        topicExtractionLlmConfig: {
            model: 'gpt-4.1-nano',
            modelEndpointType: 'openai',
            modelEndpoint: 'https://api.openai.com/v1',
            contextWindow: 128000,
        },
        buildEmbeddingsForMemory: true,
        embeddingConfig: {
            embeddingModel: 'text-embedding-3-small',
            embeddingEndpoint: 'https://api.openai.com/v1',
            embeddingEndpointType: 'openai',
            embeddingDim: 1536,
        },
    },
    anthropic: {
        llmConfig: {
            model: 'claude-sonnet-4-20250514',
            modelEndpointType: 'anthropic',
            modelEndpoint: 'https://api.anthropic.com/v1',
            contextWindow: 200000,
        },
        topicExtractionLlmConfig: {
            model: 'claude-sonnet-4-20250514',
            modelEndpointType: 'anthropic',
            modelEndpoint: 'https://api.anthropic.com/v1',
            contextWindow: 200000,
        },
        // Anthropic doesn't provide embeddings, use without embeddings
        buildEmbeddingsForMemory: false,
    },
    google_ai: {
        llmConfig: {
            model: 'gemini-2.0-flash',
            modelEndpointType: 'google_ai',
            modelEndpoint: 'https://generativelanguage.googleapis.com',
            contextWindow: 1000000,
        },
        topicExtractionLlmConfig: {
            model: 'gemini-2.0-flash-lite',
            modelEndpointType: 'google_ai',
            modelEndpoint: 'https://generativelanguage.googleapis.com',
            contextWindow: 1000000,
        },
        buildEmbeddingsForMemory: true,
        embeddingConfig: {
            embeddingModel: 'text-embedding-004',
            embeddingEndpointType: 'google_ai',
            embeddingEndpoint: 'https://generativelanguage.googleapis.com',
            embeddingDim: 768,
        },
    },
};

/**
 * Default meta agent configuration shared across all providers
 */
export const DEFAULT_META_AGENT_CONFIG: MetaAgentConfig = {
    systemPromptsFolder: 'mirix/prompts/system/base',
    agents: [
        'core_memory_agent',
        'resource_memory_agent',
        'semantic_memory_agent',
        'episodic_memory_agent',
        'procedural_memory_agent',
        'knowledge_memory_agent',
        'reflexion_agent',
        'background_agent',
    ],
    memory: {
        core: [
            { label: 'human', value: '' },
            { label: 'persona', value: 'I am a helpful assistant.' },
        ],
        decay: {
            fadeAfterDays: 30,
            expireAfterDays: 90,
        },
    },
};

// ============================================================================
// TYPES
// ============================================================================

export interface ProviderLlmConfig {
    model: string;
    modelEndpointType: string;
    modelEndpoint: string;
    contextWindow: number;
    apiKey?: string;
}

export interface ProviderEmbeddingConfig {
    embeddingModel: string;
    embeddingEndpoint: string;
    embeddingEndpointType: string;
    embeddingDim: number;
    apiKey?: string;
}

export interface ProviderConfig {
    llmConfig: ProviderLlmConfig;
    topicExtractionLlmConfig: ProviderLlmConfig;
    buildEmbeddingsForMemory: boolean;
    embeddingConfig?: ProviderEmbeddingConfig;
}

export interface MetaAgentConfig {
    systemPromptsFolder?: string;
    systemPrompts?: Record<string, string>;
    agents: string[];
    memory: {
        core: Array<{ label: string; value: string }>;
        decay: {
            fadeAfterDays: number;
            expireAfterDays: number;
        };
    };
}

export interface InitializeMetaAgentConfig {
    llmConfig?: ProviderLlmConfig;
    topicExtractionLlmConfig?: ProviderLlmConfig;
    buildEmbeddingsForMemory?: boolean;
    embeddingConfig?: ProviderEmbeddingConfig;
    metaAgentConfig?: MetaAgentConfig;
}

export interface MirixClientConfig {
    /** Base URL of the MIRIX server (defaults to MIRIX_API_URL env var or https://api.mirix.io) */
    baseUrl?: string;
    /** API key for authentication (required; can also be set via MIRIX_API_KEY env var) */
    apiKey?: string;
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Number of retry attempts */
    retries?: number;
    /** Retry delay in milliseconds */
    retryDelay?: number;
    /** Enable debug logging */
    debug?: boolean;
}

export interface AgentConfig {
    name?: string;
    description?: string;
    agentType?: 'main_agent' | 'meta_agent' | 'sub_agent' | 'memory_agent';
    system?: string;
    llmConfig?: {
        model: string;
        modelEndpointType: string;
        temperature?: number;
        maxTokens?: number;
    };
    toolIds?: string[];
}

export interface MessageContent {
    type: 'text' | 'image';
    text?: string;
    imageUrl?: string;
}

export interface ConversationMessage {
    role: 'user' | 'assistant' | 'system';
    content: MessageContent[];
}

export interface AddMemoryOptions {
    /** User ID for the conversation */
    userId?: string;
    /** List of message dicts with role and content */
    messages: ConversationMessage[];
    /** Enable/disable chaining (default: false) */
    chaining?: boolean;
    /** Enable verbose output during memory processing */
    verbose?: boolean;
    /** Optional filter tags for filtering and categorization */
    filterTags?: Record<string, unknown>;
    /** Control Redis cache behavior (default: true) */
    useCache?: boolean;
    /** Optional ISO 8601 timestamp for episodic memory */
    occurredAt?: string;
}

export interface RetrieveWithConversationOptions {
    /** User ID for the conversation */
    userId: string;
    /** List of messages with role and content (should end with user turn) */
    messages: ConversationMessage[];
    /** Maximum number of items to retrieve per memory type (default: 10) */
    limit?: number;
    /** Optional filter tags for filtering results */
    filterTags?: Record<string, unknown>;
    /** Control Redis cache behavior (default: true) */
    useCache?: boolean;
    /** Optional local Ollama model for topic extraction */
    localModelForRetrieval?: string;
    /** Optional start date/time for filtering episodic memories (ISO 8601) */
    startDate?: string;
    /** Optional end date/time for filtering episodic memories (ISO 8601) */
    endDate?: string;
}

export interface RetrieveWithTopicOptions {
    /** User ID for the conversation */
    userId: string;
    /** Topic or keyword to search for */
    topic: string;
    /** Maximum number of items to retrieve per memory type (default: 10) */
    limit?: number;
    /** Optional filter tags for filtering results */
    filterTags?: Record<string, unknown>;
    /** Control Redis cache behavior (default: true) */
    useCache?: boolean;
}

export interface SearchOptions {
    /** User ID for the conversation */
    userId: string;
    /** Search query */
    query: string;
    /** Type of memory to search: "episodic", "resource", "procedural", "knowledge", "semantic", "all" */
    memoryType?: 'episodic' | 'resource' | 'procedural' | 'knowledge' | 'semantic' | 'all';
    /** Field to search in */
    searchField?: string;
    /** Search method: "bm25" or "embedding" */
    searchMethod?: 'bm25' | 'embedding';
    /** Maximum number of results per memory type (default: 10) */
    limit?: number;
    /** Optional filter tags for additional filtering */
    filterTags?: Record<string, unknown>;
    /** Optional similarity threshold for embedding search (0.0-2.0) */
    similarityThreshold?: number;
    /** Optional start date/time for filtering episodic memories (ISO 8601) */
    startDate?: string;
    /** Optional end date/time for filtering episodic memories (ISO 8601) */
    endDate?: string;
}

export interface SearchAllUsersOptions {
    /** Search query */
    query: string;
    /** Type of memory to search */
    memoryType?: 'episodic' | 'resource' | 'procedural' | 'knowledge' | 'semantic' | 'all';
    /** Field to search in */
    searchField?: string;
    /** Search method: "bm25" or "embedding" */
    searchMethod?: 'bm25' | 'embedding';
    /** Maximum results per memory type */
    limit?: number;
    /** Optional additional filter tags */
    filterTags?: Record<string, unknown>;
    /** Optional similarity threshold for embedding search */
    similarityThreshold?: number;
    /** Optional start date/time for filtering episodic memories */
    startDate?: string;
    /** Optional end date/time for filtering episodic memories */
    endDate?: string;
}

export interface MemoryRetrievalResult {
    success: boolean;
    topics?: string[];
    temporalExpression?: string;
    dateRange?: { startDate?: string; endDate?: string };
    memories: Record<string, unknown[]>;
}

export interface MemorySearchResult {
    success: boolean;
    query: string;
    memoryType: string;
    searchField: string;
    searchMethod: string;
    dateRange?: { startDate?: string; endDate?: string };
    results: unknown[];
    count: number;
}

export interface AddMemoryResult {
    success: boolean;
    message: string;
    status: string;
    agentId: string;
    messageCount: number;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    name?: string;
    toolCalls?: unknown[];
    toolCallId?: string;
}

export interface ChatResponse {
    agentId: string;
    result: {
        success: boolean;
        message?: string;
        stepCount: number;
        tokenUsage: {
            input: number;
            output: number;
            total: number;
        };
        executionTimeMs: number;
        error?: string;
    };
}

export interface AgentInfo {
    id: string;
    name?: string;
    description?: string;
    agentType?: string;
    system?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ListResponse<T> {
    items: T[];
    total: number;
    hasMore: boolean;
    nextCursor?: string;
}

// ============================================================================
// HTTP CLIENT
// ============================================================================

interface RequestOptions {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    body?: unknown;
    query?: Record<string, string | number | undefined>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate occurred_at format and check if valid ISO 8601
 */
function validateOccurredAt(occurredAt?: string): void {
    if (!occurredAt) return;

    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;
    if (!isoPattern.test(occurredAt)) {
        throw new Error(
            `occurred_at must be in ISO 8601 format (e.g., '2025-11-18T10:30:00' or '2025-11-18T10:30:00+00:00'), got: ${occurredAt}`
        );
    }

    // Try to parse to validate
    const date = new Date(occurredAt);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid occurred_at datetime: ${occurredAt}`);
    }
}

/**
 * Generate a configuration dictionary for a specific LLM provider.
 */
export function getProviderConfig(
    provider: string,
    apiKey?: string,
    model?: string
): InitializeMetaAgentConfig {
    const providerLower = provider.toLowerCase();
    if (!(providerLower in PROVIDER_DEFAULTS)) {
        throw new Error(
            `Unknown provider '${provider}'. Supported providers: ${Object.keys(PROVIDER_DEFAULTS).join(', ')}`
        );
    }

    // Deep copy to avoid modifying the defaults
    const defaults = PROVIDER_DEFAULTS[providerLower];
    const config: InitializeMetaAgentConfig = {
        llmConfig: { ...defaults.llmConfig },
        topicExtractionLlmConfig: { ...defaults.topicExtractionLlmConfig },
        buildEmbeddingsForMemory: defaults.buildEmbeddingsForMemory,
    };

    // Set API key for LLM configs (only if provided)
    if (apiKey) {
        config.llmConfig!.apiKey = apiKey;
        config.topicExtractionLlmConfig!.apiKey = apiKey;
    }

    // Override model if specified
    if (model) {
        config.llmConfig!.model = model;
        config.topicExtractionLlmConfig!.model = model;
    }

    // Set embedding API key (only for providers that use embeddings)
    if (apiKey && defaults.buildEmbeddingsForMemory && defaults.embeddingConfig) {
        config.embeddingConfig = { ...defaults.embeddingConfig, apiKey };
    } else if (defaults.embeddingConfig) {
        config.embeddingConfig = { ...defaults.embeddingConfig };
    }

    // Add meta agent config
    config.metaAgentConfig = {
        ...DEFAULT_META_AGENT_CONFIG,
        memory: {
            ...DEFAULT_META_AGENT_CONFIG.memory,
            core: [...DEFAULT_META_AGENT_CONFIG.memory.core],
        },
        agents: [...DEFAULT_META_AGENT_CONFIG.agents],
    };

    return config;
}

// ============================================================================
// HTTP CLIENT
// ============================================================================

class HttpClient {
    private baseUrl: string;
    private apiKey: string;
    private timeout: number;
    private retries: number;
    private retryDelay: number;
    private debug: boolean;

    constructor(config: MirixClientConfig) {
        // Get base URL from config, env, or default
        const baseUrl = config.baseUrl ?? process.env.MIRIX_API_URL ?? 'https://api.mirix.io';
        this.baseUrl = baseUrl.replace(/\/$/, '');

        // Get API key from config or env
        this.apiKey = config.apiKey ?? process.env.MIRIX_API_KEY ?? '';
        if (!this.apiKey) {
            throw new Error('api_key is required; set MIRIX_API_KEY or pass apiKey to MirixClient.');
        }

        this.timeout = config.timeout ?? 60000;
        this.retries = config.retries ?? 3;
        this.retryDelay = config.retryDelay ?? 1000;
        this.debug = config.debug ?? false;
    }

    async request<T>(options: RequestOptions): Promise<T> {
        const url = this.buildUrl(options.path, options.query);
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
        };

        if (this.debug) {
            logger.debug({ method: options.method, url }, 'Making request');
            if (options.body) {
                logger.debug({ body: options.body }, 'Request body');
            }
        }

        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(url, {
                    method: options.method,
                    headers,
                    body: options.body ? jsonStringify(options.body) : undefined,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new MirixApiError(
                        `API request failed: ${response.status} ${response.statusText}`,
                        response.status,
                        errorBody
                    );
                }

                const text = await response.text();
                return text ? jsonParse<T>(text) : ({} as T);
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (error instanceof MirixApiError && error.status < 500) {
                    throw error;
                }

                if (attempt < this.retries) {
                    logger.warn(
                        { attempt: attempt + 1, error: lastError.message },
                        'Request failed, retrying...'
                    );
                    await this.delay(this.retryDelay * (attempt + 1));
                }
            }
        }

        throw lastError ?? new Error('Request failed after all retries');
    }

    private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
        const url = new URL(path, this.baseUrl);

        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) {
                    url.searchParams.append(key, String(value));
                }
            }
        }

        return url.toString();
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class MirixApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly body?: string
    ) {
        super(message);
        this.name = 'MirixApiError';
    }
}

// ============================================================================
// MIRIX CLIENT
// ============================================================================

export class MirixClient {
    private http: HttpClient;
    private debug: boolean;
    private _metaAgent: AgentInfo | null = null;
    private _knownUsers: Set<string> = new Set();

    constructor(config: MirixClientConfig = {}) {
        this.http = new HttpClient(config);
        this.debug = config.debug ?? false;
        logger.debug({ baseUrl: config.baseUrl }, 'MirixClient initialized');
    }

    // ========================================================================
    // USER MANAGEMENT
    // ========================================================================

    /**
     * Create a user if it doesn't exist, or get existing user.
     */
    async createOrGetUser(options: {
        userId?: string;
        userName?: string;
    } = {}): Promise<string> {
        const response = await this.http.request<{ id: string }>({
            method: 'POST',
            path: '/users/create_or_get',
            body: {
                user_id: options.userId,
                name: options.userName,
            },
        });

        if (this.debug) {
            logger.debug({ userId: response.id }, 'User ready');
        }

        return response.id;
    }

    /**
     * Ensure that the given user exists for the client's organization.
     */
    private async _ensureUserExists(userId?: string): Promise<void> {
        if (!userId) return;
        if (this._knownUsers.has(userId)) return;

        try {
            await this.http.request({
                method: 'POST',
                path: '/users/create_or_get',
                body: {
                    user_id: userId,
                    name: userId,
                },
            });
            this._knownUsers.add(userId);
            if (this.debug) {
                logger.debug({ userId }, 'User ensured');
            }
        } catch (error) {
            if (this.debug) {
                logger.debug({ userId, error }, 'Could not ensure user');
            }
        }
    }

    // ========================================================================
    // AGENT OPERATIONS
    // ========================================================================

    /**
     * Create a new agent
     */
    async createAgent(config: AgentConfig): Promise<AgentInfo> {
        const response = await this.http.request<{ agent: AgentInfo }>({
            method: 'POST',
            path: '/v1/agents',
            body: config,
        });
        return response.agent;
    }

    /**
     * Get agent by ID
     */
    async getAgent(agentId: string): Promise<AgentInfo> {
        const response = await this.http.request<{ agent: AgentInfo }>({
            method: 'GET',
            path: `/v1/agents/${agentId}`,
        });
        return response.agent;
    }

    /**
     * List agents
     */
    async listAgents(options?: {
        limit?: number;
        cursor?: string;
        agentType?: string;
    }): Promise<ListResponse<AgentInfo>> {
        const response = await this.http.request<{
            agents: AgentInfo[];
            total: number;
            hasMore: boolean;
            nextCursor?: string;
        }>({
            method: 'GET',
            path: '/v1/agents',
            query: {
                limit: options?.limit,
                cursor: options?.cursor,
                agent_type: options?.agentType,
            },
        });

        return {
            items: response.agents,
            total: response.total,
            hasMore: response.hasMore,
            nextCursor: response.nextCursor,
        };
    }

    /**
     * Update agent
     */
    async updateAgent(
        agentId: string,
        updates: Partial<AgentConfig>
    ): Promise<AgentInfo> {
        const response = await this.http.request<{ agent: AgentInfo }>({
            method: 'PATCH',
            path: `/v1/agents/${agentId}`,
            body: updates,
        });
        return response.agent;
    }

    /**
     * Delete agent
     */
    async deleteAgent(agentId: string): Promise<void> {
        await this.http.request<{ deleted: boolean }>({
            method: 'DELETE',
            path: `/v1/agents/${agentId}`,
        });
    }

    // ========================================================================
    // CHAT OPERATIONS
    // ========================================================================

    /**
     * Send a message to an agent and get a response
     */
    async chat(agentId: string, message: string): Promise<ChatResponse> {
        return this.http.request<ChatResponse>({
            method: 'POST',
            path: `/v1/agents/${agentId}/chat`,
            body: { message },
        });
    }

    /**
     * Get conversation history for an agent
     */
    async getConversation(
        agentId: string,
        options?: { limit?: number; offset?: number }
    ): Promise<ChatMessage[]> {
        const response = await this.http.request<{ messages: ChatMessage[] }>({
            method: 'GET',
            path: `/v1/messages/agent/${agentId}/conversation`,
            query: options,
        });
        return response.messages;
    }

    /**
     * Get latest messages for an agent
     */
    async getLatestMessages(agentId: string, limit = 10): Promise<ChatMessage[]> {
        const response = await this.http.request<{ messages: ChatMessage[] }>({
            method: 'GET',
            path: `/v1/messages/agent/${agentId}/latest`,
            query: { limit },
        });
        return response.messages;
    }

    /**
     * Delete all messages for an agent
     */
    async clearConversation(agentId: string): Promise<number> {
        const response = await this.http.request<{ deleted: boolean; count: number }>({
            method: 'DELETE',
            path: `/v1/messages/agent/${agentId}`,
        });
        return response.count;
    }

    // ========================================================================
    // TOOL OPERATIONS
    // ========================================================================

    /**
     * Get tools attached to an agent
     */
    async getAgentTools(agentId: string): Promise<unknown[]> {
        const response = await this.http.request<{ tools: unknown[] }>({
            method: 'GET',
            path: `/v1/agents/${agentId}/tools`,
        });
        return response.tools;
    }

    /**
     * Attach tools to an agent
     */
    async attachTools(agentId: string, toolIds: string[]): Promise<void> {
        await this.http.request<{ success: boolean }>({
            method: 'POST',
            path: `/v1/agents/${agentId}/tools`,
            body: { toolIds },
        });
    }

    /**
     * Set tools for an agent (replaces existing)
     */
    async setTools(agentId: string, toolIds: string[]): Promise<void> {
        await this.http.request<{ success: boolean }>({
            method: 'PUT',
            path: `/v1/agents/${agentId}/tools`,
            body: { toolIds },
        });
    }

    /**
     * Detach tools from an agent
     */
    async detachTools(agentId: string, toolIds: string[]): Promise<void> {
        await this.http.request<{ success: boolean }>({
            method: 'DELETE',
            path: `/v1/agents/${agentId}/tools`,
            body: { toolIds },
        });
    }

    // ========================================================================
    // MEMORY OPERATIONS
    // ========================================================================

    /**
     * Get core memory blocks for an agent
     */
    async getCoreMemory(agentId: string): Promise<Array<{
        label: string;
        value: string;
        limit: number;
    }>> {
        const response = await this.http.request<{
            blocks: Array<{ label: string; value: string; limit: number }>;
        }>({
            method: 'GET',
            path: `/v1/agents/${agentId}/memory`,
        });
        return response.blocks;
    }

    /**
     * Update a core memory block
     */
    async updateCoreMemory(
        agentId: string,
        label: string,
        value: string
    ): Promise<void> {
        await this.http.request<{ block: unknown }>({
            method: 'PATCH',
            path: `/v1/agents/${agentId}/memory/${label}`,
            body: { value },
        });
    }

    // ========================================================================
    // META AGENT & MEMORY API
    // ========================================================================

    /**
     * Initialize a meta agent with the given configuration.
     *
     * This creates a meta memory agent that manages multiple specialized memory agents
     * (episodic, semantic, procedural, etc.) for the current project.
     *
     * @example
     * // Simplest setup - just provider (api_key from environment variable)
     * const metaAgent = await client.initializeMetaAgent({ provider: 'openai' });
     *
     * // With explicit API key
     * const metaAgent = await client.initializeMetaAgent({
     *     provider: 'openai',
     *     apiKey: 'sk-proj-xxx'
     * });
     *
     * // Using a config object directly
     * const metaAgent = await client.initializeMetaAgent({
     *     config: { llmConfig: {...}, embeddingConfig: {...} }
     * });
     */
    async initializeMetaAgent(options: {
        /** LLM provider name ("openai", "anthropic", "google_ai") */
        provider?: string;
        /** Optional API key for the LLM provider */
        apiKey?: string;
        /** Optional model name to override the provider's default */
        model?: string;
        /** Configuration dictionary with llmConfig, embeddingConfig, etc. */
        config?: InitializeMetaAgentConfig;
        /** Whether to update existing agents */
        updateAgents?: boolean;
    }): Promise<AgentInfo> {
        let config = options.config;

        // Option 1: Generate config from provider
        if (options.provider) {
            config = getProviderConfig(
                options.provider,
                options.apiKey,
                options.model
            );
        }

        if (!config) {
            throw new Error(
                "Configuration required. Provide one of:\n" +
                "  - provider for quick setup (e.g., provider: 'openai')\n" +
                "  - config for a configuration dictionary"
            );
        }

        const response = await this.http.request<AgentInfo>({
            method: 'POST',
            path: '/agents/meta/initialize',
            body: {
                config,
                update_agents: options.updateAgents ?? true,
            },
        });

        this._metaAgent = response;
        return response;
    }

    /**
     * Add conversation turns to memory (asynchronous processing).
     *
     * This method queues conversation turns for background processing by queue workers.
     * The messages are stored in the appropriate memory systems asynchronously.
     *
     * @example
     * const response = await client.add({
     *     userId: 'user_123',
     *     messages: [
     *         { role: 'user', content: [{ type: 'text', text: 'I went to dinner' }] },
     *         { role: 'assistant', content: [{ type: 'text', text: "That's great!" }] }
     *     ],
     *     verbose: true,
     *     filterTags: { sessionId: 'sess-789' },
     *     occurredAt: '2025-11-18T15:30:00'
     * });
     */
    async add(options: AddMemoryOptions): Promise<AddMemoryResult> {
        if (!this._metaAgent) {
            throw new Error(
                'Meta agent not initialized. Call initializeMetaAgent() first.'
            );
        }

        // Validate occurred_at format if provided
        validateOccurredAt(options.occurredAt);

        await this._ensureUserExists(options.userId);

        const requestBody: Record<string, unknown> = {
            user_id: options.userId,
            meta_agent_id: this._metaAgent.id,
            messages: options.messages,
            chaining: options.chaining ?? false,
            verbose: options.verbose ?? false,
        };

        if (options.filterTags !== undefined) {
            requestBody.filter_tags = options.filterTags;
        }

        if (options.useCache === false) {
            requestBody.use_cache = false;
        }

        if (options.occurredAt !== undefined) {
            requestBody.occurred_at = options.occurredAt;
        }

        return this.http.request<AddMemoryResult>({
            method: 'POST',
            path: '/memory/add',
            body: requestBody,
        });
    }

    /**
     * Retrieve relevant memories based on conversation context with optional temporal filtering.
     *
     * @example
     * // Automatic temporal parsing from query
     * const memories = await client.retrieveWithConversation({
     *     userId: 'user_123',
     *     messages: [
     *         { role: 'user', content: [{ type: 'text', text: 'What happened today?' }] }
     *     ]
     * });
     *
     * // Explicit date range
     * const memories = await client.retrieveWithConversation({
     *     userId: 'user_123',
     *     messages: [
     *         { role: 'user', content: [{ type: 'text', text: 'What meetings did I have?' }] }
     *     ],
     *     startDate: '2025-11-19T00:00:00',
     *     endDate: '2025-11-19T23:59:59'
     * });
     */
    async retrieveWithConversation(
        options: RetrieveWithConversationOptions
    ): Promise<MemoryRetrievalResult> {
        if (!this._metaAgent) {
            throw new Error(
                'Meta agent not initialized. Call initializeMetaAgent() first.'
            );
        }

        await this._ensureUserExists(options.userId);

        const requestBody: Record<string, unknown> = {
            user_id: options.userId,
            messages: options.messages,
            limit: options.limit ?? 10,
            local_model_for_retrieval: options.localModelForRetrieval,
        };

        if (options.filterTags !== undefined) {
            requestBody.filter_tags = options.filterTags;
        }

        if (options.useCache === false) {
            requestBody.use_cache = false;
        }

        if (options.startDate !== undefined) {
            requestBody.start_date = options.startDate;
        }

        if (options.endDate !== undefined) {
            requestBody.end_date = options.endDate;
        }

        return this.http.request<MemoryRetrievalResult>({
            method: 'POST',
            path: '/memory/retrieve/conversation',
            body: requestBody,
        });
    }

    /**
     * Retrieve relevant memories based on a topic.
     *
     * @example
     * const memories = await client.retrieveWithTopic({
     *     userId: 'user_123',
     *     topic: 'dinner',
     *     limit: 5,
     *     filterTags: { sessionId: 'sess-789' }
     * });
     */
    async retrieveWithTopic(
        options: RetrieveWithTopicOptions
    ): Promise<MemoryRetrievalResult> {
        if (!this._metaAgent) {
            throw new Error(
                'Meta agent not initialized. Call initializeMetaAgent() first.'
            );
        }

        await this._ensureUserExists(options.userId);

        const queryParams: Record<string, string | number | undefined> = {
            user_id: options.userId,
            topic: options.topic,
            limit: options.limit ?? 10,
            use_cache: options.useCache !== false ? undefined : 'false',
        };

        if (options.filterTags !== undefined) {
            queryParams.filter_tags = jsonStringify(options.filterTags);
        }

        return this.http.request<MemoryRetrievalResult>({
            method: 'GET',
            path: '/memory/retrieve/topic',
            query: queryParams,
        });
    }

    /**
     * Search for memories using various search methods with optional temporal filtering.
     *
     * @example
     * // Search all memory types
     * const results = await client.search({
     *     userId: 'user_123',
     *     query: 'restaurants',
     *     limit: 5
     * });
     *
     * // Search only episodic memories in details field
     * const episodicResults = await client.search({
     *     userId: 'user_123',
     *     query: 'meeting',
     *     memoryType: 'episodic',
     *     searchField: 'details',
     *     limit: 10
     * });
     *
     * // Search with similarity threshold (embedding only)
     * const relevantResults = await client.search({
     *     userId: 'user_123',
     *     query: 'database optimization',
     *     searchMethod: 'embedding',
     *     similarityThreshold: 0.7
     * });
     */
    async search(options: SearchOptions): Promise<MemorySearchResult> {
        if (!this._metaAgent) {
            throw new Error(
                'Meta agent not initialized. Call initializeMetaAgent() first.'
            );
        }

        await this._ensureUserExists(options.userId);

        const queryParams: Record<string, string | number | undefined> = {
            user_id: options.userId,
            query: options.query,
            memory_type: options.memoryType ?? 'all',
            search_field: options.searchField ?? 'null',
            search_method: options.searchMethod ?? 'bm25',
            limit: options.limit ?? 10,
        };

        if (options.filterTags !== undefined) {
            queryParams.filter_tags = jsonStringify(options.filterTags);
        }

        if (options.similarityThreshold !== undefined) {
            queryParams.similarity_threshold = options.similarityThreshold;
        }

        if (options.startDate !== undefined) {
            queryParams.start_date = options.startDate;
        }

        if (options.endDate !== undefined) {
            queryParams.end_date = options.endDate;
        }

        return this.http.request<MemorySearchResult>({
            method: 'GET',
            path: '/memory/search',
            query: queryParams,
        });
    }

    /**
     * Search for memories across ALL users in the organization.
     *
     * @example
     * // Search all users' episodic memories
     * const results = await client.searchAllUsers({
     *     query: 'meeting notes',
     *     memoryType: 'episodic',
     *     limit: 20
     * });
     */
    async searchAllUsers(
        options: SearchAllUsersOptions
    ): Promise<MemorySearchResult & { clientId: string; organizationId: string; clientScope: string }> {
        if (!this._metaAgent) {
            throw new Error(
                'Meta agent not initialized. Call initializeMetaAgent() first.'
            );
        }

        const queryParams: Record<string, string | number | undefined> = {
            query: options.query,
            memory_type: options.memoryType ?? 'all',
            search_field: options.searchField ?? 'null',
            search_method: options.searchMethod ?? 'bm25',
            limit: options.limit ?? 10,
        };

        if (options.filterTags !== undefined) {
            queryParams.filter_tags = jsonStringify(options.filterTags);
        }

        if (options.similarityThreshold !== undefined) {
            queryParams.similarity_threshold = options.similarityThreshold;
        }

        if (options.startDate !== undefined) {
            queryParams.start_date = options.startDate;
        }

        if (options.endDate !== undefined) {
            queryParams.end_date = options.endDate;
        }

        return this.http.request({
            method: 'GET',
            path: '/memory/search_all_users',
            query: queryParams,
        });
    }

    /**
     * Update an agent's system prompt by agent name.
     *
     * @example
     * // Update episodic memory agent's system prompt
     * const updatedAgent = await client.updateSystemPrompt(
     *     'episodic',
     *     'You are an episodic memory agent specialized in sales conversations.'
     * );
     */
    async updateSystemPrompt(
        agentName: string,
        systemPrompt: string
    ): Promise<AgentInfo> {
        return this.http.request<AgentInfo>({
            method: 'PATCH',
            path: `/agents/by-name/${agentName}/system`,
            body: { system_prompt: systemPrompt },
        });
    }

    /**
     * Get the currently initialized meta agent
     */
    getMetaAgent(): AgentInfo | null {
        return this._metaAgent;
    }

    // ========================================================================
    // HEALTH OPERATIONS
    // ========================================================================

    /**
     * Check server health
     */
    async healthCheck(): Promise<{
        status: string;
        timestamp: string;
        version: string;
    }> {
        return this.http.request({
            method: 'GET',
            path: '/health',
        });
    }

    /**
     * Get detailed health status
     */
    async detailedHealthCheck(): Promise<{
        status: string;
        timestamp: string;
        version: string;
        uptime: number;
        checks: Record<string, { status: string; latency?: number; error?: string }>;
        totalLatency: number;
    }> {
        return this.http.request({
            method: 'GET',
            path: '/health/detailed',
        });
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new MIRIX client
 *
 * @example
 * // Using environment variables (MIRIX_API_KEY, MIRIX_API_URL)
 * const client = createMirixClient();
 *
 * // With explicit configuration
 * const client = createMirixClient({
 *     apiKey: 'your-api-key',
 *     baseUrl: 'https://api.mirix.io',
 *     debug: true
 * });
 *
 * // Initialize meta agent and add memories
 * const metaAgent = await client.initializeMetaAgent({ provider: 'openai' });
 * await client.add({
 *     userId: 'user-123',
 *     messages: [
 *         { role: 'user', content: [{ type: 'text', text: 'Hello!' }] },
 *         { role: 'assistant', content: [{ type: 'text', text: 'Hi there!' }] }
 *     ]
 * });
 */
export function createMirixClient(config: MirixClientConfig = {}): MirixClient {
    return new MirixClient(config);
}

export default MirixClient;
