/**
 * Tools Module
 * Central exports for the MIRIX tool system
 */

// Types
export {
    type ToolDefinition,
    type ToolExecutionContext,
    type ToolExecutionResult,
    type ToolHandler,
    type ToolParameterSchema,
    type ToolCall,
    type ToolReturn,
    type ToolRule,
    type MCPServerConfig,
    type MCPToolDefinition,
    type MCPResource,
    type MCPPrompt,
    ToolRuleType,
    ToolCallSchema,
    ToolReturnSchema,
    ToolExecutionResultSchema,
    MCPServerConfigSchema,
} from './types.js';

// Registry
export {
    toolRegistry,
    createTool,
} from './registry.js';

// Rule Solver
export {
    toolRuleSolver,
    createExecutionState,
    updateExecutionState,
    initRule,
    terminalRule,
    childRule,
    maxCountRule,
    type ToolExecutionState,
} from './tool-rule-solver.js';

// Sandbox
export {
    toolSandbox,
    createSandbox,
    type SandboxConfig,
} from './sandbox.js';

// Core Tools
export {
    sendMessageTool,
    conversationSearchTool,
} from './core/index.js';

// Memory Tools
export {
    coreMemoryTools,
    coreMemoryGetTool,
    coreMemoryUpdateTool,
    coreMemoryAppendTool,
} from './memory/index.js';
