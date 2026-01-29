/**
 * MIRIX SDK Client
 * TypeScript client for communicating with MIRIX server
 */

import { logger } from '../log.js';
import { jsonStringify, jsonParse } from '../helpers/json-helpers.js';

// ============================================================================
// TYPES
// ============================================================================

export interface MirixClientConfig {
    /** Base URL of the MIRIX server */
    baseUrl: string;
    /** API key for authentication */
    apiKey: string;
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Number of retry attempts */
    retries?: number;
    /** Retry delay in milliseconds */
    retryDelay?: number;
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

class HttpClient {
    private baseUrl: string;
    private apiKey: string;
    private timeout: number;
    private retries: number;
    private retryDelay: number;

    constructor(config: MirixClientConfig) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.apiKey = config.apiKey;
        this.timeout = config.timeout ?? 30000;
        this.retries = config.retries ?? 3;
        this.retryDelay = config.retryDelay ?? 1000;
    }

    async request<T>(options: RequestOptions): Promise<T> {
        const url = this.buildUrl(options.path, options.query);
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
        };

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

    constructor(config: MirixClientConfig) {
        this.http = new HttpClient(config);
        logger.debug({ baseUrl: config.baseUrl }, 'MirixClient initialized');
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
 */
export function createMirixClient(config: MirixClientConfig): MirixClient {
    return new MirixClient(config);
}

export default MirixClient;
