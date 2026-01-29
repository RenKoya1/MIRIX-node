/**
 * Agent Module
 * Central exports for the MIRIX agent system
 */

// Agent State
export {
    AgentStatus,
    type AgentState,
    type AgentStep,
    createAgentState,
    updateStatus,
    startStep,
    completeStep,
    recordToolCalls,
    recordToolReturns,
    updateTokenUsage,
    setShouldStop,
    setError,
    updateMetadata,
    getExecutionTime,
    canContinue,
    getExecutionSummary,
} from './agent-state';

// Base Agent
export {
    BaseAgent,
    DEFAULT_AGENT_CONFIG,
    type AgentConfig,
    type AgentResult,
} from './base-agent';

// Main Agent
export {
    MirixAgent,
    createAgent,
} from './agent';

// Meta Agent
export {
    MetaAgent,
    MemoryAgentStates,
    MEMORY_AGENT_CONFIGS,
    createMetaAgent,
} from './meta-agent';

export type {
    MemoryAgentConfig,
    MetaAgentOptions,
    MemoryAgentType,
    MetaAgentEmbeddingConfig,
    MetaAgentUsageStatistics,
} from './meta-agent';
