/**
 * Embeddings Module
 * Vector embedding generation using Vercel AI SDK
 */

import { embed, embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAzure } from '@ai-sdk/azure';
import { z } from 'zod';
import { logger } from './log';
import {
    MAX_EMBEDDING_DIM,
    DEFAULT_EMBEDDING_CHUNK_SIZE,
} from './constants';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export const EmbeddingProviderSchema = z.enum([
    'openai',
    'google',
    'azure',
    'voyage',
    'cohere',
    'ollama',
    'huggingface',
    'custom',
]);

export type EmbeddingProvider = z.infer<typeof EmbeddingProviderSchema>;

export const EmbeddingModelSchema = z.object({
    provider: EmbeddingProviderSchema,
    model: z.string(),
    dimensions: z.number().optional(),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
});

export type EmbeddingModel = z.infer<typeof EmbeddingModelSchema>;

export interface EmbeddingConfig {
    provider: EmbeddingProvider;
    model: string;
    dimensions?: number;
    apiKey?: string;
    baseUrl?: string;
    // Azure specific
    azureResourceName?: string;
    azureApiVersion?: string;
    // Ollama specific
    ollamaAdditionalKwargs?: Record<string, unknown>;
    // Custom auth
    authProvider?: string;
    customHeaders?: Record<string, string>;
    // Timeout
    timeout?: number;
    // User ID for tracking
    userId?: string;
}

export interface EmbeddingResult {
    embedding: number[];
    usage?: {
        tokens: number;
    };
}

export interface BatchEmbeddingResult {
    embeddings: number[][];
    usage?: {
        tokens: number;
    };
}

// ============================================================================
// DEFAULT MODELS
// ============================================================================

export const EmbeddingModels = {
    // OpenAI
    OPENAI_SMALL: {
        provider: 'openai' as const,
        model: 'text-embedding-3-small',
        dimensions: 1536,
    },
    OPENAI_LARGE: {
        provider: 'openai' as const,
        model: 'text-embedding-3-large',
        dimensions: 3072,
    },
    OPENAI_ADA: {
        provider: 'openai' as const,
        model: 'text-embedding-ada-002',
        dimensions: 1536,
    },
    // Google
    GOOGLE_EMBEDDING: {
        provider: 'google' as const,
        model: 'text-embedding-004',
        dimensions: 768,
    },
    // Voyage AI (via OpenAI-compatible API)
    VOYAGE_LARGE: {
        provider: 'voyage' as const,
        model: 'voyage-large-2',
        dimensions: 1536,
    },
    VOYAGE_CODE: {
        provider: 'voyage' as const,
        model: 'voyage-code-2',
        dimensions: 1536,
    },
    // Cohere (via OpenAI-compatible API)
    COHERE_ENGLISH: {
        provider: 'cohere' as const,
        model: 'embed-english-v3.0',
        dimensions: 1024,
    },
    COHERE_MULTILINGUAL: {
        provider: 'cohere' as const,
        model: 'embed-multilingual-v3.0',
        dimensions: 1024,
    },
    // Ollama (local)
    OLLAMA_MXBAI: {
        provider: 'ollama' as const,
        model: 'mxbai-embed-large',
        dimensions: 1024,
    },
    OLLAMA_NOMIC: {
        provider: 'ollama' as const,
        model: 'nomic-embed-text',
        dimensions: 768,
    },
    // HuggingFace / BGE
    BGE_LARGE: {
        provider: 'huggingface' as const,
        model: 'BAAI/bge-large-en-v1.5',
        dimensions: 1024,
    },
} as const;

// ============================================================================
// EMBEDDING CLIENT
// ============================================================================

export class EmbeddingClient {
    private config: EmbeddingConfig;

    constructor(config: EmbeddingConfig) {
        this.config = config;
    }

    /**
     * Get the embedding model instance for Vercel AI SDK
     */
    private getModel() {
        const { provider, model, apiKey, baseUrl, azureResourceName, azureApiVersion } = this.config;

        switch (provider) {
            case 'openai': {
                const openai = createOpenAI({
                    apiKey: apiKey ?? process.env.OPENAI_API_KEY,
                    baseURL: baseUrl,
                });
                return openai.embedding(model);
            }

            case 'google': {
                const google = createGoogleGenerativeAI({
                    apiKey: apiKey ?? process.env.GOOGLE_API_KEY,
                    baseURL: baseUrl,
                });
                return google.textEmbeddingModel(model);
            }

            case 'azure': {
                const azure = createAzure({
                    apiKey: apiKey ?? process.env.AZURE_OPENAI_API_KEY,
                    resourceName: azureResourceName ?? process.env.AZURE_OPENAI_RESOURCE_NAME,
                    apiVersion: azureApiVersion ?? '2024-02-01',
                });
                return azure.embedding(model);
            }

            case 'voyage': {
                // Voyage AI uses OpenAI-compatible API
                const voyage = createOpenAI({
                    apiKey: apiKey ?? process.env.VOYAGE_API_KEY,
                    baseURL: baseUrl ?? 'https://api.voyageai.com/v1',
                });
                return voyage.embedding(model);
            }

            case 'cohere': {
                // Cohere uses OpenAI-compatible API
                const cohere = createOpenAI({
                    apiKey: apiKey ?? process.env.COHERE_API_KEY,
                    baseURL: baseUrl ?? 'https://api.cohere.ai/v1',
                });
                return cohere.embedding(model);
            }

            case 'ollama':
            case 'huggingface':
            case 'custom':
                // These providers use custom HTTP calls, not Vercel AI SDK
                // Return null to indicate custom handling needed
                return null;

            default:
                throw new Error(`Unsupported embedding provider: ${provider}`);
        }
    }

    /**
     * Call Ollama embedding API directly
     */
    private async callOllamaEmbedding(text: string): Promise<number[]> {
        const { model, baseUrl, ollamaAdditionalKwargs, timeout } = this.config;
        const url = `${baseUrl ?? 'http://localhost:11434'}/api/embeddings`;

        const body = {
            model,
            prompt: text,
            ...ollamaAdditionalKwargs,
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: timeout ? AbortSignal.timeout(timeout) : undefined,
        });

        if (!response.ok) {
            throw new Error(`Ollama embedding failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as { embedding: number[] };
        return data.embedding;
    }

    /**
     * Call custom/HuggingFace OpenAI-compatible embedding API
     */
    private async callCustomEmbedding(text: string): Promise<number[]> {
        const { model, baseUrl, apiKey, customHeaders, userId, timeout } = this.config;

        if (!baseUrl) {
            throw new Error('baseUrl is required for custom embedding endpoint');
        }

        const url = `${baseUrl}/embeddings`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...customHeaders,
        };

        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        // Re-map mirix-free model
        const actualModel = model === 'mirix-free' ? 'BAAI/bge-large-en-v1.5' : model;

        const body = {
            input: text,
            model: actualModel,
            user: userId,
        };

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: timeout ? AbortSignal.timeout(timeout) : undefined,
        });

        if (!response.ok) {
            throw new Error(`Custom embedding failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as number[] | { data?: Array<{ embedding?: number[] }> };

        // Handle different response formats
        if (Array.isArray(data)) {
            // Embedding directly in response
            return data;
        } else if (data.data?.[0]?.embedding) {
            // OpenAI-style response
            return data.data[0].embedding;
        } else {
            throw new Error(`Unexpected embedding response format: ${JSON.stringify(data)}`);
        }
    }

    /**
     * Generate embedding for a single text
     */
    async embed(text: string): Promise<EmbeddingResult> {
        const { provider } = this.config;

        // Handle providers that need custom HTTP calls
        if (provider === 'ollama') {
            const embedding = await this.callOllamaEmbedding(text);
            return { embedding };
        }

        if (provider === 'huggingface' || provider === 'custom') {
            const embedding = await this.callCustomEmbedding(text);
            return { embedding };
        }

        // Use Vercel AI SDK for supported providers
        const model = this.getModel();
        if (!model) {
            throw new Error(`Provider ${provider} is not supported`);
        }

        const result = await embed({
            model,
            value: text,
        });

        return {
            embedding: result.embedding,
            usage: result.usage ? { tokens: result.usage.tokens } : undefined,
        };
    }

    /**
     * Generate embeddings for multiple texts
     */
    async embedMany(texts: string[]): Promise<BatchEmbeddingResult> {
        const { provider } = this.config;

        // Handle providers that need custom HTTP calls (sequential for simplicity)
        if (provider === 'ollama') {
            const embeddings: number[][] = [];
            for (const text of texts) {
                const embedding = await this.callOllamaEmbedding(text);
                embeddings.push(embedding);
            }
            return { embeddings };
        }

        if (provider === 'huggingface' || provider === 'custom') {
            const embeddings: number[][] = [];
            for (const text of texts) {
                const embedding = await this.callCustomEmbedding(text);
                embeddings.push(embedding);
            }
            return { embeddings };
        }

        // Use Vercel AI SDK for supported providers
        const model = this.getModel();
        if (!model) {
            throw new Error(`Provider ${provider} is not supported`);
        }

        const result = await embedMany({
            model,
            values: texts,
        });

        return {
            embeddings: result.embeddings,
            usage: result.usage ? { tokens: result.usage.tokens } : undefined,
        };
    }

    /**
     * Get the expected dimensions for the current model
     */
    getDimensions(): number | undefined {
        return this.config.dimensions;
    }

    /**
     * Get current configuration
     */
    getConfig(): EmbeddingConfig {
        return { ...this.config };
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create an embedding client with the specified configuration
 */
export function createEmbeddingClient(config: EmbeddingConfig): EmbeddingClient {
    return new EmbeddingClient(config);
}

/**
 * Create an embedding client from a preset model
 */
export function createEmbeddingClientFromPreset(
    preset: keyof typeof EmbeddingModels,
    overrides?: Partial<EmbeddingConfig>
): EmbeddingClient {
    const presetConfig = EmbeddingModels[preset];
    return new EmbeddingClient({
        ...presetConfig,
        ...overrides,
    });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
}

/**
 * Calculate euclidean distance between two embeddings
 */
export function euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Embeddings must have the same dimensions');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        const diff = a[i] - b[i];
        sum += diff * diff;
    }

    return Math.sqrt(sum);
}

/**
 * Find the most similar embeddings from a list
 */
export function findMostSimilar(
    query: number[],
    candidates: number[][],
    topK: number = 5,
    metric: 'cosine' | 'euclidean' = 'cosine'
): Array<{ index: number; score: number }> {
    const scores = candidates.map((candidate, index) => {
        const score = metric === 'cosine'
            ? cosineSimilarity(query, candidate)
            : -euclideanDistance(query, candidate); // Negative so higher is better
        return { index, score };
    });

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, topK);
}

/**
 * Normalize an embedding to unit length
 */
export function normalizeEmbedding(embedding: number[]): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) return embedding;
    return embedding.map(val => val / norm);
}

// ============================================================================
// DEFAULT INSTANCE
// ============================================================================

let defaultClient: EmbeddingClient | null = null;

/**
 * Get or create the default embedding client
 */
export function getDefaultEmbeddingClient(): EmbeddingClient {
    if (!defaultClient) {
        // Default to OpenAI small model
        defaultClient = createEmbeddingClientFromPreset('OPENAI_SMALL');
    }
    return defaultClient;
}

/**
 * Set the default embedding client
 */
export function setDefaultEmbeddingClient(client: EmbeddingClient): void {
    defaultClient = client;
}

/**
 * Quick embed function using default client
 */
export async function quickEmbed(text: string): Promise<number[]> {
    const client = getDefaultEmbeddingClient();
    const result = await client.embed(text);
    return result.embedding;
}

/**
 * Quick batch embed function using default client
 */
export async function quickEmbedMany(texts: string[]): Promise<number[][]> {
    const client = getDefaultEmbeddingClient();
    const result = await client.embedMany(texts);
    return result.embeddings;
}

// ============================================================================
// TEXT PROCESSING UTILITIES
// ============================================================================

/**
 * Simple sentence splitter for text chunking
 * Note: For production use, consider using a more robust library like langchain
 */
export function splitTextIntoChunks(text: string, chunkSize: number = DEFAULT_EMBEDDING_CHUNK_SIZE): string[] {
    // Split by sentence boundaries
    const sentenceEndings = /([.!?。！？]+[\s\n]*)/g;
    const parts = text.split(sentenceEndings);

    const chunks: string[] = [];
    let currentChunk = '';

    for (let i = 0; i < parts.length; i += 2) {
        const sentence = parts[i] + (parts[i + 1] || '');

        if (currentChunk.length + sentence.length <= chunkSize) {
            currentChunk += sentence;
        } else {
            if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
}

/**
 * Truncate text to approximately maxTokens (using character estimation)
 * Note: This is a rough estimation. For precise token counting, use tiktoken
 * @param _encoding - Reserved for future tiktoken integration
 */
export function truncateText(text: string, maxTokens: number, _encoding?: string): string {
    // Rough estimation: 1 token ≈ 4 characters for English
    const estimatedMaxChars = maxTokens * 4;

    if (text.length <= estimatedMaxChars) {
        return text;
    }

    logger.debug(`Truncating text from ${text.length} chars to ~${estimatedMaxChars} chars`);
    return text.slice(0, estimatedMaxChars);
}

/**
 * Check and split text if it exceeds token limit
 * @param _embeddingModel - Reserved for future tokenizer selection
 */
export function checkAndSplitText(text: string, _embeddingModel: string, maxLength: number = 8191): string[] {
    // Rough estimation: 1 token ≈ 4 characters for English
    const estimatedTokens = Math.ceil(text.length / 4);

    if (estimatedTokens > maxLength) {
        logger.debug(`Text is too long (~${estimatedTokens} tokens), truncating to ${maxLength} tokens`);
        return [truncateText(text, maxLength)];
    }

    return [text];
}

/**
 * Generate padded embedding for querying database
 * Pads the embedding to MAX_EMBEDDING_DIM dimensions
 */
export async function queryEmbedding(
    client: EmbeddingClient,
    queryText: string
): Promise<number[]> {
    const result = await client.embed(queryText);
    const embedding = result.embedding;

    // Pad to MAX_EMBEDDING_DIM if needed
    if (embedding.length < MAX_EMBEDDING_DIM) {
        const padded = new Array(MAX_EMBEDDING_DIM).fill(0);
        for (let i = 0; i < embedding.length; i++) {
            padded[i] = embedding[i];
        }
        return padded;
    }

    return embedding;
}

/**
 * Quick query embedding using default client
 */
export async function quickQueryEmbedding(queryText: string): Promise<number[]> {
    const client = getDefaultEmbeddingClient();
    return queryEmbedding(client, queryText);
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

// isValidUrl functionality should be imported directly from utils
// export { isValidUrl } from './utils';
