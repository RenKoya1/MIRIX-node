/**
 * Mirix TypeScript - Main Entry Point
 *
 * Multi-Agent Personal Assistant with an Advanced Memory System
 */

// Schemas
export * from './schemas/index.js';

// Logging
export * from './log.js';

// Errors
export * from './errors.js';

// Embeddings
export * from './embeddings.js';

// Pricing
export * from './pricing.js';

// LLM API (Vercel AI SDK)
export * from './llm_api/index.js';

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
} from './database/index.js';

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
} from './services/index.js';

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
} from './services/index.js';

// Tools
export {
    toolRegistry,
    toolRuleSolver,
    createSandbox,
    toolSandbox,
} from './tools/index.js';

export type {
    ToolDefinition,
    ToolExecutionContext,
    ToolExecutionResult,
    ToolCall,
    ToolReturn,
    ToolRule,
    ToolExecutionState,
} from './tools/index.js';

// Agent
export {
    MirixAgent,
    createAgent,
    BaseAgent,
    DEFAULT_AGENT_CONFIG,
    AgentStatus,
    createAgentState,
} from './agent/index.js';

export type {
    AgentConfig,
    AgentResult,
    AgentState,
    AgentStep,
} from './agent/index.js';

// Server
export {
    createApp,
    startServer,
    authMiddleware,
    optionalAuthMiddleware,
    requirePermission,
    errorHandler,
    notFoundHandler,
} from './server/index.js';

export type {
    AuthContext,
    ErrorResponse,
} from './server/index.js';

// Queue
export {
    queueManager,
    queueWorker,
    memoryProcessor,
    JobType,
} from './queue/index.js';

export type {
    QueueJob,
    JobResult,
    JobHandler,
    QueueConfig,
    WorkerConfig,
    MemoryJobData,
    BackgroundAgentJobData,
    CleanupJobData,
} from './queue/index.js';

// Version
export const VERSION = '0.1.0';

// Log startup
import { getLogger } from './log.js';
const logger = getLogger('mirix');
logger.info({ version: VERSION }, 'Mirix TypeScript initialized');
