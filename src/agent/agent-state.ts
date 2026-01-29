/**
 * Agent State Management
 * Manages the internal state of agents during execution
 */

import { Message, Agent } from '@prisma/client';
import { ToolCall, ToolReturn, ToolExecutionState, createExecutionState } from '../tools/index.js';

// ============================================================================
// STATE TYPES
// ============================================================================

/**
 * Agent execution status
 */
export enum AgentStatus {
    IDLE = 'idle',
    THINKING = 'thinking',
    EXECUTING_TOOL = 'executing_tool',
    RESPONDING = 'responding',
    COMPLETED = 'completed',
    ERROR = 'error',
    INTERRUPTED = 'interrupted',
}

/**
 * Current step in the agent's execution
 */
export interface AgentStep {
    stepNumber: number;
    status: AgentStatus;
    startedAt: Date;
    completedAt?: Date;
    inputTokens?: number;
    outputTokens?: number;
    toolCalls?: ToolCall[];
    toolReturns?: ToolReturn[];
    assistantMessage?: string;
    error?: string;
}

/**
 * Complete agent execution state
 */
export interface AgentState {
    /** The agent entity */
    agent: Agent;

    /** Current status */
    status: AgentStatus;

    /** Messages in context */
    messages: Message[];

    /** Current step number */
    stepNumber: number;

    /** History of steps */
    stepHistory: AgentStep[];

    /** Current step (if in progress) */
    currentStep?: AgentStep;

    /** Tool execution state */
    toolState: ToolExecutionState;

    /** Token usage tracking */
    tokenUsage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };

    /** Start time of current execution */
    executionStartedAt?: Date;

    /** Whether agent should stop */
    shouldStop: boolean;

    /** Stop reason if stopped */
    stopReason?: string;

    /** Custom metadata */
    metadata: Record<string, unknown>;
}

// ============================================================================
// STATE FACTORY
// ============================================================================

/**
 * Create initial agent state
 */
export function createAgentState(agent: Agent): AgentState {
    return {
        agent,
        status: AgentStatus.IDLE,
        messages: [],
        stepNumber: 0,
        stepHistory: [],
        toolState: createExecutionState(),
        tokenUsage: {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
        },
        shouldStop: false,
        metadata: {},
    };
}

// ============================================================================
// STATE UPDATERS
// ============================================================================

/**
 * Update agent status
 */
export function updateStatus(state: AgentState, status: AgentStatus): AgentState {
    return { ...state, status };
}

/**
 * Add messages to state
 */
export function addMessages(state: AgentState, messages: Message[]): AgentState {
    return {
        ...state,
        messages: [...state.messages, ...messages],
    };
}

/**
 * Start a new step
 */
export function startStep(state: AgentState): AgentState {
    const newStepNumber = state.stepNumber + 1;
    const newStep: AgentStep = {
        stepNumber: newStepNumber,
        status: AgentStatus.THINKING,
        startedAt: new Date(),
    };

    return {
        ...state,
        status: AgentStatus.THINKING,
        stepNumber: newStepNumber,
        currentStep: newStep,
    };
}

/**
 * Complete the current step
 */
export function completeStep(
    state: AgentState,
    updates: Partial<AgentStep>
): AgentState {
    if (!state.currentStep) {
        return state;
    }

    const completedStep: AgentStep = {
        ...state.currentStep,
        ...updates,
        completedAt: new Date(),
    };

    return {
        ...state,
        status: AgentStatus.COMPLETED,
        stepHistory: [...state.stepHistory, completedStep],
        currentStep: undefined,
    };
}

/**
 * Record tool calls in current step
 */
export function recordToolCalls(
    state: AgentState,
    toolCalls: ToolCall[]
): AgentState {
    if (!state.currentStep) {
        return state;
    }

    return {
        ...state,
        status: AgentStatus.EXECUTING_TOOL,
        currentStep: {
            ...state.currentStep,
            status: AgentStatus.EXECUTING_TOOL,
            toolCalls: [...(state.currentStep.toolCalls ?? []), ...toolCalls],
        },
    };
}

/**
 * Record tool returns in current step
 */
export function recordToolReturns(
    state: AgentState,
    toolReturns: ToolReturn[]
): AgentState {
    if (!state.currentStep) {
        return state;
    }

    return {
        ...state,
        currentStep: {
            ...state.currentStep,
            toolReturns: [...(state.currentStep.toolReturns ?? []), ...toolReturns],
        },
    };
}

/**
 * Update token usage
 */
export function updateTokenUsage(
    state: AgentState,
    inputTokens: number,
    outputTokens: number
): AgentState {
    return {
        ...state,
        tokenUsage: {
            inputTokens: state.tokenUsage.inputTokens + inputTokens,
            outputTokens: state.tokenUsage.outputTokens + outputTokens,
            totalTokens: state.tokenUsage.totalTokens + inputTokens + outputTokens,
        },
    };
}

/**
 * Set stop flag
 */
export function setShouldStop(
    state: AgentState,
    reason: string
): AgentState {
    return {
        ...state,
        shouldStop: true,
        stopReason: reason,
    };
}

/**
 * Set error state
 */
export function setError(
    state: AgentState,
    error: string
): AgentState {
    return {
        ...state,
        status: AgentStatus.ERROR,
        shouldStop: true,
        stopReason: error,
        currentStep: state.currentStep
            ? {
                  ...state.currentStep,
                  status: AgentStatus.ERROR,
                  error,
                  completedAt: new Date(),
              }
            : undefined,
    };
}

/**
 * Update metadata
 */
export function updateMetadata(
    state: AgentState,
    key: string,
    value: unknown
): AgentState {
    return {
        ...state,
        metadata: {
            ...state.metadata,
            [key]: value,
        },
    };
}

// ============================================================================
// STATE QUERIES
// ============================================================================

/**
 * Get total execution time in ms
 */
export function getExecutionTime(state: AgentState): number {
    if (!state.executionStartedAt) {
        return 0;
    }
    return Date.now() - state.executionStartedAt.getTime();
}

/**
 * Check if agent can continue (within limits)
 */
export function canContinue(
    state: AgentState,
    maxSteps: number,
    maxTokens: number
): boolean {
    if (state.shouldStop) {
        return false;
    }
    if (state.stepNumber >= maxSteps) {
        return false;
    }
    if (state.tokenUsage.totalTokens >= maxTokens) {
        return false;
    }
    return true;
}

/**
 * Get summary of execution
 */
export function getExecutionSummary(state: AgentState): {
    steps: number;
    tokenUsage: { input: number; output: number; total: number };
    executionTimeMs: number;
    status: AgentStatus;
    toolCallCount: number;
} {
    const toolCallCount = state.stepHistory.reduce(
        (sum, step) => sum + (step.toolCalls?.length ?? 0),
        0
    );

    return {
        steps: state.stepNumber,
        tokenUsage: {
            input: state.tokenUsage.inputTokens,
            output: state.tokenUsage.outputTokens,
            total: state.tokenUsage.totalTokens,
        },
        executionTimeMs: getExecutionTime(state),
        status: state.status,
        toolCallCount,
    };
}
