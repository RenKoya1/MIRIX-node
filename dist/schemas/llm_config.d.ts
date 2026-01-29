/**
 * LLM Configuration Schema
 * Converted from: mirix/schemas/llm_config.py
 */
import { z } from 'zod';
/**
 * Supported LLM endpoint types
 */
export declare const LLMEndpointType: {
    readonly OPENAI: "openai";
    readonly ANTHROPIC: "anthropic";
    readonly COHERE: "cohere";
    readonly GOOGLE_AI: "google_ai";
    readonly GOOGLE_VERTEX: "google_vertex";
    readonly AZURE_OPENAI: "azure_openai";
    readonly GROQ: "groq";
    readonly OLLAMA: "ollama";
    readonly WEBUI: "webui";
    readonly WEBUI_LEGACY: "webui-legacy";
    readonly LMSTUDIO: "lmstudio";
    readonly LMSTUDIO_LEGACY: "lmstudio-legacy";
    readonly LMSTUDIO_CHATCOMPLETIONS: "lmstudio-chatcompletions";
    readonly LLAMACPP: "llamacpp";
    readonly KOBOLDCPP: "koboldcpp";
    readonly VLLM: "vllm";
    readonly HUGGING_FACE: "hugging-face";
    readonly MISTRAL: "mistral";
    readonly TOGETHER: "together";
    readonly BEDROCK: "bedrock";
    readonly DEEPSEEK: "deepseek";
    readonly XAI: "xai";
};
export type LLMEndpointType = (typeof LLMEndpointType)[keyof typeof LLMEndpointType];
/**
 * Reasoning effort levels
 */
export declare const ReasoningEffort: {
    readonly LOW: "low";
    readonly MEDIUM: "medium";
    readonly HIGH: "high";
};
export type ReasoningEffort = (typeof ReasoningEffort)[keyof typeof ReasoningEffort];
/**
 * LLM Configuration Schema
 */
export declare const LLMConfigSchema: z.ZodObject<{
    /** LLM model name */
    model: z.ZodString;
    /** The endpoint type for the model */
    modelEndpointType: z.ZodEnum<["openai", "anthropic", "cohere", "google_ai", "google_vertex", "azure_openai", "groq", "ollama", "webui", "webui-legacy", "lmstudio", "lmstudio-legacy", "lmstudio-chatcompletions", "llamacpp", "koboldcpp", "vllm", "hugging-face", "mistral", "together", "bedrock", "deepseek", "xai"]>;
    /** The endpoint for the model */
    modelEndpoint: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** The wrapper for the model */
    modelWrapper: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** The context window size for the model */
    contextWindow: z.ZodNumber;
    /** The handle for this config */
    handle: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** Temperature for text generation */
    temperature: z.ZodDefault<z.ZodNumber>;
    /** Maximum number of tokens to generate */
    maxTokens: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    /** Whether the model should use extended thinking */
    enableReasoner: z.ZodDefault<z.ZodBoolean>;
    /** The reasoning effort level */
    reasoningEffort: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
    /** Maximum reasoning tokens */
    maxReasoningTokens: z.ZodDefault<z.ZodNumber>;
    /** Whether to put inner thoughts in kwargs */
    putInnerThoughtsInKwargs: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    /** Custom API key */
    apiKey: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** Auth provider name */
    authProvider: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** Whether the model is locally hosted */
    isLocalModel: z.ZodDefault<z.ZodBoolean>;
    /** Azure API version */
    apiVersion: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** Azure endpoint */
    azureEndpoint: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** Azure deployment name */
    azureDeployment: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    model: string;
    modelEndpointType: "anthropic" | "openai" | "google_ai" | "azure_openai" | "cohere" | "google_vertex" | "groq" | "ollama" | "webui" | "webui-legacy" | "lmstudio" | "lmstudio-legacy" | "lmstudio-chatcompletions" | "llamacpp" | "koboldcpp" | "vllm" | "hugging-face" | "mistral" | "together" | "bedrock" | "deepseek" | "xai";
    contextWindow: number;
    temperature: number;
    maxTokens: number | null;
    enableReasoner: boolean;
    maxReasoningTokens: number;
    isLocalModel: boolean;
    modelEndpoint?: string | null | undefined;
    modelWrapper?: string | null | undefined;
    handle?: string | null | undefined;
    reasoningEffort?: "low" | "medium" | "high" | null | undefined;
    putInnerThoughtsInKwargs?: boolean | null | undefined;
    apiKey?: string | null | undefined;
    authProvider?: string | null | undefined;
    apiVersion?: string | null | undefined;
    azureEndpoint?: string | null | undefined;
    azureDeployment?: string | null | undefined;
}, {
    model: string;
    modelEndpointType: "anthropic" | "openai" | "google_ai" | "azure_openai" | "cohere" | "google_vertex" | "groq" | "ollama" | "webui" | "webui-legacy" | "lmstudio" | "lmstudio-legacy" | "lmstudio-chatcompletions" | "llamacpp" | "koboldcpp" | "vllm" | "hugging-face" | "mistral" | "together" | "bedrock" | "deepseek" | "xai";
    contextWindow: number;
    modelEndpoint?: string | null | undefined;
    modelWrapper?: string | null | undefined;
    handle?: string | null | undefined;
    temperature?: number | undefined;
    maxTokens?: number | null | undefined;
    enableReasoner?: boolean | undefined;
    reasoningEffort?: "low" | "medium" | "high" | null | undefined;
    maxReasoningTokens?: number | undefined;
    putInnerThoughtsInKwargs?: boolean | null | undefined;
    apiKey?: string | null | undefined;
    authProvider?: string | null | undefined;
    isLocalModel?: boolean | undefined;
    apiVersion?: string | null | undefined;
    azureEndpoint?: string | null | undefined;
    azureDeployment?: string | null | undefined;
}>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
/**
 * Check if a model is a reasoning model
 */
export declare function isReasoningModel(model: string): boolean;
/**
 * Create a default LLM config for known models
 */
export declare function createDefaultLLMConfig(modelName: string): LLMConfig;
/**
 * Pretty print LLM config
 */
export declare function prettyPrintLLMConfig(config: LLMConfig): string;
//# sourceMappingURL=llm_config.d.ts.map