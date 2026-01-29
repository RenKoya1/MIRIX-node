/**
 * Mirix TypeScript - Main Entry Point
 *
 * Multi-Agent Personal Assistant with an Advanced Memory System
 */

// Schemas
export * from './schemas/index';

// Logging
export * from './log';

// Errors
export * from './errors';

// Constants
export * from './constants';

// Settings
export * from './settings';

// Config
export * from './config';

// Utils
export * from './utils';

// Embeddings
export * from './embeddings';

// Pricing
export * from './pricing';

// Interface (Agent Events)
export * from './interface';

// Tracing (OpenTelemetry)
export * from './tracing';

// LLM API (Vercel AI SDK)
export * from './llm_api/index';

// Database (Prisma + Redis) - explicit exports to avoid conflicts
export {
    prisma,
    prismaRaw,
    connectDatabase,
    disconnectDatabase,
    withTransaction,
    setAuditContext,
    getRedisClient,
    initRedisClient,
    RedisMemoryClient,
} from './database/index';

// Services (Managers) - explicit exports to avoid conflicts
export {
    // Base manager
    BaseManager,
    AccessType,
    // Organization
    organizationManager,
    // User
    userManager,
    // Agent
    agentManager,
    AgentToolRuleType,
} from './services/index';

// Re-export types explicitly to avoid conflicts
export type {
    ActorContext,
    PaginationOptions,
    SortOptions,
    ListOptions,
    ListResult,
    CacheConfig,
    AccessPermission,
    CreateOrganizationInput,
    UpdateOrganizationInput,
    CreateUserInput,
    UpdateUserInput,
    UserListOptions,
    ToolRule as ServiceToolRule,
    EmbeddingConfig,
    MemoryConfig,
    CreateAgentInput,
    UpdateAgentInput,
    AgentListOptions,
    AgentWithRelations,
} from './services/index';

// Tools
export {
    toolRegistry,
    toolRuleSolver,
    createSandbox,
    toolSandbox,
} from './tools/index';

export type {
    ToolDefinition,
    ToolExecutionContext,
    ToolExecutionResult,
    ToolCall,
    ToolReturn,
    ToolRule,
    ToolExecutionState,
} from './tools/index';

// Agent
export {
    MirixAgent,
    createAgent,
    BaseAgent,
    DEFAULT_AGENT_CONFIG,
    AgentStatus,
    createAgentState,
    MetaAgent,
    MemoryAgentStates,
    MEMORY_AGENT_CONFIGS,
    createMetaAgent,
} from './agent/index';

export type {
    AgentConfig,
    AgentResult,
    AgentState,
    AgentStep,
    MemoryAgentConfig,
    MetaAgentOptions,
    MemoryAgentType,
    MetaAgentEmbeddingConfig,
    MetaAgentUsageStatistics,
} from './agent/index';

// Server
export {
    createApp,
    startServer,
    authMiddleware,
    optionalAuthMiddleware,
    requirePermission,
    errorHandler,
    notFoundHandler,
} from './server/index';

export type {
    AuthContext,
    ErrorResponse,
} from './server/index';

// Queue
export {
    queueManager,
    queueWorker,
    memoryProcessor,
    JobType,
} from './queue/index';

export type {
    QueueJob,
    JobResult,
    JobHandler,
    QueueConfig,
    WorkerConfig,
    MemoryJobData,
    BackgroundAgentJobData,
    CleanupJobData,
} from './queue/index';

// Version
export const VERSION = '0.1.0';

// Log startup
import { getLogger } from './log';
const logger = getLogger('mirix');
logger.info({ version: VERSION }, 'Mirix TypeScript initialized');
