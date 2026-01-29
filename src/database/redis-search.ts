/**
 * Redis Search Module
 * Provides RediSearch index definitions and search operations
 * Supports BM25 text search and KNN vector search for memory tables
 */

import { logger } from '../log';
import { RedisMemoryClient, getRedisClient } from './redis-client';

// ============================================================================
// INDEX SCHEMA DEFINITIONS
// ============================================================================

/**
 * RediSearch field types
 */
export type FieldType = 'TEXT' | 'TAG' | 'NUMERIC' | 'VECTOR';

export interface TextFieldOptions {
    sortable?: boolean;
    noIndex?: boolean;
    noStem?: boolean;
    phonetic?: string;
    weight?: number;
}

export interface TagFieldOptions {
    sortable?: boolean;
    noIndex?: boolean;
    separator?: string;
    caseSensitive?: boolean;
}

export interface NumericFieldOptions {
    sortable?: boolean;
    noIndex?: boolean;
}

export interface VectorFieldOptions {
    algorithm: 'FLAT' | 'HNSW';
    type: 'FLOAT32' | 'FLOAT64';
    dim: number;
    distanceMetric: 'COSINE' | 'L2' | 'IP';
    initialCap?: number;
    m?: number; // HNSW only
    efConstruction?: number; // HNSW only
    efRuntime?: number; // HNSW only
}

export interface IndexField {
    name: string;
    path?: string; // JSON path for JSON indexes
    type: FieldType;
    options?: TextFieldOptions | TagFieldOptions | NumericFieldOptions | VectorFieldOptions;
}

export interface IndexDefinition {
    name: string;
    prefix: string;
    indexType: 'HASH' | 'JSON';
    fields: IndexField[];
}

// ============================================================================
// INDEX DEFINITIONS
// ============================================================================

const EMBEDDING_DIM = 3072; // OpenAI text-embedding-3-large dimension

/**
 * Hash-based index for blocks (Core Memory)
 */
export const BLOCK_INDEX: IndexDefinition = {
    name: RedisMemoryClient.BLOCK_INDEX,
    prefix: RedisMemoryClient.BLOCK_PREFIX,
    indexType: 'HASH',
    fields: [
        { name: 'organization_id', type: 'TEXT' },
        { name: 'user_id', type: 'TEXT' },
        { name: 'agent_id', type: 'TEXT' },
        { name: 'label', type: 'TAG' },
        { name: 'value', type: 'TEXT' },
        { name: 'limit', type: 'NUMERIC' },
        { name: 'created_at_ts', type: 'NUMERIC', options: { sortable: true } },
    ],
};

/**
 * Hash-based index for messages
 */
export const MESSAGE_INDEX: IndexDefinition = {
    name: RedisMemoryClient.MESSAGE_INDEX,
    prefix: RedisMemoryClient.MESSAGE_PREFIX,
    indexType: 'HASH',
    fields: [
        { name: 'organization_id', type: 'TEXT' },
        { name: 'agent_id', type: 'TEXT' },
        { name: 'user_id', type: 'TEXT' },
        { name: 'role', type: 'TAG' },
        { name: 'text', type: 'TEXT' },
        { name: 'model', type: 'TEXT' },
        { name: 'created_at_ts', type: 'NUMERIC', options: { sortable: true } },
    ],
};

/**
 * Hash-based index for organizations
 */
export const ORGANIZATION_INDEX: IndexDefinition = {
    name: RedisMemoryClient.ORGANIZATION_INDEX,
    prefix: RedisMemoryClient.ORGANIZATION_PREFIX,
    indexType: 'HASH',
    fields: [
        { name: 'name', type: 'TEXT' },
        { name: 'created_at_ts', type: 'NUMERIC', options: { sortable: true } },
    ],
};

/**
 * Hash-based index for users
 */
export const USER_INDEX: IndexDefinition = {
    name: RedisMemoryClient.USER_INDEX,
    prefix: RedisMemoryClient.USER_PREFIX,
    indexType: 'HASH',
    fields: [
        { name: 'organization_id', type: 'TEXT' },
        { name: 'client_id', type: 'TEXT' },
        { name: 'name', type: 'TEXT' },
        { name: 'status', type: 'TAG' },
        { name: 'created_at_ts', type: 'NUMERIC', options: { sortable: true } },
    ],
};

/**
 * Hash-based index for agents
 */
export const AGENT_INDEX: IndexDefinition = {
    name: RedisMemoryClient.AGENT_INDEX,
    prefix: RedisMemoryClient.AGENT_PREFIX,
    indexType: 'HASH',
    fields: [
        { name: 'organization_id', type: 'TEXT' },
        { name: 'name', type: 'TEXT' },
        { name: 'agent_type', type: 'TAG' },
        { name: 'parent_id', type: 'TEXT' },
        { name: 'created_at_ts', type: 'NUMERIC', options: { sortable: true } },
    ],
};

/**
 * Hash-based index for tools
 */
export const TOOL_INDEX: IndexDefinition = {
    name: RedisMemoryClient.TOOL_INDEX,
    prefix: RedisMemoryClient.TOOL_PREFIX,
    indexType: 'HASH',
    fields: [
        { name: 'organization_id', type: 'TEXT' },
        { name: 'name', type: 'TEXT' },
        { name: 'tool_type', type: 'TAG' },
        { name: 'description', type: 'TEXT' },
        { name: 'created_at_ts', type: 'NUMERIC', options: { sortable: true } },
    ],
};

/**
 * JSON-based index for episodic memory with vector fields
 */
export const EPISODIC_INDEX: IndexDefinition = {
    name: RedisMemoryClient.EPISODIC_INDEX,
    prefix: RedisMemoryClient.EPISODIC_PREFIX,
    indexType: 'JSON',
    fields: [
        { name: 'organization_id', path: '$.organization_id', type: 'TEXT' },
        { name: 'user_id', path: '$.user_id', type: 'TEXT' },
        { name: 'agent_id', path: '$.agent_id', type: 'TEXT' },
        { name: 'client_id', path: '$.client_id', type: 'TEXT' },
        { name: 'actor', path: '$.actor', type: 'TAG' },
        { name: 'event_type', path: '$.event_type', type: 'TAG' },
        { name: 'summary', path: '$.summary', type: 'TEXT' },
        { name: 'details', path: '$.details', type: 'TEXT' },
        { name: 'occurred_at_ts', path: '$.occurred_at_ts', type: 'NUMERIC', options: { sortable: true } },
        { name: 'created_at_ts', path: '$.created_at_ts', type: 'NUMERIC', options: { sortable: true } },
        {
            name: 'summary_embedding',
            path: '$.summary_embedding',
            type: 'VECTOR',
            options: {
                algorithm: 'HNSW',
                type: 'FLOAT32',
                dim: EMBEDDING_DIM,
                distanceMetric: 'COSINE',
                m: 16,
                efConstruction: 200,
                efRuntime: 10,
            } as VectorFieldOptions,
        },
        {
            name: 'details_embedding',
            path: '$.details_embedding',
            type: 'VECTOR',
            options: {
                algorithm: 'HNSW',
                type: 'FLOAT32',
                dim: EMBEDDING_DIM,
                distanceMetric: 'COSINE',
                m: 16,
                efConstruction: 200,
                efRuntime: 10,
            } as VectorFieldOptions,
        },
    ],
};

/**
 * JSON-based index for semantic memory with vector fields
 */
export const SEMANTIC_INDEX: IndexDefinition = {
    name: RedisMemoryClient.SEMANTIC_INDEX,
    prefix: RedisMemoryClient.SEMANTIC_PREFIX,
    indexType: 'JSON',
    fields: [
        { name: 'organization_id', path: '$.organization_id', type: 'TEXT' },
        { name: 'user_id', path: '$.user_id', type: 'TEXT' },
        { name: 'agent_id', path: '$.agent_id', type: 'TEXT' },
        { name: 'client_id', path: '$.client_id', type: 'TEXT' },
        { name: 'name', path: '$.name', type: 'TEXT' },
        { name: 'summary', path: '$.summary', type: 'TEXT' },
        { name: 'details', path: '$.details', type: 'TEXT' },
        { name: 'source', path: '$.source', type: 'TAG' },
        { name: 'created_at_ts', path: '$.created_at_ts', type: 'NUMERIC', options: { sortable: true } },
        {
            name: 'name_embedding',
            path: '$.name_embedding',
            type: 'VECTOR',
            options: {
                algorithm: 'HNSW',
                type: 'FLOAT32',
                dim: EMBEDDING_DIM,
                distanceMetric: 'COSINE',
                m: 16,
                efConstruction: 200,
            } as VectorFieldOptions,
        },
        {
            name: 'summary_embedding',
            path: '$.summary_embedding',
            type: 'VECTOR',
            options: {
                algorithm: 'HNSW',
                type: 'FLOAT32',
                dim: EMBEDDING_DIM,
                distanceMetric: 'COSINE',
                m: 16,
                efConstruction: 200,
            } as VectorFieldOptions,
        },
        {
            name: 'details_embedding',
            path: '$.details_embedding',
            type: 'VECTOR',
            options: {
                algorithm: 'HNSW',
                type: 'FLOAT32',
                dim: EMBEDDING_DIM,
                distanceMetric: 'COSINE',
                m: 16,
                efConstruction: 200,
            } as VectorFieldOptions,
        },
    ],
};

/**
 * JSON-based index for procedural memory with vector fields
 */
export const PROCEDURAL_INDEX: IndexDefinition = {
    name: RedisMemoryClient.PROCEDURAL_INDEX,
    prefix: RedisMemoryClient.PROCEDURAL_PREFIX,
    indexType: 'JSON',
    fields: [
        { name: 'organization_id', path: '$.organization_id', type: 'TEXT' },
        { name: 'user_id', path: '$.user_id', type: 'TEXT' },
        { name: 'agent_id', path: '$.agent_id', type: 'TEXT' },
        { name: 'client_id', path: '$.client_id', type: 'TEXT' },
        { name: 'entry_type', path: '$.entry_type', type: 'TAG' },
        { name: 'summary', path: '$.summary', type: 'TEXT' },
        { name: 'created_at_ts', path: '$.created_at_ts', type: 'NUMERIC', options: { sortable: true } },
        {
            name: 'summary_embedding',
            path: '$.summary_embedding',
            type: 'VECTOR',
            options: {
                algorithm: 'HNSW',
                type: 'FLOAT32',
                dim: EMBEDDING_DIM,
                distanceMetric: 'COSINE',
                m: 16,
                efConstruction: 200,
            } as VectorFieldOptions,
        },
        {
            name: 'steps_embedding',
            path: '$.steps_embedding',
            type: 'VECTOR',
            options: {
                algorithm: 'HNSW',
                type: 'FLOAT32',
                dim: EMBEDDING_DIM,
                distanceMetric: 'COSINE',
                m: 16,
                efConstruction: 200,
            } as VectorFieldOptions,
        },
    ],
};

/**
 * JSON-based index for resource memory with vector fields
 */
export const RESOURCE_INDEX: IndexDefinition = {
    name: RedisMemoryClient.RESOURCE_INDEX,
    prefix: RedisMemoryClient.RESOURCE_PREFIX,
    indexType: 'JSON',
    fields: [
        { name: 'organization_id', path: '$.organization_id', type: 'TEXT' },
        { name: 'user_id', path: '$.user_id', type: 'TEXT' },
        { name: 'agent_id', path: '$.agent_id', type: 'TEXT' },
        { name: 'client_id', path: '$.client_id', type: 'TEXT' },
        { name: 'title', path: '$.title', type: 'TEXT' },
        { name: 'summary', path: '$.summary', type: 'TEXT' },
        { name: 'resource_type', path: '$.resource_type', type: 'TAG' },
        { name: 'created_at_ts', path: '$.created_at_ts', type: 'NUMERIC', options: { sortable: true } },
        {
            name: 'summary_embedding',
            path: '$.summary_embedding',
            type: 'VECTOR',
            options: {
                algorithm: 'HNSW',
                type: 'FLOAT32',
                dim: EMBEDDING_DIM,
                distanceMetric: 'COSINE',
                m: 16,
                efConstruction: 200,
            } as VectorFieldOptions,
        },
    ],
};

/**
 * JSON-based index for knowledge with vector fields
 */
export const KNOWLEDGE_INDEX: IndexDefinition = {
    name: RedisMemoryClient.KNOWLEDGE_INDEX,
    prefix: RedisMemoryClient.KNOWLEDGE_PREFIX,
    indexType: 'JSON',
    fields: [
        { name: 'organization_id', path: '$.organization_id', type: 'TEXT' },
        { name: 'user_id', path: '$.user_id', type: 'TEXT' },
        { name: 'agent_id', path: '$.agent_id', type: 'TEXT' },
        { name: 'client_id', path: '$.client_id', type: 'TEXT' },
        { name: 'entry_type', path: '$.entry_type', type: 'TAG' },
        { name: 'sensitivity', path: '$.sensitivity', type: 'TAG' },
        { name: 'caption', path: '$.caption', type: 'TEXT' },
        { name: 'created_at_ts', path: '$.created_at_ts', type: 'NUMERIC', options: { sortable: true } },
        {
            name: 'caption_embedding',
            path: '$.caption_embedding',
            type: 'VECTOR',
            options: {
                algorithm: 'HNSW',
                type: 'FLOAT32',
                dim: EMBEDDING_DIM,
                distanceMetric: 'COSINE',
                m: 16,
                efConstruction: 200,
            } as VectorFieldOptions,
        },
    ],
};

/**
 * All index definitions
 */
export const ALL_INDEXES: IndexDefinition[] = [
    BLOCK_INDEX,
    MESSAGE_INDEX,
    ORGANIZATION_INDEX,
    USER_INDEX,
    AGENT_INDEX,
    TOOL_INDEX,
    EPISODIC_INDEX,
    SEMANTIC_INDEX,
    PROCEDURAL_INDEX,
    RESOURCE_INDEX,
    KNOWLEDGE_INDEX,
];

// ============================================================================
// INDEX MANAGEMENT
// ============================================================================

/**
 * Build the FT.CREATE command arguments for an index
 */
function buildIndexCreateArgs(index: IndexDefinition): string[] {
    const args: string[] = [index.name, 'ON', index.indexType, 'PREFIX', '1', index.prefix, 'SCHEMA'];

    for (const field of index.fields) {
        if (index.indexType === 'JSON' && field.path) {
            args.push(field.path, 'AS', field.name);
        } else {
            args.push(field.name);
        }

        args.push(field.type);

        if (field.type === 'VECTOR' && field.options) {
            const vecOpts = field.options as VectorFieldOptions;
            args.push(
                vecOpts.algorithm,
                '6', // Number of following arguments
                'TYPE',
                vecOpts.type,
                'DIM',
                String(vecOpts.dim),
                'DISTANCE_METRIC',
                vecOpts.distanceMetric
            );
            if (vecOpts.algorithm === 'HNSW') {
                if (vecOpts.m) args.push('M', String(vecOpts.m));
                if (vecOpts.efConstruction) args.push('EF_CONSTRUCTION', String(vecOpts.efConstruction));
            }
        } else if (field.options) {
            const opts = field.options as TextFieldOptions | TagFieldOptions | NumericFieldOptions;
            if ('sortable' in opts && opts.sortable) args.push('SORTABLE');
            if ('noIndex' in opts && opts.noIndex) args.push('NOINDEX');
            if ('weight' in opts && (opts as TextFieldOptions).weight) {
                args.push('WEIGHT', String((opts as TextFieldOptions).weight));
            }
            if ('separator' in opts && (opts as TagFieldOptions).separator) {
                args.push('SEPARATOR', (opts as TagFieldOptions).separator!);
            }
        }
    }

    return args;
}

/**
 * Create a single RediSearch index
 */
export async function createIndex(index: IndexDefinition): Promise<boolean> {
    const client = getRedisClient();
    if (!client) {
        logger.warn('Redis client not available, skipping index creation');
        return false;
    }

    try {
        // Check if index already exists
        try {
            await client.client.call('FT.INFO', index.name);
            logger.debug({ index: index.name }, 'Index already exists');
            return true;
        } catch {
            // Index doesn't exist, create it
        }

        const args = buildIndexCreateArgs(index);
        await client.client.call('FT.CREATE', ...args);
        logger.info({ index: index.name }, 'Created RediSearch index');
        return true;
    } catch (error) {
        logger.error({ error, index: index.name }, 'Failed to create RediSearch index');
        return false;
    }
}

/**
 * Drop a RediSearch index
 */
export async function dropIndex(indexName: string, deleteDocuments = false): Promise<boolean> {
    const client = getRedisClient();
    if (!client) {
        return false;
    }

    try {
        const args = deleteDocuments ? [indexName, 'DD'] : [indexName];
        await client.client.call('FT.DROPINDEX', ...args);
        logger.info({ index: indexName, deleteDocuments }, 'Dropped RediSearch index');
        return true;
    } catch (error) {
        logger.error({ error, index: indexName }, 'Failed to drop RediSearch index');
        return false;
    }
}

/**
 * Create all RediSearch indexes
 */
export async function createAllIndexes(): Promise<void> {
    logger.info('Creating all RediSearch indexes...');

    for (const index of ALL_INDEXES) {
        await createIndex(index);
    }

    logger.info('All RediSearch indexes created');
}

/**
 * Drop all RediSearch indexes
 */
export async function dropAllIndexes(deleteDocuments = false): Promise<void> {
    logger.info('Dropping all RediSearch indexes...');

    for (const index of ALL_INDEXES) {
        await dropIndex(index.name, deleteDocuments);
    }

    logger.info('All RediSearch indexes dropped');
}

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

export interface SearchOptions {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    returnFields?: string[];
    filters?: Record<string, string | number>;
}

export interface VectorSearchOptions extends SearchOptions {
    k?: number;
    efRuntime?: number;
}

export interface SearchResult<T = Record<string, unknown>> {
    total: number;
    items: Array<{
        id: string;
        score?: number;
        data: T;
    }>;
}

/**
 * Parse FT.SEARCH results into a structured format
 */
function parseSearchResults<T>(
    results: unknown[],
    indexType: 'HASH' | 'JSON'
): SearchResult<T> {
    const total = results[0] as number;
    const items: SearchResult<T>['items'] = [];

    for (let i = 1; i < results.length; i += 2) {
        const id = (results[i] as string).split(':').pop()!;
        const fields = results[i + 1] as string[];

        let data: Record<string, unknown> = {};

        if (indexType === 'JSON') {
            // JSON results come as ['$', 'json_string']
            const jsonStr = fields[1];
            data = JSON.parse(jsonStr);
        } else {
            // Hash results come as alternating key-value pairs
            for (let j = 0; j < fields.length; j += 2) {
                data[fields[j]] = fields[j + 1];
            }
        }

        items.push({ id, data: data as T });
    }

    return { total, items };
}

/**
 * Perform a text search on an index
 */
export async function textSearch<T = Record<string, unknown>>(
    indexName: string,
    query: string,
    options: SearchOptions = {}
): Promise<SearchResult<T>> {
    const client = getRedisClient();
    if (!client) {
        return { total: 0, items: [] };
    }

    const index = ALL_INDEXES.find((idx) => idx.name === indexName);
    if (!index) {
        throw new Error(`Unknown index: ${indexName}`);
    }

    const args: (string | number)[] = [indexName, query];

    // Add filters
    if (options.filters) {
        for (const [field, value] of Object.entries(options.filters)) {
            args.push('FILTER', field, String(value), String(value));
        }
    }

    // Add sorting
    if (options.sortBy) {
        args.push('SORTBY', options.sortBy, options.sortOrder ?? 'DESC');
    }

    // Add pagination
    args.push('LIMIT', options.offset ?? 0, options.limit ?? 10);

    // Add return fields
    if (options.returnFields && options.returnFields.length > 0) {
        args.push('RETURN', options.returnFields.length, ...options.returnFields);
    }

    try {
        const results = (await client.client.call('FT.SEARCH', ...args)) as unknown[];
        return parseSearchResults<T>(results, index.indexType);
    } catch (error) {
        logger.error({ error, indexName, query }, 'Text search failed');
        return { total: 0, items: [] };
    }
}

/**
 * Perform a vector similarity search (KNN)
 */
export async function vectorSearch<T = Record<string, unknown>>(
    indexName: string,
    vectorField: string,
    queryVector: number[],
    options: VectorSearchOptions = {}
): Promise<SearchResult<T>> {
    const client = getRedisClient();
    if (!client) {
        return { total: 0, items: [] };
    }

    const index = ALL_INDEXES.find((idx) => idx.name === indexName);
    if (!index) {
        throw new Error(`Unknown index: ${indexName}`);
    }

    const k = options.k ?? 10;

    // Build KNN query
    let query = `*=>[KNN ${k} @${vectorField} $BLOB AS score]`;

    // Add filter conditions
    if (options.filters) {
        const filterParts: string[] = [];
        for (const [field, value] of Object.entries(options.filters)) {
            filterParts.push(`@${field}:{${value}}`);
        }
        if (filterParts.length > 0) {
            query = `(${filterParts.join(' ')})=>[KNN ${k} @${vectorField} $BLOB AS score]`;
        }
    }

    // Convert vector to buffer
    const vectorBuffer = Buffer.from(new Float32Array(queryVector).buffer);

    const args: (string | number | Buffer)[] = [
        indexName,
        query,
        'PARAMS',
        '2',
        'BLOB',
        vectorBuffer,
        'SORTBY',
        'score',
        'ASC', // Lower distance = more similar
        'LIMIT',
        options.offset ?? 0,
        k,
        'DIALECT',
        '2',
    ];

    // Add return fields
    if (options.returnFields && options.returnFields.length > 0) {
        args.push('RETURN', options.returnFields.length + 1, 'score', ...options.returnFields);
    }

    try {
        const results = (await client.client.call('FT.SEARCH', ...args)) as unknown[];
        const parsed = parseSearchResults<T>(results, index.indexType);

        // Extract scores from results
        for (const item of parsed.items) {
            const data = item.data as Record<string, unknown>;
            if ('score' in data) {
                item.score = parseFloat(String(data.score));
                delete data.score;
            }
        }

        return parsed;
    } catch (error) {
        logger.error({ error, indexName, vectorField }, 'Vector search failed');
        return { total: 0, items: [] };
    }
}

/**
 * Hybrid search combining text and vector similarity
 */
export async function hybridSearch<T = Record<string, unknown>>(
    indexName: string,
    textQuery: string,
    vectorField: string,
    queryVector: number[],
    options: VectorSearchOptions & { textWeight?: number; vectorWeight?: number } = {}
): Promise<SearchResult<T>> {
    // First, get text search results
    const textResults = await textSearch<T>(indexName, textQuery, {
        ...options,
        limit: (options.limit ?? 10) * 2, // Get more results for merging
    });

    // Then, get vector search results
    const vectorResults = await vectorSearch<T>(indexName, vectorField, queryVector, {
        ...options,
        k: (options.k ?? 10) * 2,
    });

    // Merge and rank results (simple weighted combination)
    const textWeight = options.textWeight ?? 0.5;
    const vectorWeight = options.vectorWeight ?? 0.5;

    const scoreMap = new Map<string, { data: T; textRank: number; vectorScore: number }>();

    // Add text results with their rank as score
    textResults.items.forEach((item, index) => {
        scoreMap.set(item.id, {
            data: item.data,
            textRank: index + 1,
            vectorScore: Infinity,
        });
    });

    // Add/update vector results
    vectorResults.items.forEach((item) => {
        const existing = scoreMap.get(item.id);
        if (existing) {
            existing.vectorScore = item.score ?? 1;
        } else {
            scoreMap.set(item.id, {
                data: item.data,
                textRank: textResults.items.length + 1,
                vectorScore: item.score ?? 1,
            });
        }
    });

    // Calculate combined scores and sort
    const combinedResults = Array.from(scoreMap.entries())
        .map(([id, { data, textRank, vectorScore }]) => {
            // Normalize scores (lower is better for both)
            const normalizedTextScore = textRank / (textResults.items.length + 1);
            const normalizedVectorScore = vectorScore; // Already 0-1 for cosine

            const combinedScore =
                textWeight * normalizedTextScore + vectorWeight * normalizedVectorScore;

            return { id, data, score: combinedScore };
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, options.limit ?? 10);

    return {
        total: scoreMap.size,
        items: combinedResults,
    };
}

export default {
    createIndex,
    dropIndex,
    createAllIndexes,
    dropAllIndexes,
    textSearch,
    vectorSearch,
    hybridSearch,
    ALL_INDEXES,
};
