/**
 * Tool Rule Solver
 * Resolves which tools are available based on rules and execution state
 */

import {
    ToolRule,
    ToolRuleType,
    InitToolRule,
    TerminalToolRule,
    ChildToolRule,
    MaxCountToolRule,
} from './types';
import { logger } from '../log';

// ============================================================================
// EXECUTION STATE
// ============================================================================

/**
 * Tracks the execution state for rule evaluation
 */
export interface ToolExecutionState {
    /** Tools that have been called in this session */
    calledTools: string[];
    /** Count of calls per tool */
    toolCallCounts: Map<string, number>;
    /** The last tool that was called */
    lastCalledTool?: string;
    /** Whether any tool has been called */
    hasCalled: boolean;
    /** Custom state for conditional rules */
    customState?: Record<string, unknown>;
}

/**
 * Create an initial execution state
 */
export function createExecutionState(): ToolExecutionState {
    return {
        calledTools: [],
        toolCallCounts: new Map(),
        hasCalled: false,
    };
}

/**
 * Update state after a tool call
 */
export function updateExecutionState(
    state: ToolExecutionState,
    toolName: string
): ToolExecutionState {
    const newState = { ...state };
    newState.calledTools = [...state.calledTools, toolName];
    newState.lastCalledTool = toolName;
    newState.hasCalled = true;

    const currentCount = state.toolCallCounts.get(toolName) ?? 0;
    newState.toolCallCounts = new Map(state.toolCallCounts);
    newState.toolCallCounts.set(toolName, currentCount + 1);

    return newState;
}

// ============================================================================
// TOOL RULE SOLVER
// ============================================================================

class ToolRuleSolver {
    private readonly logger = logger;

    /**
     * Get available tools based on rules and current state
     */
    getAvailableTools(
        allTools: string[],
        rules: ToolRule[],
        state: ToolExecutionState
    ): string[] {
        let availableTools = new Set(allTools);

        // Group rules by type
        const initRules: InitToolRule[] = [];
        const terminalRules: TerminalToolRule[] = [];
        const childRules: ChildToolRule[] = [];
        const maxCountRules: MaxCountToolRule[] = [];

        for (const rule of rules) {
            switch (rule.type) {
                case ToolRuleType.InitToolRule:
                    initRules.push(rule);
                    break;
                case ToolRuleType.TerminalToolRule:
                    terminalRules.push(rule);
                    break;
                case ToolRuleType.ChildToolRule:
                    childRules.push(rule);
                    break;
                case ToolRuleType.MaxCountToolRule:
                    maxCountRules.push(rule);
                    break;
            }
        }

        // Apply init rules - if no tool has been called, only init tools are available
        if (!state.hasCalled && initRules.length > 0) {
            const initToolNames = initRules.map((r) => r.toolName);
            availableTools = new Set(
                allTools.filter((t) => initToolNames.includes(t))
            );
            this.logger.debug(
                { availableTools: Array.from(availableTools) },
                'Applied init rules'
            );
            return Array.from(availableTools);
        }

        // Apply child rules - restrict to children of last called tool
        if (state.lastCalledTool) {
            const parentRules = childRules.filter(
                (r) => r.toolName === state.lastCalledTool
            );
            if (parentRules.length > 0) {
                const allowedChildren = new Set<string>();
                for (const rule of parentRules) {
                    for (const child of rule.children) {
                        allowedChildren.add(child);
                    }
                }
                availableTools = new Set(
                    Array.from(availableTools).filter((t) =>
                        allowedChildren.has(t)
                    )
                );
                this.logger.debug(
                    { parent: state.lastCalledTool, children: Array.from(allowedChildren) },
                    'Applied child rules'
                );
            }
        }

        // Apply max count rules
        for (const rule of maxCountRules) {
            const count = state.toolCallCounts.get(rule.toolName) ?? 0;
            if (count >= rule.maxCount) {
                availableTools.delete(rule.toolName);
                this.logger.debug(
                    { toolName: rule.toolName, count, maxCount: rule.maxCount },
                    'Tool exceeded max count'
                );
            }
        }

        return Array.from(availableTools);
    }

    /**
     * Check if a tool call would be terminal (end the agent's turn)
     */
    isTerminalCall(toolName: string, rules: ToolRule[]): boolean {
        return rules.some(
            (r) => r.type === ToolRuleType.TerminalToolRule && r.toolName === toolName
        );
    }

    /**
     * Check if all required tools have been called
     */
    checkRequiredTools(
        rules: ToolRule[],
        state: ToolExecutionState
    ): { satisfied: boolean; missing: string[] } {
        const requiredTools = rules
            .filter((r) => r.type === ToolRuleType.RequiredToolRule)
            .map((r) => r.toolName);

        const missing = requiredTools.filter(
            (t) => !state.calledTools.includes(t)
        );

        return {
            satisfied: missing.length === 0,
            missing,
        };
    }

    /**
     * Validate that a tool call is allowed given current state
     */
    validateToolCall(
        toolName: string,
        rules: ToolRule[],
        state: ToolExecutionState,
        availableTools: string[]
    ): { valid: boolean; reason?: string } {
        // Check if tool is in available tools
        if (!availableTools.includes(toolName)) {
            return {
                valid: false,
                reason: `Tool '${toolName}' is not available in current state`,
            };
        }

        // Check max count
        const maxCountRule = rules.find(
            (r) => r.type === ToolRuleType.MaxCountToolRule && r.toolName === toolName
        ) as MaxCountToolRule | undefined;

        if (maxCountRule) {
            const count = state.toolCallCounts.get(toolName) ?? 0;
            if (count >= maxCountRule.maxCount) {
                return {
                    valid: false,
                    reason: `Tool '${toolName}' has reached maximum call count (${maxCountRule.maxCount})`,
                };
            }
        }

        return { valid: true };
    }
}

// Singleton instance
export const toolRuleSolver = new ToolRuleSolver();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an InitToolRule
 */
export function initRule(toolName: string): InitToolRule {
    return { type: ToolRuleType.InitToolRule, toolName };
}

/**
 * Create a TerminalToolRule
 */
export function terminalRule(toolName: string): TerminalToolRule {
    return { type: ToolRuleType.TerminalToolRule, toolName };
}

/**
 * Create a ChildToolRule
 */
export function childRule(toolName: string, children: string[]): ChildToolRule {
    return { type: ToolRuleType.ChildToolRule, toolName, children };
}

/**
 * Create a MaxCountToolRule
 */
export function maxCountRule(toolName: string, maxCount: number): MaxCountToolRule {
    return { type: ToolRuleType.MaxCountToolRule, toolName, maxCount };
}

export default toolRuleSolver;
