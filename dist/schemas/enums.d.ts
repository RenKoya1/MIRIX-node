/**
 * Enums for Mirix TypeScript
 * Converted from: mirix/schemas/enums.py
 */
/**
 * Types of tools in Mirix
 */
export declare const ToolType: {
    readonly CUSTOM: "custom";
    readonly MIRIX_CORE: "mirix_core";
    readonly MIRIX_CODER_CORE: "mirix_coder_core";
    readonly MIRIX_MEMORY_CORE: "mirix_memory_core";
    readonly MIRIX_EXTRA: "mirix_extra";
    readonly MIRIX_MCP: "mirix_mcp";
    readonly MIRIX_MULTI_AGENT_CORE: "mirix_multi_agent_core";
    readonly USER_DEFINED: "user_defined";
};
export type ToolType = (typeof ToolType)[keyof typeof ToolType];
/**
 * Provider types
 */
export declare const ProviderType: {
    readonly ANTHROPIC: "anthropic";
    readonly OPENAI: "openai";
    readonly GOOGLE_AI: "google_ai";
    readonly AZURE_OPENAI: "azure_openai";
};
export type ProviderType = (typeof ProviderType)[keyof typeof ProviderType];
/**
 * Message roles
 */
export declare const MessageRole: {
    readonly ASSISTANT: "assistant";
    readonly USER: "user";
    readonly TOOL: "tool";
    readonly FUNCTION: "function";
    readonly SYSTEM: "system";
};
export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];
/**
 * Useful for kwargs that are bool + default option
 */
export declare const OptionState: {
    readonly YES: "yes";
    readonly NO: "no";
    readonly DEFAULT: "default";
};
export type OptionState = (typeof OptionState)[keyof typeof OptionState];
/**
 * Status of the job
 */
export declare const JobStatus: {
    readonly NOT_STARTED: "not_started";
    readonly CREATED: "created";
    readonly RUNNING: "running";
    readonly COMPLETED: "completed";
    readonly FAILED: "failed";
    readonly PENDING: "pending";
    readonly CANCELLED: "cancelled";
    readonly EXPIRED: "expired";
};
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
/**
 * Status of agent step
 */
export declare const AgentStepStatus: {
    readonly PAUSED: "paused";
    readonly RESUMED: "resumed";
    readonly COMPLETED: "completed";
};
export type AgentStepStatus = (typeof AgentStepStatus)[keyof typeof AgentStepStatus];
/**
 * Message stream status
 */
export declare const MessageStreamStatus: {
    readonly DONE: "[DONE]";
};
export type MessageStreamStatus = (typeof MessageStreamStatus)[keyof typeof MessageStreamStatus];
/**
 * Type of tool rule
 */
export declare const ToolRuleType: {
    readonly RUN_FIRST: "run_first";
    readonly EXIT_LOOP: "exit_loop";
    readonly CONTINUE_LOOP: "continue_loop";
    readonly CONDITIONAL: "conditional";
    readonly CONSTRAIN_CHILD_TOOLS: "constrain_child_tools";
    readonly MAX_COUNT_PER_STEP: "max_count_per_step";
    readonly PARENT_LAST_TOOL: "parent_last_tool";
};
export type ToolRuleType = (typeof ToolRuleType)[keyof typeof ToolRuleType];
/**
 * Memory types
 */
export declare const MemoryType: {
    readonly CORE: "core";
    readonly EPISODIC: "episodic";
    readonly SEMANTIC: "semantic";
    readonly PROCEDURAL: "procedural";
    readonly RESOURCE: "resource";
    readonly KNOWLEDGE: "knowledge";
};
export type MemoryType = (typeof MemoryType)[keyof typeof MemoryType];
//# sourceMappingURL=enums.d.ts.map