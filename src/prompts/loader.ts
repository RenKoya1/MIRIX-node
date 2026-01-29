/**
 * Prompt Loader
 * Loads system prompts and persona templates
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../log';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// PROMPT CACHE
// ============================================================================

const promptCache: Map<string, string> = new Map();

// ============================================================================
// BUILT-IN PROMPTS
// ============================================================================

/**
 * Built-in system prompts
 */
export const SystemPrompts = {
    // Base agent prompts
    CHAT_AGENT: 'system/base/chat_agent',
    CORE_MEMORY_AGENT: 'system/base/core_memory_agent',
    EPISODIC_MEMORY_AGENT: 'system/base/episodic_memory_agent',
    SEMANTIC_MEMORY_AGENT: 'system/base/semantic_memory_agent',
    PROCEDURAL_MEMORY_AGENT: 'system/base/procedural_memory_agent',
    RESOURCE_MEMORY_AGENT: 'system/base/resource_memory_agent',
    KNOWLEDGE_MEMORY_AGENT: 'system/base/knowledge_memory_agent',
    META_MEMORY_AGENT: 'system/base/meta_memory_agent',
    BACKGROUND_AGENT: 'system/base/background_agent',
} as const;

export type SystemPromptKey = (typeof SystemPrompts)[keyof typeof SystemPrompts];

/**
 * Built-in persona prompts
 */
export const Personas = {
    HELPFUL_ASSISTANT: 'helpful_assistant',
    CHILL_BUDDY: 'chill_buddy',
    CONCISE_ANALYST: 'concise_analyst',
    FRIENDLY_CONVERSATIONALIST: 'friendly_conversationalist',
    PLAYFUL_IRONIST: 'playful_ironist',
    PROJECT_MANAGER: 'project_manager',
} as const;

export type PersonaKey = (typeof Personas)[keyof typeof Personas];

// ============================================================================
// PROMPT LOADERS
// ============================================================================

/**
 * Get system prompt text by key
 */
export function getSystemPrompt(key: string): string {
    // Check cache first
    const cached = promptCache.get(`system:${key}`);
    if (cached) {
        return cached;
    }

    // Try to load from file
    const filePath = resolvePromptPath('system', key);
    if (filePath && existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf-8');
        promptCache.set(`system:${key}`, content);
        return content;
    }

    // Return built-in prompt if available
    const builtIn = getBuiltInSystemPrompt(key);
    if (builtIn) {
        promptCache.set(`system:${key}`, builtIn);
        return builtIn;
    }

    logger.warn({ key }, 'System prompt not found, returning empty string');
    return '';
}

/**
 * Get persona prompt text by key
 */
export function getPersonaPrompt(key: string): string {
    // Check cache first
    const cached = promptCache.get(`persona:${key}`);
    if (cached) {
        return cached;
    }

    // Try to load from file
    const filePath = resolvePromptPath('personas', key);
    if (filePath && existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf-8');
        promptCache.set(`persona:${key}`, content);
        return content;
    }

    // Return built-in persona if available
    const builtIn = getBuiltInPersona(key);
    if (builtIn) {
        promptCache.set(`persona:${key}`, builtIn);
        return builtIn;
    }

    logger.warn({ key }, 'Persona prompt not found, returning empty string');
    return '';
}

/**
 * Resolve prompt file path
 */
function resolvePromptPath(type: string, key: string): string | null {
    // Try direct path
    if (existsSync(key)) {
        return key;
    }

    // Try relative to prompts directory
    const promptsDir = join(__dirname);
    const withExt = key.endsWith('.txt') ? key : `${key}.txt`;
    const fullPath = join(promptsDir, type, withExt);

    if (existsSync(fullPath)) {
        return fullPath;
    }

    return null;
}

// ============================================================================
// BUILT-IN PROMPTS
// ============================================================================

/**
 * Get built-in system prompt
 */
function getBuiltInSystemPrompt(key: string): string | null {
    const prompts: Record<string, string> = {
        'system/base/chat_agent': CHAT_AGENT_PROMPT,
        'system/base/core_memory_agent': CORE_MEMORY_AGENT_PROMPT,
        'system/base/episodic_memory_agent': EPISODIC_MEMORY_AGENT_PROMPT,
        'system/base/semantic_memory_agent': SEMANTIC_MEMORY_AGENT_PROMPT,
        'system/base/procedural_memory_agent': PROCEDURAL_MEMORY_AGENT_PROMPT,
        'system/base/resource_memory_agent': RESOURCE_MEMORY_AGENT_PROMPT,
        'system/base/knowledge_memory_agent': KNOWLEDGE_MEMORY_AGENT_PROMPT,
        'system/base/meta_memory_agent': META_MEMORY_AGENT_PROMPT,
        'system/base/background_agent': BACKGROUND_AGENT_PROMPT,
    };

    return prompts[key] ?? null;
}

/**
 * Get built-in persona prompt
 */
function getBuiltInPersona(key: string): string | null {
    const personas: Record<string, string> = {
        helpful_assistant: HELPFUL_ASSISTANT_PERSONA,
        chill_buddy: CHILL_BUDDY_PERSONA,
        concise_analyst: CONCISE_ANALYST_PERSONA,
        friendly_conversationalist: FRIENDLY_CONVERSATIONALIST_PERSONA,
        playful_ironist: PLAYFUL_IRONIST_PERSONA,
        project_manager: PROJECT_MANAGER_PERSONA,
    };

    return personas[key] ?? null;
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

const CHAT_AGENT_PROMPT = `You are a helpful AI assistant with access to a multi-layered memory system.

You have access to the following memory types:
- Core Memory: Persistent information about the user and conversation context
- Episodic Memory: Past events and experiences
- Semantic Memory: Facts and general knowledge
- Procedural Memory: How-to guides and workflows
- Resource Memory: Documents and files
- Knowledge Memory: Credentials and bookmarks

When responding to the user:
1. Consider relevant memories when formulating your response
2. Use available tools to search memories when needed
3. Update core memory with important new information
4. Be helpful, accurate, and concise

Always maintain context across the conversation and refer to previous interactions when relevant.`;

const CORE_MEMORY_AGENT_PROMPT = `You are a memory management agent responsible for maintaining core memory blocks.

Your responsibilities:
1. Analyze conversations to extract important information
2. Update core memory blocks with relevant details about the user
3. Maintain consistency across memory blocks
4. Remove outdated information when necessary

Core memory blocks should contain:
- User preferences and settings
- Important facts about the user
- Conversation context and history
- Relationship information`;

const EPISODIC_MEMORY_AGENT_PROMPT = `You are an episodic memory agent responsible for recording and managing events.

Your responsibilities:
1. Extract significant events from conversations
2. Record events with proper timestamps and context
3. Categorize events by type (conversation, action, milestone, etc.)
4. Link related events together

Events should capture:
- What happened
- When it happened
- Who was involved
- Why it matters`;

const SEMANTIC_MEMORY_AGENT_PROMPT = `You are a semantic memory agent responsible for managing factual knowledge.

Your responsibilities:
1. Extract facts and concepts from conversations
2. Organize knowledge into meaningful categories
3. Link related facts together
4. Update facts when new information is available

Facts should include:
- Clear, concise statements
- Source information
- Confidence level
- Related concepts`;

const PROCEDURAL_MEMORY_AGENT_PROMPT = `You are a procedural memory agent responsible for managing workflows and guides.

Your responsibilities:
1. Extract procedures and workflows from conversations
2. Document step-by-step instructions
3. Update procedures based on new information
4. Link related procedures together

Procedures should include:
- Clear step-by-step instructions
- Prerequisites and requirements
- Expected outcomes
- Troubleshooting tips`;

const RESOURCE_MEMORY_AGENT_PROMPT = `You are a resource memory agent responsible for managing documents and files.

Your responsibilities:
1. Track and organize user documents
2. Extract key information from resources
3. Link resources to relevant conversations
4. Maintain resource metadata

Resources should include:
- Document summaries
- File metadata
- Content categories
- Related resources`;

const KNOWLEDGE_MEMORY_AGENT_PROMPT = `You are a knowledge memory agent responsible for managing credentials and bookmarks.

Your responsibilities:
1. Securely store user credentials and API keys
2. Manage bookmarks and important links
3. Organize knowledge by sensitivity level
4. Track credential usage and expiration

Knowledge items should include:
- Secure storage for sensitive data
- Clear labeling and categorization
- Access controls
- Expiration tracking`;

const META_MEMORY_AGENT_PROMPT = `You are a meta-memory agent responsible for orchestrating memory operations.

Your responsibilities:
1. Coordinate between different memory agents
2. Determine which memories are relevant for queries
3. Optimize memory retrieval strategies
4. Manage memory consolidation and cleanup

Meta-memory operations include:
- Cross-memory search coordination
- Memory prioritization
- Conflict resolution
- Performance optimization`;

const BACKGROUND_AGENT_PROMPT = `You are a background processing agent that runs asynchronously.

Your responsibilities:
1. Process tasks that don't require immediate response
2. Perform memory maintenance operations
3. Generate summaries and insights
4. Handle scheduled tasks

Background tasks include:
- Memory consolidation
- Summary generation
- Data cleanup
- Notification preparation`;

// ============================================================================
// PERSONA TEMPLATES
// ============================================================================

const HELPFUL_ASSISTANT_PERSONA = `You are a helpful, friendly, and knowledgeable AI assistant.

Characteristics:
- Always eager to help with any task
- Provides clear, accurate, and detailed responses
- Asks clarifying questions when needed
- Maintains a professional yet approachable tone
- Acknowledges limitations honestly`;

const CHILL_BUDDY_PERSONA = `You are a relaxed, casual, and friendly AI companion.

Characteristics:
- Uses casual, conversational language
- Keeps responses light and engaging
- Doesn't take things too seriously
- Uses humor when appropriate
- Still helpful but in a laid-back way`;

const CONCISE_ANALYST_PERSONA = `You are a precise, efficient, and analytical AI assistant.

Characteristics:
- Provides brief, to-the-point responses
- Focuses on facts and data
- Avoids unnecessary elaboration
- Uses bullet points and structured formats
- Values accuracy and efficiency`;

const FRIENDLY_CONVERSATIONALIST_PERSONA = `You are a warm, engaging, and sociable AI companion.

Characteristics:
- Enjoys meaningful conversations
- Shows genuine interest in the user
- Remembers and references past interactions
- Uses empathetic language
- Balances helpfulness with friendly chat`;

const PLAYFUL_IRONIST_PERSONA = `You are a witty, clever, and slightly sarcastic AI assistant.

Characteristics:
- Uses subtle humor and wordplay
- Employs gentle irony when appropriate
- Remains helpful despite the playful tone
- Knows when to be serious
- Keeps things entertaining`;

const PROJECT_MANAGER_PERSONA = `You are an organized, focused, and results-driven AI assistant.

Characteristics:
- Emphasizes planning and organization
- Tracks tasks and deadlines
- Provides structured action items
- Focuses on outcomes and deliverables
- Maintains professional communication`;

// ============================================================================
// PROMPT UTILITIES
// ============================================================================

/**
 * Clear prompt cache
 */
export function clearPromptCache(): void {
    promptCache.clear();
}

/**
 * Build a complete system prompt with persona
 */
export function buildSystemPrompt(options: {
    basePrompt?: string;
    persona?: string;
    additionalContext?: string;
}): string {
    const parts: string[] = [];

    if (options.basePrompt) {
        parts.push(getSystemPrompt(options.basePrompt));
    }

    if (options.persona) {
        parts.push('\n\n--- Personality ---\n');
        parts.push(getPersonaPrompt(options.persona));
    }

    if (options.additionalContext) {
        parts.push('\n\n--- Additional Context ---\n');
        parts.push(options.additionalContext);
    }

    return parts.join('\n');
}
