/**
 * Settings Module
 * Environment-based configuration for MIRIX
 * Converted from: mirix/settings.py
 */

import path from 'path';
import os from 'os';
import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getEnvString(key: string, defaultValue?: string): string | undefined {
    return process.env[key] ?? defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvFloat(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
}

function getEnvPath(key: string, defaultPath: string): string {
    const value = process.env[key];
    if (value) return value;
    return defaultPath;
}

// ============================================================================
// CORS ORIGINS
// ============================================================================

export const CORS_ORIGINS = [
    'http://mirix.localhost',
    'http://localhost:8283',
    'http://localhost:8083',
    'http://localhost:3000',
    'http://localhost:4200',
];

// ============================================================================
// TOOL SETTINGS
// ============================================================================

export interface ToolSettings {
    composioApiKey?: string;
    e2bApiKey?: string;
    e2bSandboxTemplateId?: string;
    localSandboxDir?: string;
}

export const toolSettings: ToolSettings = {
    composioApiKey: getEnvString('COMPOSIO_API_KEY'),
    e2bApiKey: getEnvString('E2B_API_KEY'),
    e2bSandboxTemplateId: getEnvString('E2B_SANDBOX_TEMPLATE_ID'),
    localSandboxDir: getEnvString('LOCAL_SANDBOX_DIR'),
};

// ============================================================================
// SUMMARIZER SETTINGS
// ============================================================================

export interface SummarizerSettings {
    /** Controls if we should evict all messages */
    evictAllMessages: boolean;
    /** Maximum number of retries for the summarizer */
    maxSummarizerRetries: number;
    /** When to warn the model that a summarize command will happen soon */
    memoryWarningThreshold: number;
    /** Whether to send the system memory warning message */
    sendMemoryWarningMessage: boolean;
    /** The desired memory pressure to summarize down to */
    desiredMemoryTokenPressure: number;
    /** The number of messages at the end to keep */
    keepLastNMessages: number;
}

export const summarizerSettings: SummarizerSettings = {
    evictAllMessages: getEnvBoolean('MIRIX_SUMMARIZER_EVICT_ALL_MESSAGES', false),
    maxSummarizerRetries: getEnvNumber('MIRIX_SUMMARIZER_MAX_SUMMARIZER_RETRIES', 3),
    memoryWarningThreshold: getEnvFloat('MIRIX_SUMMARIZER_MEMORY_WARNING_THRESHOLD', 0.75),
    sendMemoryWarningMessage: getEnvBoolean('MIRIX_SUMMARIZER_SEND_MEMORY_WARNING_MESSAGE', false),
    desiredMemoryTokenPressure: getEnvFloat('MIRIX_SUMMARIZER_DESIRED_MEMORY_TOKEN_PRESSURE', 0.1),
    keepLastNMessages: getEnvNumber('MIRIX_SUMMARIZER_KEEP_LAST_N_MESSAGES', 5),
};

// ============================================================================
// MODEL SETTINGS (LLM Provider Credentials)
// ============================================================================

export interface ModelSettings {
    // OpenAI
    openaiApiKey?: string;
    openaiApiBase: string;
    // Groq
    groqApiKey?: string;
    // AWS Bedrock
    awsAccessKey?: string;
    awsSecretAccessKey?: string;
    awsRegion?: string;
    bedrockAnthropicVersion: string;
    // Anthropic
    anthropicApiKey?: string;
    // Ollama
    ollamaBaseUrl?: string;
    // Azure
    azureApiKey?: string;
    azureBaseUrl?: string;
    azureApiVersion: string;
    // Google AI
    geminiApiKey?: string;
    // Together
    togetherApiKey?: string;
    // vLLM
    vllmApiBase?: string;
    // OpenLLM
    openllmAuthType?: string;
    openllmApiKey?: string;
    // Schema generation
    disableSchemaGeneration: boolean;
}

export const modelSettings: ModelSettings = {
    // OpenAI
    openaiApiKey: getEnvString('OPENAI_API_KEY'),
    openaiApiBase: getEnvString('OPENAI_API_BASE', 'https://api.openai.com/v1')!,
    // Groq
    groqApiKey: getEnvString('GROQ_API_KEY'),
    // AWS Bedrock
    awsAccessKey: getEnvString('AWS_ACCESS_KEY'),
    awsSecretAccessKey: getEnvString('AWS_SECRET_ACCESS_KEY'),
    awsRegion: getEnvString('AWS_REGION'),
    bedrockAnthropicVersion: getEnvString('BEDROCK_ANTHROPIC_VERSION', 'bedrock-2023-05-31')!,
    // Anthropic
    anthropicApiKey: getEnvString('ANTHROPIC_API_KEY'),
    // Ollama
    ollamaBaseUrl: getEnvString('OLLAMA_BASE_URL'),
    // Azure
    azureApiKey: getEnvString('AZURE_API_KEY'),
    azureBaseUrl: getEnvString('AZURE_BASE_URL'),
    azureApiVersion: getEnvString('AZURE_API_VERSION', '2024-09-01-preview')!,
    // Google AI
    geminiApiKey: getEnvString('GEMINI_API_KEY'),
    // Together
    togetherApiKey: getEnvString('TOGETHER_API_KEY'),
    // vLLM
    vllmApiBase: getEnvString('VLLM_API_BASE'),
    // OpenLLM
    openllmAuthType: getEnvString('OPENLLM_AUTH_TYPE'),
    openllmApiKey: getEnvString('OPENLLM_API_KEY'),
    // Schema generation
    disableSchemaGeneration: getEnvBoolean('DISABLE_SCHEMA_GENERATION', false),
};

// ============================================================================
// MAIN SETTINGS
// ============================================================================

export interface Settings {
    // Directories
    mirixDir: string;
    imagesDir: string;
    debug: boolean;
    corsOrigins: string[];

    // Database configuration (PostgreSQL)
    pgDb?: string;
    pgUser?: string;
    pgPassword?: string;
    pgHost?: string;
    pgPort?: number;
    pgUri?: string;
    pgPoolSize: number;
    pgMaxOverflow: number;
    pgPoolTimeout: number;
    pgPoolRecycle: number;
    pgEcho: boolean;

    // Redis configuration
    redisEnabled: boolean;
    redisHost?: string;
    redisPort: number;
    redisDb: number;
    redisPassword?: string;
    redisUri?: string;
    redisMaxConnections: number;
    redisSocketTimeout: number;
    redisSocketConnectTimeout: number;
    redisSocketKeepalive: boolean;
    redisRetryOnTimeout: boolean;

    // Redis TTL settings (cache expiration times in seconds)
    redisTtlDefault: number;
    redisTtlBlocks: number;
    redisTtlMessages: number;
    redisTtlOrganizations: number;
    redisTtlUsers: number;
    redisTtlClients: number;
    redisTtlAgents: number;
    redisTtlTools: number;

    // Multi-agent settings
    multiAgentSendMessageMaxRetries: number;
    multiAgentSendMessageTimeout: number;
    multiAgentConcurrentSends: number;

    // Telemetry logging
    verboseTelemetryLogging: boolean;
    otelExporterOtlpEndpoint?: string;
    disableTracing: boolean;

    // Uvicorn/Server settings
    uvicornWorkers: number;
    uvicornReload: boolean;
    uvicornTimeoutKeepAlive: number;

    // Memory queue settings
    memoryQueueNumWorkers: number;
    buildEmbeddingsForMemory: boolean;

    // Event loop parallelism
    eventLoopThreadpoolMaxWorkers: number;

    // Experimental
    useExperimental: boolean;

    // Logging configuration
    logLevel: string;
    logFile?: string;
    logToConsole: boolean;
    logMaxBytes: number;
    logBackupCount: number;

    // HTTP client settings
    httpxMaxRetries: number;
    httpxTimeoutConnect: number;
    httpxTimeoutRead: number;
    httpxTimeoutWrite: number;
    httpxTimeoutPool: number;
    httpxMaxConnections: number;
    httpxMaxKeepaliveConnections: number;
    httpxKeepaliveExpiry: number;

    // Cron job parameters
    enableBatchJobPolling: boolean;
    pollRunningLlmBatchesIntervalSeconds: number;

    // JWT settings
    jwtSecretKey?: string;
    jwtExpirationHours: number;

    // Computed properties
    mirixPgUri: string;
    mirixRedisUri?: string;
}

function createSettings(): Settings {
    const mirixDir = getEnvPath('MIRIX_DIR', path.join(os.homedir(), '.mirix'));
    const imagesDir = getEnvPath('MIRIX_IMAGES_DIR', path.join(mirixDir, 'images'));

    const pgDb = getEnvString('MIRIX_PG_DB');
    const pgUser = getEnvString('MIRIX_PG_USER');
    const pgPassword = getEnvString('MIRIX_PG_PASSWORD');
    const pgHost = getEnvString('MIRIX_PG_HOST');
    const pgPort = getEnvString('MIRIX_PG_PORT') ? parseInt(getEnvString('MIRIX_PG_PORT')!, 10) : undefined;
    const pgUri = getEnvString('MIRIX_PG_URI');

    const redisEnabled = getEnvBoolean('MIRIX_REDIS_ENABLED', false);
    const redisHost = getEnvString('MIRIX_REDIS_HOST');
    const redisPort = getEnvNumber('MIRIX_REDIS_PORT', 6379);
    const redisDb = getEnvNumber('MIRIX_REDIS_DB', 0);
    const redisPassword = getEnvString('MIRIX_REDIS_PASSWORD');
    const redisUri = getEnvString('MIRIX_REDIS_URI');

    // Compute PostgreSQL URI
    let mirixPgUri: string;
    if (pgUri) {
        mirixPgUri = pgUri;
    } else if (pgDb && pgUser && pgPassword && pgHost && pgPort) {
        mirixPgUri = `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDb}`;
    } else {
        mirixPgUri = 'postgresql://mirix:mirix@localhost:5432/mirix';
    }

    // Compute Redis URI
    let mirixRedisUri: string | undefined;
    if (redisEnabled) {
        if (redisUri) {
            mirixRedisUri = redisUri;
        } else if (redisHost) {
            const auth = redisPassword ? `:${redisPassword}@` : '';
            mirixRedisUri = `redis://${auth}${redisHost}:${redisPort}/${redisDb}`;
        }
    }

    return {
        // Directories
        mirixDir,
        imagesDir,
        debug: getEnvBoolean('MIRIX_DEBUG', false),
        corsOrigins: CORS_ORIGINS,

        // Database configuration
        pgDb,
        pgUser,
        pgPassword,
        pgHost,
        pgPort,
        pgUri,
        pgPoolSize: getEnvNumber('MIRIX_PG_POOL_SIZE', 80),
        pgMaxOverflow: getEnvNumber('MIRIX_PG_MAX_OVERFLOW', 30),
        pgPoolTimeout: getEnvNumber('MIRIX_PG_POOL_TIMEOUT', 30),
        pgPoolRecycle: getEnvNumber('MIRIX_PG_POOL_RECYCLE', 1800),
        pgEcho: getEnvBoolean('MIRIX_PG_ECHO', false),

        // Redis configuration
        redisEnabled,
        redisHost,
        redisPort,
        redisDb,
        redisPassword,
        redisUri,
        redisMaxConnections: getEnvNumber('MIRIX_REDIS_MAX_CONNECTIONS', 50),
        redisSocketTimeout: getEnvNumber('MIRIX_REDIS_SOCKET_TIMEOUT', 5),
        redisSocketConnectTimeout: getEnvNumber('MIRIX_REDIS_SOCKET_CONNECT_TIMEOUT', 5),
        redisSocketKeepalive: getEnvBoolean('MIRIX_REDIS_SOCKET_KEEPALIVE', true),
        redisRetryOnTimeout: getEnvBoolean('MIRIX_REDIS_RETRY_ON_TIMEOUT', true),

        // Redis TTL settings
        redisTtlDefault: getEnvNumber('MIRIX_REDIS_TTL_DEFAULT', 3600),
        redisTtlBlocks: getEnvNumber('MIRIX_REDIS_TTL_BLOCKS', 7200),
        redisTtlMessages: getEnvNumber('MIRIX_REDIS_TTL_MESSAGES', 7200),
        redisTtlOrganizations: getEnvNumber('MIRIX_REDIS_TTL_ORGANIZATIONS', 43200),
        redisTtlUsers: getEnvNumber('MIRIX_REDIS_TTL_USERS', 43200),
        redisTtlClients: getEnvNumber('MIRIX_REDIS_TTL_CLIENTS', 43200),
        redisTtlAgents: getEnvNumber('MIRIX_REDIS_TTL_AGENTS', 43200),
        redisTtlTools: getEnvNumber('MIRIX_REDIS_TTL_TOOLS', 43200),

        // Multi-agent settings
        multiAgentSendMessageMaxRetries: getEnvNumber('MIRIX_MULTI_AGENT_SEND_MESSAGE_MAX_RETRIES', 3),
        multiAgentSendMessageTimeout: getEnvNumber('MIRIX_MULTI_AGENT_SEND_MESSAGE_TIMEOUT', 20 * 60),
        multiAgentConcurrentSends: getEnvNumber('MIRIX_MULTI_AGENT_CONCURRENT_SENDS', 50),

        // Telemetry logging
        verboseTelemetryLogging: getEnvBoolean('MIRIX_VERBOSE_TELEMETRY_LOGGING', false),
        otelExporterOtlpEndpoint: getEnvString('OTEL_EXPORTER_OTLP_ENDPOINT'),
        disableTracing: getEnvBoolean('MIRIX_DISABLE_TRACING', false),

        // Uvicorn/Server settings
        uvicornWorkers: getEnvNumber('MIRIX_UVICORN_WORKERS', 1),
        uvicornReload: getEnvBoolean('MIRIX_UVICORN_RELOAD', false),
        uvicornTimeoutKeepAlive: getEnvNumber('MIRIX_UVICORN_TIMEOUT_KEEP_ALIVE', 5),

        // Memory queue settings
        memoryQueueNumWorkers: getEnvNumber('MIRIX_MEMORY_QUEUE_NUM_WORKERS', 1),
        buildEmbeddingsForMemory: getEnvBoolean('MIRIX_BUILD_EMBEDDINGS_FOR_MEMORY', true),

        // Event loop parallelism
        eventLoopThreadpoolMaxWorkers: getEnvNumber('MIRIX_EVENT_LOOP_THREADPOOL_MAX_WORKERS', 43),

        // Experimental
        useExperimental: getEnvBoolean('MIRIX_USE_EXPERIMENTAL', false),

        // Logging configuration
        logLevel: getEnvString('MIRIX_LOG_LEVEL', 'INFO')!,
        logFile: getEnvString('MIRIX_LOG_FILE'),
        logToConsole: getEnvBoolean('MIRIX_LOG_TO_CONSOLE', true),
        logMaxBytes: getEnvNumber('MIRIX_LOG_MAX_BYTES', 10 * 1024 * 1024),
        logBackupCount: getEnvNumber('MIRIX_LOG_BACKUP_COUNT', 5),

        // HTTP client settings
        httpxMaxRetries: getEnvNumber('MIRIX_HTTPX_MAX_RETRIES', 5),
        httpxTimeoutConnect: getEnvFloat('MIRIX_HTTPX_TIMEOUT_CONNECT', 10.0),
        httpxTimeoutRead: getEnvFloat('MIRIX_HTTPX_TIMEOUT_READ', 60.0),
        httpxTimeoutWrite: getEnvFloat('MIRIX_HTTPX_TIMEOUT_WRITE', 30.0),
        httpxTimeoutPool: getEnvFloat('MIRIX_HTTPX_TIMEOUT_POOL', 10.0),
        httpxMaxConnections: getEnvNumber('MIRIX_HTTPX_MAX_CONNECTIONS', 500),
        httpxMaxKeepaliveConnections: getEnvNumber('MIRIX_HTTPX_MAX_KEEPALIVE_CONNECTIONS', 500),
        httpxKeepaliveExpiry: getEnvFloat('MIRIX_HTTPX_KEEPALIVE_EXPIRY', 120.0),

        // Cron job parameters
        enableBatchJobPolling: getEnvBoolean('MIRIX_ENABLE_BATCH_JOB_POLLING', false),
        pollRunningLlmBatchesIntervalSeconds: getEnvNumber('MIRIX_POLL_RUNNING_LLM_BATCHES_INTERVAL_SECONDS', 5 * 60),

        // JWT settings
        jwtSecretKey: getEnvString('MIRIX_JWT_SECRET_KEY'),
        jwtExpirationHours: getEnvNumber('MIRIX_JWT_EXPIRATION_HOURS', 24),

        // Computed properties
        mirixPgUri,
        mirixRedisUri,
    };
}

// ============================================================================
// TEST SETTINGS
// ============================================================================

function createTestSettings(): Settings {
    const baseSettings = createSettings();
    const testMirixDir = getEnvPath('MIRIX_TEST_DIR', path.join(os.homedir(), '.mirix', 'test'));
    const testImagesDir = getEnvPath('MIRIX_TEST_IMAGES_DIR', path.join(testMirixDir, 'images'));

    return {
        ...baseSettings,
        mirixDir: testMirixDir,
        imagesDir: testImagesDir,
    };
}

// ============================================================================
// SINGLETON EXPORTS
// ============================================================================

/** Main application settings */
export const settings = createSettings();

/** Test environment settings */
export const testSettings = createTestSettings();

// ============================================================================
// ZOD SCHEMAS (for validation)
// ============================================================================

export const SettingsSchema = z.object({
    mirixDir: z.string(),
    imagesDir: z.string(),
    debug: z.boolean(),
    corsOrigins: z.array(z.string()),
    pgUri: z.string().optional(),
    pgPoolSize: z.number(),
    redisEnabled: z.boolean(),
    redisHost: z.string().optional(),
    redisPort: z.number(),
    logLevel: z.string(),
    jwtSecretKey: z.string().optional(),
    jwtExpirationHours: z.number(),
});

export type SettingsInput = z.infer<typeof SettingsSchema>;
