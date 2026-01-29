/**
 * LLM Client using Vercel AI SDK v6
 * 
 * Provides a unified interface for multiple LLM providers:
 * - OpenAI
 * - Anthropic
 * - Google AI
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
    generateText,
    generateObject,
    streamText,
    tool,
    type LanguageModel,
} from 'ai';
import { z } from 'zod';
import { getLogger } from '../log';
import { LLMConfig, LLMEndpointType } from '../schemas/llm_config';
import { LLMAPIError } from '../errors';

const logger = getLogger('llm-client');

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
export function createModel(config: LLMConfig): LanguageModel {
    const apiKey = config.apiKey ?? getEnvApiKey(config.modelEndpointType);

    switch (config.modelEndpointType) {
        case LLMEndpointType.OPENAI: {
            const openai = createOpenAI({
                apiKey,
                baseURL: config.modelEndpoint ?? undefined,
            });
            return openai(config.model);
        }

        case LLMEndpointType.ANTHROPIC: {
            const anthropic = createAnthropic({
                apiKey,
                baseURL: config.modelEndpoint ?? undefined,
            });
            return anthropic(config.model);
        }

        case LLMEndpointType.GOOGLE_AI: {
            const google = createGoogleGenerativeAI({
                apiKey,
                baseURL: config.modelEndpoint ?? undefined,
            });
            return google(config.model);
        }

        case LLMEndpointType.AZURE_OPENAI: {
            const azure = createOpenAI({
                apiKey,
                baseURL: config.azureEndpoint ?? undefined,
                headers: {
                    'api-key': apiKey ?? '',
                },
            });
            return azure(config.azureDeployment ?? config.model);
        }

        // For other providers, fall back to OpenAI-compatible endpoint
        default: {
            if (config.modelEndpoint) {
                const custom = createOpenAI({
                    apiKey: apiKey ?? 'dummy-key',
                    baseURL: config.modelEndpoint,
                });
                return custom(config.model);
            }
            throw new LLMAPIError(
                `Unsupported model endpoint type: ${config.modelEndpointType}`,
                config.modelEndpointType
            );
        }
    }
}

/**
 * Get API key from environment variables
 */
function getEnvApiKey(endpointType: string): string | undefined {
    switch (endpointType) {
        case 'openai':
            return process.env.OPENAI_API_KEY;
        case 'anthropic':
            return process.env.ANTHROPIC_API_KEY;
        case 'google_ai':
            return process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        case 'azure_openai':
            return process.env.AZURE_OPENAI_API_KEY;
        default:
            return undefined;
    }
}

/**
 * LLM Client class for managing language model interactions
 */
export class LLMClient {
    private model: LanguageModel;
    private config: LLMConfig;

    constructor(config: LLMConfig) {
        this.config = config;
        this.model = createModel(config);
        logger.debug({ model: config.model, type: config.modelEndpointType }, 'LLM client initialized');
    }

    /**
     * Generate text completion using a simple prompt
     */
    async generate(prompt: string, options?: {
        system?: string;
        temperature?: number;
        maxOutputTokens?: number;
    }): Promise<{
        text: string;
        usage?: UsageInfo;
    }> {
        try {
            const result = await generateText({
                model: this.model,
                prompt,
                system: options?.system,
                temperature: options?.temperature ?? this.config.temperature,
                maxOutputTokens: options?.maxOutputTokens ?? this.config.maxTokens ?? undefined,
            });

            // Extract usage info
            const usage: UsageInfo | undefined = result.usage ? {
                promptTokens: (result.usage as { promptTokens?: number }).promptTokens ?? 0,
                completionTokens: (result.usage as { completionTokens?: number }).completionTokens ?? 0,
                totalTokens: ((result.usage as { promptTokens?: number }).promptTokens ?? 0) +
                    ((result.usage as { completionTokens?: number }).completionTokens ?? 0),
            } : undefined;

            return {
                text: result.text,
                usage,
            };
        } catch (error) {
            logger.error({ error, model: this.config.model }, 'LLM generation failed');
            throw new LLMAPIError(
                `Failed to generate text: ${error instanceof Error ? error.message : String(error)}`,
                this.config.modelEndpointType,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Generate structured object output
     */
    async generateStructured<T extends z.ZodType>(
        prompt: string,
        schema: T,
        options?: {
            system?: string;
            temperature?: number;
            maxOutputTokens?: number;
        }
    ): Promise<{
        object: z.infer<T>;
        usage?: UsageInfo;
    }> {
        try {
            const result = await generateObject({
                model: this.model,
                prompt,
                schema,
                system: options?.system,
                temperature: options?.temperature ?? this.config.temperature,
                maxOutputTokens: options?.maxOutputTokens ?? this.config.maxTokens ?? undefined,
            });

            // Extract usage info
            const usage: UsageInfo | undefined = result.usage ? {
                promptTokens: (result.usage as { promptTokens?: number }).promptTokens ?? 0,
                completionTokens: (result.usage as { completionTokens?: number }).completionTokens ?? 0,
                totalTokens: ((result.usage as { promptTokens?: number }).promptTokens ?? 0) +
                    ((result.usage as { completionTokens?: number }).completionTokens ?? 0),
            } : undefined;

            return {
                object: result.object,
                usage,
            };
        } catch (error) {
            logger.error({ error, model: this.config.model }, 'LLM object generation failed');
            throw new LLMAPIError(
                `Failed to generate object: ${error instanceof Error ? error.message : String(error)}`,
                this.config.modelEndpointType,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Stream text completion
     */
    async stream(prompt: string, options?: {
        system?: string;
        temperature?: number;
        maxOutputTokens?: number;
    }): Promise<{
        textStream: AsyncIterable<string>;
        getFullText: () => Promise<string>;
    }> {
        try {
            const result = streamText({
                model: this.model,
                prompt,
                system: options?.system,
                temperature: options?.temperature ?? this.config.temperature,
                maxOutputTokens: options?.maxOutputTokens ?? this.config.maxTokens ?? undefined,
            });

            return {
                textStream: result.textStream,
                getFullText: async () => {
                    const text = await result.text;
                    return text;
                },
            };
        } catch (error) {
            logger.error({ error, model: this.config.model }, 'LLM streaming failed');
            throw new LLMAPIError(
                `Failed to stream text: ${error instanceof Error ? error.message : String(error)}`,
                this.config.modelEndpointType,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Get the underlying language model
     */
    getModel(): LanguageModel {
        return this.model;
    }

    /**
     * Get the current model configuration
     */
    getConfig(): LLMConfig {
        return this.config;
    }

    /**
     * Update the model configuration
     */
    updateConfig(config: Partial<LLMConfig>): void {
        this.config = { ...this.config, ...config };
        this.model = createModel(this.config);
    }
}

/**
 * Create an LLM client from configuration
 */
export function createLLMClient(config: LLMConfig): LLMClient {
    return new LLMClient(config);
}

/**
 * Quick helper to create models for common providers
 */
export const llm = {
    openai: (model = 'gpt-4o-mini', apiKey?: string) => {
        const openai = createOpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });
        return openai(model);
    },

    anthropic: (model = 'claude-3-5-sonnet-20241022', apiKey?: string) => {
        const anthropic = createAnthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });
        return anthropic(model);
    },

    google: (model = 'gemini-2.0-flash', apiKey?: string) => {
        const google = createGoogleGenerativeAI({ apiKey: apiKey ?? process.env.GOOGLE_API_KEY });
        return google(model);
    },
};

// Re-export AI SDK utilities for direct use
export { generateText, generateObject, streamText, tool };
export type { LanguageModel };
