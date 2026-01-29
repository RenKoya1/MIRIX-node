/**
 * Constants Module
 * Global constants for MIRIX - used by both client and server
 * Converted from: mirix/constants.py
 */

import path from 'path';
import os from 'os';

// ============================================================================
// CLIENT CONSTANTS - Used by both client and server
// ============================================================================

/** Default organization ID */
export const DEFAULT_ORG_ID = 'org-00000000-0000-4000-8000-000000000000';

/** Admin user ID */
export const ADMIN_USER_ID = 'user-00000000-0000-4000-8000-000000000000';

// ============================================================================
// EMBEDDING CONSTANTS
// ============================================================================

/** Maximum supported embedding size - do NOT change or else DBs will need to be reset */
export const MAX_EMBEDDING_DIM = 4096;

/** Default chunk size for text splitting */
export const DEFAULT_EMBEDDING_CHUNK_SIZE = 300;

/** Minimum context window size */
export const MIN_CONTEXT_WINDOW = 4096;

// ============================================================================
// MEMORY LIMITS
// ============================================================================

/** Core memory block character limit */
export const CORE_MEMORY_BLOCK_CHAR_LIMIT = 5000;

/** Core memory persona character limit */
export const CORE_MEMORY_PERSONA_CHAR_LIMIT = 5000;

/** Core memory human character limit */
export const CORE_MEMORY_HUMAN_CHAR_LIMIT = 5000;

// ============================================================================
// FUNCTION/TOOL CONSTANTS
// ============================================================================

/** Maximum length of function return values */
export const FUNCTION_RETURN_CHAR_LIMIT = 60000; // ~300 words

/** Maximum length of tool call IDs */
export const TOOL_CALL_ID_MAX_LEN = 29;

// ============================================================================
// TOOL MODULE NAMES
// ============================================================================

/** Composio tool tag name */
export const COMPOSIO_TOOL_TAG_NAME = 'composio';

/** Core tool module name */
export const MIRIX_CORE_TOOL_MODULE_NAME = 'mirix.functions.function_sets.base';

/** Memory tool module name */
export const MIRIX_MEMORY_TOOL_MODULE_NAME = 'mirix.functions.function_sets.memory_tools';

/** Extra tool module name */
export const MIRIX_EXTRA_TOOL_MODULE_NAME = 'mirix.functions.function_sets.extras';

// ============================================================================
// MESSAGE DEFAULTS
// ============================================================================

/** Default message tool name */
export const DEFAULT_MESSAGE_TOOL = 'send_message';

/** Default message tool argument name */
export const DEFAULT_MESSAGE_TOOL_KWARG = 'message';

// ============================================================================
// LLM MODEL TOKEN LIMITS
// ============================================================================

export const LLM_MAX_TOKENS: Record<string, number> = {
    'DEFAULT': 8192,
    // OpenAI models
    'chatgpt-4o-latest': 128000,
    'gpt-4o-2024-08-06': 128000,
    'gpt-4-turbo-preview': 128000,
    'gpt-4o': 128000,
    'gpt-3.5-turbo-instruct': 16385,
    'gpt-4-0125-preview': 128000,
    'gpt-3.5-turbo-0125': 16385,
    'gpt-4-turbo-2024-04-09': 128000,
    'gpt-4-turbo': 8192,
    'gpt-4o-2024-05-13': 128000,
    'gpt-4o-mini': 128000,
    'gpt-4o-mini-2024-07-18': 128000,
    'gpt-4-1106-preview': 128000,
    'gpt-4': 8192,
    'gpt-4-32k': 32768,
    'gpt-4-0613': 8192,
    'gpt-4-32k-0613': 32768,
    'gpt-4-0314': 8192,  // legacy
    'gpt-4-32k-0314': 32768,  // legacy
    'gpt-3.5-turbo-1106': 16385,
    'gpt-3.5-turbo': 4096,
    'gpt-3.5-turbo-16k': 16385,
    'gpt-3.5-turbo-0613': 4096,  // legacy
    'gpt-3.5-turbo-16k-0613': 16385,  // legacy
    'gpt-3.5-turbo-0301': 4096,  // legacy
    // GPT-4.1 and GPT-5 series
    'gpt-4.1': 128000,
    'gpt-4.1-mini': 128000,
    'gpt-4.1-nano': 128000,
    'gpt-5': 256000,
    'gpt-5-mini': 256000,
    'gpt-5-nano': 128000,
    'gpt-5.1': 256000,
    'gpt-5.2': 256000,
    // o-series
    'o1': 200000,
    'o1-mini': 128000,
    'o3': 200000,
    'o3-mini': 200000,
    'o3-pro': 200000,
    'o4-mini': 200000,
    // Claude models
    'claude-3-opus-20240229': 200000,
    'claude-3-sonnet-20240229': 200000,
    'claude-3-haiku-20240307': 200000,
    'claude-3-5-sonnet-20241022': 200000,
    'claude-3-5-haiku-20241022': 200000,
    'claude-opus-4-20250514': 200000,
    'claude-sonnet-4-20250514': 200000,
    // Gemini models
    'gemini-1.5-pro': 2097152,
    'gemini-1.5-flash': 1048576,
    'gemini-2.0-flash': 1048576,
    'gemini-2.0-flash-lite': 1048576,
    'gemini-3-flash-preview': 2097152,
};

// ============================================================================
// SERVER-ONLY CONSTANTS
// ============================================================================

/** MIRIX home directory */
export const MIRIX_DIR = path.join(os.homedir(), '.mirix');

/** MIRIX tool sandbox directory */
export const MIRIX_DIR_TOOL_SANDBOX = path.join(MIRIX_DIR, 'tool_sandbox_dir');

/** Admin API prefix */
export const ADMIN_PREFIX = '/v1/admin';

/** API prefix */
export const API_PREFIX = '/v1';

/** OpenAI API prefix */
export const OPENAI_API_PREFIX = '/openai';

/** Composio entity environment variable key */
export const COMPOSIO_ENTITY_ENV_VAR_KEY = 'COMPOSIO_ENTITY';

/** String in the error message for when the context window is too large */
export const OPENAI_CONTEXT_WINDOW_ERROR_SUBSTRING = 'maximum context length';

// ============================================================================
// SYSTEM PROMPT TEMPLATING
// ============================================================================

/** In-context memory keyword */
export const IN_CONTEXT_MEMORY_KEYWORD = 'CORE_MEMORY';

/** Maximum chaining steps */
export const MAX_CHAINING_STEPS = 10;

/** Maximum retrieval limit in system */
export const MAX_RETRIEVAL_LIMIT_IN_SYSTEM = 10;

// ============================================================================
// TOKENIZERS
// ============================================================================

/** Embedding to tokenizer mapping */
export const EMBEDDING_TO_TOKENIZER_MAP: Record<string, string> = {
    'text-embedding-3-small': 'cl100k_base',
    'text-embedding-3-large': 'cl100k_base',
    'text-embedding-ada-002': 'cl100k_base',
};

/** Default tokenizer */
export const EMBEDDING_TO_TOKENIZER_DEFAULT = 'cl100k_base';

// ============================================================================
// DEFAULTS
// ============================================================================

/** Default MIRIX model */
export const DEFAULT_MIRIX_MODEL = 'gpt-4';

/** Default persona */
export const DEFAULT_PERSONA = 'sam_pov';

/** Default human */
export const DEFAULT_HUMAN = 'basic';

/** Default preset */
export const DEFAULT_PRESET = 'memgpt_chat';

// ============================================================================
// TOOL LISTS
// ============================================================================

/** Base tools that cannot be edited, as they access agent state directly */
export const BASE_TOOLS = [
    'search_in_memory',
    'list_memory_within_timerange',
] as const;

/** Core memory tools - can be edited, added by default */
export const CORE_MEMORY_TOOLS = [
    'core_memory_append',
    'core_memory_rewrite',
] as const;

/** Episodic memory tools */
export const EPISODIC_MEMORY_TOOLS = [
    'episodic_memory_insert',
    'episodic_memory_merge',
    'episodic_memory_replace',
    'check_episodic_memory',
] as const;

/** Procedural memory tools */
export const PROCEDURAL_MEMORY_TOOLS = [
    'procedural_memory_insert',
    'procedural_memory_update',
] as const;

/** Resource memory tools */
export const RESOURCE_MEMORY_TOOLS = [
    'resource_memory_insert',
    'resource_memory_update',
] as const;

/** Knowledge memory tools */
export const KNOWLEDGE_MEMORY_TOOLS = [
    'knowledge_insert',
    'knowledge_update',
] as const;

/** Semantic memory tools */
export const SEMANTIC_MEMORY_TOOLS = [
    'semantic_memory_insert',
    'semantic_memory_update',
    'check_semantic_memory',
] as const;

/** Chat agent tools */
export const CHAT_AGENT_TOOLS: readonly string[] = [] as const;

/** Extras tools */
export const EXTRAS_TOOLS = [
    'web_search',
    'fetch_and_read_pdf',
] as const;

/** MCP tools */
export const MCP_TOOLS: readonly string[] = [] as const;

/** Meta memory tools - when meta_memory_agent has child agents */
export const META_MEMORY_TOOLS = [
    'trigger_memory_update',
] as const;

/** Meta memory tools - direct mode (no child agents) */
export const META_MEMORY_TOOLS_DIRECT = [
    // Core memory tools
    'core_memory_append',
    'core_memory_rewrite',
    // Episodic memory tools
    'episodic_memory_insert',
    'episodic_memory_merge',
    // Semantic memory tools
    'semantic_memory_insert',
    // Procedural memory tools
    'procedural_memory_insert',
    // Knowledge tools
    'knowledge_insert',
    // Resource memory tools
    'resource_memory_insert',
] as const;

/** Search memory tools */
export const SEARCH_MEMORY_TOOLS = [
    'search_in_memory',
    'list_memory_within_timerange',
] as const;

/** Universal memory tools */
export const UNIVERSAL_MEMORY_TOOLS = [
    'search_in_memory',
    'finish_memory_update',
    'list_memory_within_timerange',
] as const;

/** All tools combined */
export const ALL_TOOLS = [
    ...new Set([
        ...BASE_TOOLS,
        ...CORE_MEMORY_TOOLS,
        ...EPISODIC_MEMORY_TOOLS,
        ...PROCEDURAL_MEMORY_TOOLS,
        ...RESOURCE_MEMORY_TOOLS,
        ...KNOWLEDGE_MEMORY_TOOLS,
        ...SEMANTIC_MEMORY_TOOLS,
        ...META_MEMORY_TOOLS,
        ...UNIVERSAL_MEMORY_TOOLS,
        ...CHAT_AGENT_TOOLS,
        ...EXTRAS_TOOLS,
        ...MCP_TOOLS,
    ]),
] as const;

// ============================================================================
// STRUCTURED OUTPUT MODELS
// ============================================================================

/** Models that support structured output */
export const STRUCTURED_OUTPUT_MODELS = new Set([
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-5',
    'gpt-5-mini',
]);

// ============================================================================
// LOGGING
// ============================================================================

/** Logger log levels */
export const LOGGER_LOG_LEVELS = {
    CRITICAL: 60,
    ERROR: 50,
    WARN: 40,
    WARNING: 40,
    INFO: 30,
    DEBUG: 20,
    TRACE: 10,
    NOTSET: 0,
} as const;

// ============================================================================
// AGENT CONSTANTS
// ============================================================================

/** First message attempts */
export const FIRST_MESSAGE_ATTEMPTS = 10;

/** Initial boot message */
export const INITIAL_BOOT_MESSAGE = 'Boot sequence complete. Persona activated.';

/** Initial boot message send message thought */
export const INITIAL_BOOT_MESSAGE_SEND_MESSAGE_THOUGHT =
    'Bootup sequence complete. Persona activated. Testing messaging functionality.';

/** Startup quotes */
export const STARTUP_QUOTES = [
    'I think, therefore I am.',
    'All those moments will be lost in time, like tears in rain.',
    'More human than human is our motto.',
] as const;

/** Initial boot message first message */
export const INITIAL_BOOT_MESSAGE_SEND_MESSAGE_FIRST_MSG = STARTUP_QUOTES[2];

// ============================================================================
// CLI/ERROR CONSTANTS
// ============================================================================

/** CLI warning prefix */
export const CLI_WARNING_PREFIX = 'Warning: ';

/** Error message prefix */
export const ERROR_MESSAGE_PREFIX = 'Error';

/** Non-user message prefix */
export const NON_USER_MSG_PREFIX = '[This is an automated system message hidden from the user] ';

/** Message summary warning string */
export const MESSAGE_SUMMARY_WARNING_STR = [
    `${NON_USER_MSG_PREFIX}The conversation history will soon reach its maximum length and be trimmed.`,
    'Do NOT tell the user about this system alert, they should not know that the history is reaching max length.',
].join(' ');

/** Message summary request acknowledgement */
export const MESSAGE_SUMMARY_REQUEST_ACK =
    "Understood, I will respond with a summary of the message (and only the summary, nothing else) once I receive the conversation history. I'm ready.";

/** Maximum error message character limit */
export const MAX_ERROR_MESSAGE_CHAR_LIMIT = 500;

/** Maximum pause heartbeats (in minutes) */
export const MAX_PAUSE_HEARTBEATS = 360;

// ============================================================================
// FUNCTIONS RELATED
// ============================================================================

/** Request heartbeat message */
export const REQ_HEARTBEAT_MESSAGE = `${NON_USER_MSG_PREFIX}Function called using continue_chaining=true, returning control`;

/** Function failed heartbeat message */
export const FUNC_FAILED_HEARTBEAT_MESSAGE = `${NON_USER_MSG_PREFIX}Function call failed, returning control`;

// ============================================================================
// RETRIEVAL
// ============================================================================

/** Default retrieval query page size */
export const RETRIEVAL_QUERY_DEFAULT_PAGE_SIZE = 5;

// ============================================================================
// FILE CONSTANTS
// ============================================================================

/** Maximum filename length */
export const MAX_FILENAME_LENGTH = 255;

/** Reserved filenames (Windows) */
export const RESERVED_FILENAMES = new Set([
    'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'LPT1', 'LPT2',
]);

/** Maximum images to process */
export const MAX_IMAGES_TO_PROCESS = 100;

// ============================================================================
// WRAPPER/THOUGHTS
// ============================================================================

/** Default wrapper name */
export const DEFAULT_WRAPPER_NAME = 'chatml';

/** Inner thoughts keyword argument description */
export const INNER_THOUGHTS_KWARG_DESCRIPTION = 'Deep inner monologue private to you only.';

/** Inner thoughts CLI symbol */
export const INNER_THOUGHTS_CLI_SYMBOL = '💭';

/** Assistant message CLI symbol */
export const ASSISTANT_MESSAGE_CLI_SYMBOL = '🤖';

// ============================================================================
// ENVIRONMENT TOGGLES
// ============================================================================

/** Clear history after memory update */
export const CLEAR_HISTORY_AFTER_MEMORY_UPDATE =
    (process.env.CLEAR_HISTORY_AFTER_MEMORY_UPDATE ?? 'true').toLowerCase() === 'true' ||
    process.env.CLEAR_HISTORY_AFTER_MEMORY_UPDATE === '1';

/** Call memory agent in parallel */
export const CALL_MEMORY_AGENT_IN_PARALLEL =
    (process.env.CALL_MEMORY_AGENT_IN_PARALLEL ?? 'false').toLowerCase() === 'true' ||
    process.env.CALL_MEMORY_AGENT_IN_PARALLEL === '1';

/** Chaining for memory update */
export const CHAINING_FOR_MEMORY_UPDATE =
    (process.env.CHAINING_FOR_MEMORY_UPDATE ?? 'false').toLowerCase() === 'true' ||
    process.env.CHAINING_FOR_MEMORY_UPDATE === '1';

/** Load image content for last message only */
export const LOAD_IMAGE_CONTENT_FOR_LAST_MESSAGE_ONLY =
    (process.env.LOAD_IMAGE_CONTENT_FOR_LAST_MESSAGE_ONLY ?? 'false').toLowerCase() === 'true' ||
    process.env.LOAD_IMAGE_CONTENT_FOR_LAST_MESSAGE_ONLY === '1';

// ============================================================================
// MESSAGE MODEL CONSTANTS
// ============================================================================

/** Message ChatGPT function model */
export const MESSAGE_CHATGPT_FUNCTION_MODEL = 'gpt-3.5-turbo';

/** Message ChatGPT function system message */
export const MESSAGE_CHATGPT_FUNCTION_SYSTEM_MESSAGE =
    'You are a helpful assistant. Keep your responses short and concise.';
