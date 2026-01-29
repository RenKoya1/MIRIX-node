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
};
/**
 * Provider types
 */
export const ProviderType = {
    ANTHROPIC: 'anthropic',
    OPENAI: 'openai',
    GOOGLE_AI: 'google_ai',
    AZURE_OPENAI: 'azure_openai',
};
/**
 * Message roles
 */
export const MessageRole = {
    ASSISTANT: 'assistant',
    USER: 'user',
    TOOL: 'tool',
    FUNCTION: 'function',
    SYSTEM: 'system',
};
/**
 * Useful for kwargs that are bool + default option
 */
export const OptionState = {
    YES: 'yes',
    NO: 'no',
    DEFAULT: 'default',
};
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
};
/**
 * Status of agent step
 */
export const AgentStepStatus = {
    PAUSED: 'paused',
    RESUMED: 'resumed',
    COMPLETED: 'completed',
};
/**
 * Message stream status
 */
export const MessageStreamStatus = {
    DONE: '[DONE]',
};
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
};
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
};
//# sourceMappingURL=enums.js.map