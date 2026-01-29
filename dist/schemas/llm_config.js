/**
 * LLM Configuration Schema
 * Converted from: mirix/schemas/llm_config.py
 */
import { z } from 'zod';
/**
 * Supported LLM endpoint types
 */
export const LLMEndpointType = {
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    COHERE: 'cohere',
    GOOGLE_AI: 'google_ai',
    GOOGLE_VERTEX: 'google_vertex',
    AZURE_OPENAI: 'azure_openai',
    GROQ: 'groq',
    OLLAMA: 'ollama',
    WEBUI: 'webui',
    WEBUI_LEGACY: 'webui-legacy',
    LMSTUDIO: 'lmstudio',
    LMSTUDIO_LEGACY: 'lmstudio-legacy',
    LMSTUDIO_CHATCOMPLETIONS: 'lmstudio-chatcompletions',
    LLAMACPP: 'llamacpp',
    KOBOLDCPP: 'koboldcpp',
    VLLM: 'vllm',
    HUGGING_FACE: 'hugging-face',
    MISTRAL: 'mistral',
    TOGETHER: 'together',
    BEDROCK: 'bedrock',
    DEEPSEEK: 'deepseek',
    XAI: 'xai',
};
/**
 * Reasoning effort levels
 */
export const ReasoningEffort = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
};
/**
 * LLM Configuration Schema
 */
export const LLMConfigSchema = z.object({
    /** LLM model name */
    model: z.string().describe('LLM model name'),
    /** The endpoint type for the model */
    modelEndpointType: z.enum([
        'openai',
        'anthropic',
        'cohere',
        'google_ai',
        'google_vertex',
        'azure_openai',
        'groq',
        'ollama',
        'webui',
        'webui-legacy',
        'lmstudio',
        'lmstudio-legacy',
        'lmstudio-chatcompletions',
        'llamacpp',
        'koboldcpp',
        'vllm',
        'hugging-face',
        'mistral',
        'together',
        'bedrock',
        'deepseek',
        'xai',
    ]).describe('The endpoint type for the model'),
    /** The endpoint for the model */
    modelEndpoint: z.string().nullable().optional().describe('The endpoint for the model'),
    /** The wrapper for the model */
    modelWrapper: z.string().nullable().optional().describe('The wrapper for the model'),
    /** The context window size for the model */
    contextWindow: z.number().describe('The context window size for the model'),
    /** The handle for this config */
    handle: z.string().nullable().optional().describe('The handle for this config, in the format provider/model-name'),
    /** Temperature for text generation */
    temperature: z.number().default(0.7).describe('The temperature to use when generating text'),
    /** Maximum number of tokens to generate */
    maxTokens: z.number().nullable().default(4096).describe('The maximum number of tokens to generate'),
    /** Whether the model should use extended thinking */
    enableReasoner: z.boolean().default(false).describe('Whether the model should use extended thinking'),
    /** The reasoning effort level */
    reasoningEffort: z.enum(['low', 'medium', 'high']).nullable().optional().describe('The reasoning effort level'),
    /** Maximum reasoning tokens */
    maxReasoningTokens: z.number().default(0).describe('Configurable thinking budget for extended thinking'),
    /** Whether to put inner thoughts in kwargs */
    putInnerThoughtsInKwargs: z.boolean().nullable().optional().describe('Whether to put inner thoughts inside tool call kwargs'),
    /** Custom API key */
    apiKey: z.string().nullable().optional().describe('Custom API key for this specific model configuration'),
    /** Auth provider name */
    authProvider: z.string().nullable().optional().describe('Name of registered auth provider for dynamic header injection'),
    /** Whether the model is locally hosted */
    isLocalModel: z.boolean().default(false).describe('Whether the model is locally hosted'),
    // Azure-specific fields
    /** Azure API version */
    apiVersion: z.string().nullable().optional().describe('The API version for Azure OpenAI'),
    /** Azure endpoint */
    azureEndpoint: z.string().nullable().optional().describe('The Azure endpoint for the model'),
    /** Azure deployment name */
    azureDeployment: z.string().nullable().optional().describe('The Azure deployment name for the model'),
});
/**
 * Reasoning model prefixes that auto-enable reasoning
 */
const REASONING_MODEL_PREFIXES = ['o1', 'o3', 'o4', 'gpt-5'];
/**
 * Check if a model is a reasoning model
 */
export function isReasoningModel(model) {
    return REASONING_MODEL_PREFIXES.some(prefix => model.startsWith(prefix));
}
/**
 * Create a default LLM config for known models
 */
export function createDefaultLLMConfig(modelName) {
    const baseConfig = {
        modelWrapper: null,
        handle: null,
        temperature: 0.7,
        maxTokens: 4096,
        enableReasoner: isReasoningModel(modelName),
        reasoningEffort: null,
        maxReasoningTokens: 0,
        putInnerThoughtsInKwargs: null,
        apiKey: null,
        authProvider: null,
        isLocalModel: false,
        apiVersion: null,
        azureEndpoint: null,
        azureDeployment: null,
    };
    switch (modelName) {
        case 'gpt-4':
            return {
                ...baseConfig,
                model: 'gpt-4',
                modelEndpointType: 'openai',
                modelEndpoint: 'https://api.openai.com/v1',
                contextWindow: 8192,
            };
        case 'gpt-4o-mini':
            return {
                ...baseConfig,
                model: 'gpt-4o-mini',
                modelEndpointType: 'openai',
                modelEndpoint: 'https://api.openai.com/v1',
                contextWindow: 128000,
            };
        case 'gpt-4o':
            return {
                ...baseConfig,
                model: 'gpt-4o',
                modelEndpointType: 'openai',
                modelEndpoint: 'https://api.openai.com/v1',
                contextWindow: 128000,
            };
        case 'claude-3-5-sonnet':
            return {
                ...baseConfig,
                model: 'claude-3-5-sonnet-20241022',
                modelEndpointType: 'anthropic',
                modelEndpoint: 'https://api.anthropic.com/v1',
                contextWindow: 200000,
            };
        case 'gemini-2.0-flash':
            return {
                ...baseConfig,
                model: 'gemini-2.0-flash',
                modelEndpointType: 'google_ai',
                modelEndpoint: 'https://generativelanguage.googleapis.com',
                contextWindow: 1000000,
            };
        default:
            throw new Error(`Model ${modelName} not supported in default configs.`);
    }
}
/**
 * Pretty print LLM config
 */
export function prettyPrintLLMConfig(config) {
    let result = config.model;
    if (config.modelEndpointType) {
        result += ` [type=${config.modelEndpointType}]`;
    }
    if (config.modelEndpoint) {
        result += ` [endpoint=${config.modelEndpoint}]`;
    }
    return result;
}
//# sourceMappingURL=llm_config.js.map