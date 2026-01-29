/**
 * Enums for Mirix TypeScript
 * Converted from: mirix/schemas/enums.py
 */

/**
 * Types of tools in Mirix
 */
export const ToolType = {
    CUSTOM: 'custom',
    MIRIX_CORE: 'mirix_core',
    MIRIX_CODER_CORE: 'mirix_coder_core',
    MIRIX_MEMORY_CORE: 'mirix_memory_core',
    MIRIX_EXTRA: 'mirix_extra',
    MIRIX_MCP: 'mirix_mcp',
    MIRIX_MULTI_AGENT_CORE: 'mirix_multi_agent_core',
    USER_DEFINED: 'user_defined',
} as const;

export type ToolType = (typeof ToolType)[keyof typeof ToolType];

/**
 * Provider types
 */
export const ProviderType = {
    ANTHROPIC: 'anthropic',
    OPENAI: 'openai',
    GOOGLE_AI: 'google_ai',
    AZURE_OPENAI: 'azure_openai',
} as const;

export type ProviderType = (typeof ProviderType)[keyof typeof ProviderType];

/**
 * Message roles
 */
export const MessageRole = {
    ASSISTANT: 'assistant',
    USER: 'user',
    TOOL: 'tool',
    FUNCTION: 'function',
    SYSTEM: 'system',
} as const;

export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

/**
 * Useful for kwargs that are bool + default option
 */
export const OptionState = {
    YES: 'yes',
    NO: 'no',
    DEFAULT: 'default',
} as const;

export type OptionState = (typeof OptionState)[keyof typeof OptionState];

/**
 * Status of the job
 */
export const JobStatus = {
    NOT_STARTED: 'not_started',
    CREATED: 'created',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    PENDING: 'pending',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

/**
 * Status of agent step
 */
export const AgentStepStatus = {
    PAUSED: 'paused',
    RESUMED: 'resumed',
    COMPLETED: 'completed',
} as const;

export type AgentStepStatus = (typeof AgentStepStatus)[keyof typeof AgentStepStatus];

/**
 * Message stream status
 */
export const MessageStreamStatus = {
    DONE: '[DONE]',
} as const;

export type MessageStreamStatus = (typeof MessageStreamStatus)[keyof typeof MessageStreamStatus];

/**
 * Type of tool rule
 */
export const ToolRuleType = {
    RUN_FIRST: 'run_first',
    EXIT_LOOP: 'exit_loop',
    CONTINUE_LOOP: 'continue_loop',
    CONDITIONAL: 'conditional',
    CONSTRAIN_CHILD_TOOLS: 'constrain_child_tools',
    MAX_COUNT_PER_STEP: 'max_count_per_step',
    PARENT_LAST_TOOL: 'parent_last_tool',
} as const;

export type ToolRuleType = (typeof ToolRuleType)[keyof typeof ToolRuleType];

/**
 * Memory types
 */
export const MemoryType = {
    CORE: 'core',
    EPISODIC: 'episodic',
    SEMANTIC: 'semantic',
    PROCEDURAL: 'procedural',
    RESOURCE: 'resource',
    KNOWLEDGE: 'knowledge',
} as const;

export type MemoryType = (typeof MemoryType)[keyof typeof MemoryType];
