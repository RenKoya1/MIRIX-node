/**
 * MetaAgent: Orchestrates memory-related sub-agents for memory management operations.
 *
 * This class manages all memory-related agents (episodic, procedural, semantic, core,
 * resource, knowledge, reflexion, background, meta_memory) and coordinates
 * memory operations across them. It does NOT include the chat_agent.
 *
 * Converted from: mirix/agent/meta_agent.py
 */

import { Agent } from '@prisma/client';
import { logger } from '../log.js';
import { LLMConfig, createDefaultLLMConfig } from '../schemas/llm_config.js';
import { AgentInterface } from '../interface.js';
import { settings } from '../settings.js';
import {
    AgentState,
    createAgentState,
} from './agent-state.js';
import {
    BaseAgent,
    AgentConfig,
    AgentResult,
} from './base-agent.js';
import { MirixAgent } from './agent.js';
import {
    ToolCall,
    ToolReturn,
    ToolExecutionContext,
} from '../tools/index.js';
import { Memory } from '../schemas/memory.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Memory agent type string literals
 */
export type MemoryAgentType =
    | 'episodic_memory_agent'
    | 'procedural_memory_agent'
    | 'knowledge_memory_agent'
    | 'meta_memory_agent'
    | 'semantic_memory_agent'
    | 'core_memory_agent'
    | 'resource_memory_agent'
    | 'reflexion_agent'
    | 'background_agent';

/**
 * Embedding config for meta agent (simplified)
 */
export interface MetaAgentEmbeddingConfig {
    model: string;
    endpointType: string;
    endpoint?: string;
    dim: number;
}

/**
 * Container class to hold all memory-related agent state objects.
 * Does NOT include chat_agent.
 */
export class MemoryAgentStates {
    episodicMemoryAgentState: AgentState | null = null;
    proceduralMemoryAgentState: AgentState | null = null;
    knowledgeMemoryAgentState: AgentState | null = null;
    metaMemoryAgentState: AgentState | null = null;
    semanticMemoryAgentState: AgentState | null = null;
    coreMemoryAgentState: AgentState | null = null;
    resourceMemoryAgentState: AgentState | null = null;
    reflexionAgentState: AgentState | null = null;
    backgroundAgentState: AgentState | null = null;

    /**
     * Set an agent state by name
     */
    setAgentState(name: string, state: AgentState): void {
        const key = name as keyof MemoryAgentStates;
        if (key in this) {
            (this[key] as AgentState | null) = state;
        } else {
            throw new Error(`Unknown memory agent state name: ${name}`);
        }
    }

    /**
     * Get an agent state by name
     */
    getAgentState(name: string): AgentState | null {
        const key = name as keyof MemoryAgentStates;
        if (key in this) {
            return this[key] as AgentState | null;
        }
        throw new Error(`Unknown memory agent state name: ${name}`);
    }

    /**
     * Get all memory agent states as a dictionary
     */
    getAllStates(): Record<string, AgentState | null> {
        return {
            episodicMemoryAgentState: this.episodicMemoryAgentState,
            proceduralMemoryAgentState: this.proceduralMemoryAgentState,
            knowledgeMemoryAgentState: this.knowledgeMemoryAgentState,
            metaMemoryAgentState: this.metaMemoryAgentState,
            semanticMemoryAgentState: this.semanticMemoryAgentState,
            coreMemoryAgentState: this.coreMemoryAgentState,
            resourceMemoryAgentState: this.resourceMemoryAgentState,
            reflexionAgentState: this.reflexionAgentState,
            backgroundAgentState: this.backgroundAgentState,
        };
    }

    /**
     * Get all memory agent states as a list
     */
    getAllAgentStatesList(): (AgentState | null)[] {
        return [
            this.episodicMemoryAgentState,
            this.proceduralMemoryAgentState,
            this.knowledgeMemoryAgentState,
            this.metaMemoryAgentState,
            this.semanticMemoryAgentState,
            this.coreMemoryAgentState,
            this.resourceMemoryAgentState,
            this.reflexionAgentState,
            this.backgroundAgentState,
        ];
    }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Memory agent configuration - excludes chat_agent
 */
export interface MemoryAgentConfig {
    name: MemoryAgentType;
    agentType: string;
    attrName: keyof MemoryAgentStates;
    includeBaseTools: boolean;
}

export const MEMORY_AGENT_CONFIGS: MemoryAgentConfig[] = [
    {
        name: 'episodic_memory_agent',
        agentType: 'episodic_memory_agent',
        attrName: 'episodicMemoryAgentState',
        includeBaseTools: false,
    },
    {
        name: 'procedural_memory_agent',
        agentType: 'procedural_memory_agent',
        attrName: 'proceduralMemoryAgentState',
        includeBaseTools: false,
    },
    {
        name: 'knowledge_memory_agent',
        agentType: 'knowledge_memory_agent',
        attrName: 'knowledgeMemoryAgentState',
        includeBaseTools: false,
    },
    {
        name: 'meta_memory_agent',
        agentType: 'meta_memory_agent',
        attrName: 'metaMemoryAgentState',
        includeBaseTools: false,
    },
    {
        name: 'semantic_memory_agent',
        agentType: 'semantic_memory_agent',
        attrName: 'semanticMemoryAgentState',
        includeBaseTools: false,
    },
    {
        name: 'core_memory_agent',
        agentType: 'core_memory_agent',
        attrName: 'coreMemoryAgentState',
        includeBaseTools: false,
    },
    {
        name: 'resource_memory_agent',
        agentType: 'resource_memory_agent',
        attrName: 'resourceMemoryAgentState',
        includeBaseTools: false,
    },
    {
        name: 'reflexion_agent',
        agentType: 'reflexion_agent',
        attrName: 'reflexionAgentState',
        includeBaseTools: false,
    },
    {
        name: 'background_agent',
        agentType: 'background_agent',
        attrName: 'backgroundAgentState',
        includeBaseTools: false,
    },
];

// ============================================================================
// META AGENT OPTIONS
// ============================================================================

export interface MetaAgentOptions {
    userId: string;
    organizationId?: string;
    memory?: Memory;
    llmConfig?: LLMConfig;
    embeddingConfig?: MetaAgentEmbeddingConfig;
    systemPrompts?: Record<string, string>;
    systemPromptFolder?: string;
    interface?: AgentInterface;
    filterTags?: Record<string, string>;
    useCache?: boolean;
    clientId?: string;
    config?: Partial<AgentConfig>;
}

// ============================================================================
// USAGE STATISTICS
// ============================================================================

export interface MetaAgentUsageStatistics {
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
    stepCount: number;
}

// ============================================================================
// META AGENT
// ============================================================================

/**
 * MetaAgent manages all memory-related sub-agents for coordinated memory operations.
 *
 * This agent follows the pattern of Agent in agent.ts but is specialized for
 * memory management. It orchestrates operations across:
 * - Episodic Memory Agent
 * - Procedural Memory Agent
 * - Knowledge Agent
 * - Meta Memory Agent
 * - Semantic Memory Agent
 * - Core Memory Agent
 * - Resource Memory Agent
 * - Reflexion Agent
 * - Background Agent
 *
 * It does NOT include the chat_agent as that is handled separately.
 */
export class MetaAgent extends BaseAgent {
    private readonly metaLogger = logger.child({ component: 'MetaAgent' });

    // User and organization info
    readonly userId: string;
    readonly organizationId?: string;

    // Memory configuration
    memory?: Memory;
    llmConfig: LLMConfig;
    embeddingConfig?: MetaAgentEmbeddingConfig;

    // System prompts
    systemPrompts: Record<string, string>;
    systemPromptFolder?: string;

    // Agent interface
    agentInterface?: AgentInterface;

    // Filter and cache configuration
    filterTags?: Record<string, string>;
    useCache: boolean;
    clientId?: string;

    // Memory agent states container
    memoryAgentStates: MemoryAgentStates;

    // Individual agent instances
    agents: Map<string, MirixAgent> = new Map();

    constructor(agent: Agent, options: MetaAgentOptions) {
        super(agent, options.config);

        this.userId = options.userId;
        this.organizationId = options.organizationId;
        this.memory = options.memory;
        this.systemPrompts = options.systemPrompts ?? {};
        this.systemPromptFolder = options.systemPromptFolder;
        this.agentInterface = options.interface;
        this.useCache = options.useCache ?? true;
        this.clientId = options.clientId;

        // Store filter_tags as a COPY to prevent mutation across agent instances
        this.filterTags = options.filterTags ? { ...options.filterTags } : undefined;

        // Set default configs if not provided
        this.llmConfig = options.llmConfig ?? createDefaultLLMConfig('gpt-4o-mini');

        if (options.embeddingConfig) {
            this.embeddingConfig = options.embeddingConfig;
        } else if (settings.buildEmbeddingsForMemory) {
            this.embeddingConfig = {
                model: 'text-embedding-004',
                endpointType: 'google_ai',
                endpoint: 'https://generativelanguage.googleapis.com',
                dim: 768,
            };
        }

        // Initialize container for memory agent states
        this.memoryAgentStates = new MemoryAgentStates();

        this.metaLogger.info(
            { userId: this.userId, agentId: this.agentId },
            'MetaAgent created'
        );
    }

    /**
     * Initialize the MetaAgent by loading agent states
     */
    async initialize(): Promise<void> {
        // Initialize individual Agent instances for each sub-agent
        await this.initializeAgentInstances();

        this.metaLogger.info(
            { agentCount: MEMORY_AGENT_CONFIGS.length },
            'MetaAgent initialized with memory sub-agents'
        );
    }

    /**
     * Load existing memory agent states
     */
    loadExistingAgents(existingAgents: Agent[]): void {
        for (const agent of existingAgents) {
            const agentState = createAgentState(agent);

            // Map agent names to their corresponding attribute names
            switch (agent.name) {
                case 'episodic_memory_agent':
                    this.memoryAgentStates.episodicMemoryAgentState = agentState;
                    break;
                case 'procedural_memory_agent':
                    this.memoryAgentStates.proceduralMemoryAgentState = agentState;
                    break;
                case 'knowledge_memory_agent':
                    this.memoryAgentStates.knowledgeMemoryAgentState = agentState;
                    break;
                case 'meta_memory_agent':
                    this.memoryAgentStates.metaMemoryAgentState = agentState;
                    break;
                case 'semantic_memory_agent':
                    this.memoryAgentStates.semanticMemoryAgentState = agentState;
                    break;
                case 'core_memory_agent':
                    this.memoryAgentStates.coreMemoryAgentState = agentState;
                    break;
                case 'resource_memory_agent':
                    this.memoryAgentStates.resourceMemoryAgentState = agentState;
                    break;
                case 'reflexion_agent':
                    this.memoryAgentStates.reflexionAgentState = agentState;
                    break;
                case 'background_agent':
                    this.memoryAgentStates.backgroundAgentState = agentState;
                    break;
            }
        }

        this.metaLogger.info('Loaded existing memory agent states');
    }

    /**
     * Get default system prompt for an agent
     */
    private getDefaultSystemPrompt(agentName: string): string {
        const prompts: Record<string, string> = {
            episodic_memory_agent: `You are an episodic memory agent responsible for managing autobiographical memories.
Your role is to store, retrieve, and organize memories of events and experiences.`,

            procedural_memory_agent: `You are a procedural memory agent responsible for managing skill and action memories.
Your role is to store, retrieve, and organize memories of how to do things.`,

            knowledge_memory_agent: `You are a knowledge memory agent responsible for managing factual knowledge.
Your role is to store, retrieve, and organize factual information and general knowledge.`,

            meta_memory_agent: `You are a meta memory agent responsible for coordinating across memory systems.
Your role is to manage memory routing, consolidation, and cross-memory operations.`,

            semantic_memory_agent: `You are a semantic memory agent responsible for managing conceptual and categorical memories.
Your role is to store, retrieve, and organize meanings, concepts, and general knowledge about the world.`,

            core_memory_agent: `You are a core memory agent responsible for managing the most important persistent memories.
Your role is to maintain the core identity, preferences, and essential information about the user.`,

            resource_memory_agent: `You are a resource memory agent responsible for managing external resource references.
Your role is to store, retrieve, and organize references to files, URLs, and other external resources.`,

            reflexion_agent: `You are a reflexion agent responsible for self-reflection and memory improvement.
Your role is to analyze past interactions and improve memory quality through reflection.`,

            background_agent: `You are a background agent responsible for asynchronous memory operations.
Your role is to perform memory maintenance tasks in the background.`,
        };

        return prompts[agentName] ?? `You are a ${agentName} for the Mirix memory system.`;
    }

    /**
     * Get the system prompt for a specific agent
     */
    getSystemPromptForAgent(agentName: string): string {
        // Priority 1: pre-loaded system_prompts dict
        if (this.systemPrompts && agentName in this.systemPrompts) {
            return this.systemPrompts[agentName];
        }

        // Priority 2: Fallback to default prompts
        return this.getDefaultSystemPrompt(agentName);
    }

    /**
     * Initialize Agent instances for each sub-agent to enable direct stepping
     */
    private async initializeAgentInstances(): Promise<void> {
        for (const config of MEMORY_AGENT_CONFIGS) {
            const agentState = this.memoryAgentStates.getAgentState(config.attrName);
            if (agentState !== null) {
                // Create a MirixAgent instance for this sub-agent
                const agentInstance = new MirixAgent(agentState.agent, {
                    maxSteps: this.config.maxSteps,
                    maxChainingSteps: this.config.maxChainingSteps,
                    maxTokens: this.config.maxTokens,
                    contextWindowLimit: this.config.contextWindowLimit,
                    temperature: this.config.temperature,
                    streaming: this.config.streaming,
                });

                this.agents.set(config.name, agentInstance);
            }
        }

        this.metaLogger.info(
            { count: this.agents.size },
            'Initialized Agent instances for sub-agents'
        );
    }

    // ========================================================================
    // ABSTRACT METHOD IMPLEMENTATIONS
    // ========================================================================

    /**
     * Build system prompt for the meta agent
     */
    protected async buildSystemPrompt(): Promise<string> {
        return `You are a MetaAgent responsible for coordinating memory operations across multiple memory sub-agents.

Available memory agents:
${MEMORY_AGENT_CONFIGS.map((c) => `- ${c.name}: ${c.agentType}`).join('\n')}

Your role is to:
1. Route memory requests to the appropriate sub-agent
2. Coordinate complex memory operations across multiple agents
3. Maintain consistency across the memory system`;
    }

    /**
     * Process tool calls
     */
    protected async processToolCalls(
        toolCalls: ToolCall[],
        context: ToolExecutionContext
    ): Promise<ToolReturn[]> {
        const results: ToolReturn[] = [];

        for (const tc of toolCalls) {
            // Route to appropriate memory agent based on tool name
            const agentName = this.routeToolCall(tc.name);

            if (agentName && this.agents.has(agentName)) {
                const agent = this.agents.get(agentName)!;
                const result = await agent.step(
                    `Execute tool: ${tc.name} with args: ${JSON.stringify(tc.arguments)}`,
                    context
                );

                results.push({
                    toolCallId: tc.id,
                    name: tc.name,
                    result: result.success ? result.message : result.error,
                });
            } else {
                results.push({
                    toolCallId: tc.id,
                    name: tc.name,
                    result: `Tool ${tc.name} not found or no agent available`,
                });
            }
        }

        return results;
    }

    /**
     * Route tool call to appropriate memory agent
     */
    private routeToolCall(toolName: string): string | null {
        // Simple routing based on tool name prefix
        if (toolName.startsWith('episodic_')) return 'episodic_memory_agent';
        if (toolName.startsWith('procedural_')) return 'procedural_memory_agent';
        if (toolName.startsWith('knowledge_')) return 'knowledge_memory_agent';
        if (toolName.startsWith('semantic_')) return 'semantic_memory_agent';
        if (toolName.startsWith('core_')) return 'core_memory_agent';
        if (toolName.startsWith('resource_')) return 'resource_memory_agent';
        if (toolName.startsWith('reflexion_')) return 'reflexion_agent';
        if (toolName.startsWith('background_')) return 'background_agent';

        // Default to meta_memory_agent
        return 'meta_memory_agent';
    }

    /**
     * Handle final response
     */
    protected async handleFinalResponse(message: string): Promise<void> {
        await this.addAssistantMessage(message);

        // Notify interface if available
        if (this.agentInterface) {
            this.agentInterface.assistantMessage(message);
        }
    }

    // ========================================================================
    // PUBLIC METHODS
    // ========================================================================

    /**
     * Execute a step with a specific memory agent or all agents
     */
    async stepWithAgent(
        messages: string,
        agentName?: string,
        context?: ToolExecutionContext
    ): Promise<MetaAgentUsageStatistics> {
        const executionContext = context ?? {
            agentId: this.agentId,
            userId: this.userId,
            organizationId: this.organizationId ?? '',
        };

        if (agentName !== undefined) {
            // Route to specific agent
            if (!this.agents.has(agentName)) {
                throw new Error(`Unknown memory agent: ${agentName}`);
            }

            const agent = this.agents.get(agentName)!;
            const result = await agent.step(messages, executionContext);

            return this.convertToUsageStatistics(result);
        }

        // Default behavior: route to meta_memory_agent for coordination
        if (this.agents.has('meta_memory_agent')) {
            const agent = this.agents.get('meta_memory_agent')!;
            const result = await agent.step(messages, executionContext);
            return this.convertToUsageStatistics(result);
        }

        throw new Error('No meta_memory_agent available for coordination');
    }

    /**
     * Convert AgentResult to MetaAgentUsageStatistics
     */
    private convertToUsageStatistics(result: AgentResult): MetaAgentUsageStatistics {
        return {
            completionTokens: result.tokenUsage.output,
            promptTokens: result.tokenUsage.input,
            totalTokens: result.tokenUsage.total,
            stepCount: result.stepCount,
        };
    }

    /**
     * Update the LLM configuration for all memory agents
     */
    updateLlmConfig(llmConfig: LLMConfig): void {
        this.llmConfig = llmConfig;

        this.metaLogger.info(
            { model: llmConfig.model },
            'Updated LLM config for all memory agents'
        );
    }

    /**
     * Update the embedding configuration for all memory agents
     */
    updateEmbeddingConfig(embeddingConfig: MetaAgentEmbeddingConfig): void {
        this.embeddingConfig = embeddingConfig;

        this.metaLogger.info('Updated embedding config for all memory agents');
    }

    /**
     * Get the state of a specific memory agent
     */
    getMemoryAgentState(agentName: string): AgentState | null {
        const attrName = `${this.toCamelCase(agentName)}State`;
        return this.memoryAgentStates.getAgentState(attrName);
    }

    /**
     * List all available memory agent names
     */
    listMemoryAgents(): string[] {
        return MEMORY_AGENT_CONFIGS.map((config) => config.name);
    }

    /**
     * Refresh agent instances from loaded states
     */
    async refreshAgents(): Promise<void> {
        await this.initializeAgentInstances();
        this.metaLogger.info('Refreshed all memory agent instances');
    }

    /**
     * Convert snake_case to camelCase
     */
    private toCamelCase(str: string): string {
        return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    /**
     * String representation
     */
    toString(): string {
        const agentCount = this.memoryAgentStates
            .getAllAgentStatesList()
            .filter((s) => s !== null).length;
        return `MetaAgent(userId=${this.userId}, memoryAgents=${agentCount}, model=${this.llmConfig.model})`;
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a MetaAgent from an existing Agent entity
 */
export function createMetaAgent(agent: Agent, options: MetaAgentOptions): MetaAgent {
    return new MetaAgent(agent, options);
}

export default MetaAgent;
