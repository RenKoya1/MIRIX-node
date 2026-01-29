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
} from './agent-state.js';

// Base Agent
export {
    BaseAgent,
    DEFAULT_AGENT_CONFIG,
    type AgentConfig,
    type AgentResult,
} from './base-agent.js';

// Main Agent
export {
    MirixAgent,
    createAgent,
} from './agent.js';
