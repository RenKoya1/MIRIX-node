/**
 * LLM Client using Vercel AI SDK v6
 *
 * Provides a unified interface for multiple LLM providers:
 * - OpenAI
 * - Anthropic
 * - Google AI
 */
import { generateText, generateObject, streamText, tool, type LanguageModel } from 'ai';
import { z } from 'zod';
import { LLMConfig } from '../schemas/llm_config.js';
/**
 * Usage information from LLM response
 */
export interface UsageInfo {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}
/**
 * Create a language model instance from LLM config
 */
export declare function createModel(config: LLMConfig): LanguageModel;
/**
 * LLM Client class for managing language model interactions
 */
export declare class LLMClient {
    private model;
    private config;
    constructor(config: LLMConfig);
    /**
     * Generate text completion using a simple prompt
     */
    generate(prompt: string, options?: {
        system?: string;
        temperature?: number;
        maxOutputTokens?: number;
    }): Promise<{
        text: string;
        usage?: UsageInfo;
    }>;
    /**
     * Generate structured object output
     */
    generateStructured<T extends z.ZodType>(prompt: string, schema: T, options?: {
        system?: string;
        temperature?: number;
        maxOutputTokens?: number;
    }): Promise<{
        object: z.infer<T>;
        usage?: UsageInfo;
    }>;
    /**
     * Stream text completion
     */
    stream(prompt: string, options?: {
        system?: string;
        temperature?: number;
        maxOutputTokens?: number;
    }): Promise<{
        textStream: AsyncIterable<string>;
        getFullText: () => Promise<string>;
    }>;
    /**
     * Get the underlying language model
     */
    getModel(): LanguageModel;
    /**
     * Get the current model configuration
     */
    getConfig(): LLMConfig;
    /**
     * Update the model configuration
     */
    updateConfig(config: Partial<LLMConfig>): void;
}
/**
 * Create an LLM client from configuration
 */
export declare function createLLMClient(config: LLMConfig): LLMClient;
/**
 * Quick helper to create models for common providers
 */
export declare const llm: {
    openai: (model?: string, apiKey?: string) => import("@ai-sdk/provider").LanguageModelV3;
    anthropic: (model?: string, apiKey?: string) => import("@ai-sdk/provider").LanguageModelV3;
    google: (model?: string, apiKey?: string) => import("@ai-sdk/provider").LanguageModelV3;
};
export { generateText, generateObject, streamText, tool };
export type { LanguageModel };
//# sourceMappingURL=client.d.ts.map