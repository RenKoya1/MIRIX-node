/**
 * Queue Worker
 * Processes jobs from the queue manager
 */

import { logger } from '../log';
import { queueManager, QueueJob, JobResult } from './manager';
import { memoryProcessor } from './memory-processor';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkerConfig {
    /** Enable memory processing jobs */
    enableMemoryProcessing: boolean;
    /** Enable cleanup jobs */
    enableCleanup: boolean;
}

const DEFAULT_CONFIG: WorkerConfig = {
    enableMemoryProcessing: true,
    enableCleanup: true,
};

// ============================================================================
// JOB TYPES
// ============================================================================

export const JobType = {
    // Memory processing jobs
    PROCESS_EPISODIC_MEMORY: 'process_episodic_memory',
    PROCESS_SEMANTIC_MEMORY: 'process_semantic_memory',
    PROCESS_PROCEDURAL_MEMORY: 'process_procedural_memory',
    PROCESS_RESOURCE_MEMORY: 'process_resource_memory',
    PROCESS_KNOWLEDGE: 'process_knowledge',

    // Background agent jobs
    RUN_BACKGROUND_AGENT: 'run_background_agent',
    RUN_REFLEXION_AGENT: 'run_reflexion_agent',

    // Cleanup jobs
    CLEANUP_EXPIRED_MEMORIES: 'cleanup_expired_memories',
    CLEANUP_OLD_TRACES: 'cleanup_old_traces',
} as const;

export type JobType = (typeof JobType)[keyof typeof JobType];

// ============================================================================
// JOB DATA TYPES
// ============================================================================

export interface MemoryJobData {
    agentId: string;
    userId: string;
    organizationId: string;
    messageIds?: string[];
    content?: string;
    metadata?: Record<string, unknown>;
}

export interface BackgroundAgentJobData {
    agentId: string;
    userId: string;
    organizationId: string;
    input?: string;
}

export interface CleanupJobData {
    organizationId?: string;
    olderThan?: Date;
    limit?: number;
}

// ============================================================================
// QUEUE WORKER
// ============================================================================

class QueueWorker {
    private readonly logger = logger;
    private config: WorkerConfig;
    private started = false;

    constructor(config: Partial<WorkerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Initialize and start the worker
     */
    async start(): Promise<void> {
        if (this.started) {
            this.logger.warn('Queue worker already started');
            return;
        }

        // Register handlers
        this.registerHandlers();

        // Start the queue manager
        queueManager.start();

        this.started = true;
        this.logger.info('Queue worker started');
    }

    /**
     * Stop the worker
     */
    async stop(): Promise<void> {
        if (!this.started) {
            return;
        }

        queueManager.stop();
        this.started = false;
        this.logger.info('Queue worker stopped');
    }

    /**
     * Register job handlers
     */
    private registerHandlers(): void {
        if (this.config.enableMemoryProcessing) {
            // Episodic memory processing
            queueManager.registerHandler<MemoryJobData, void>(
                JobType.PROCESS_EPISODIC_MEMORY,
                this.handleEpisodicMemory.bind(this)
            );

            // Semantic memory processing
            queueManager.registerHandler<MemoryJobData, void>(
                JobType.PROCESS_SEMANTIC_MEMORY,
                this.handleSemanticMemory.bind(this)
            );

            // Procedural memory processing
            queueManager.registerHandler<MemoryJobData, void>(
                JobType.PROCESS_PROCEDURAL_MEMORY,
                this.handleProceduralMemory.bind(this)
            );

            // Resource memory processing
            queueManager.registerHandler<MemoryJobData, void>(
                JobType.PROCESS_RESOURCE_MEMORY,
                this.handleResourceMemory.bind(this)
            );

            // Knowledge processing
            queueManager.registerHandler<MemoryJobData, void>(
                JobType.PROCESS_KNOWLEDGE,
                this.handleKnowledge.bind(this)
            );
        }

        if (this.config.enableCleanup) {
            // Cleanup expired memories
            queueManager.registerHandler<CleanupJobData, number>(
                JobType.CLEANUP_EXPIRED_MEMORIES,
                this.handleCleanupExpiredMemories.bind(this)
            );

            // Cleanup old traces
            queueManager.registerHandler<CleanupJobData, number>(
                JobType.CLEANUP_OLD_TRACES,
                this.handleCleanupOldTraces.bind(this)
            );
        }
    }

    // ========================================================================
    // MEMORY JOB HANDLERS
    // ========================================================================

    private async handleEpisodicMemory(
        job: QueueJob<MemoryJobData>
    ): Promise<JobResult<void>> {
        const startTime = Date.now();

        try {
            await memoryProcessor.processEpisodicMemory(job.data);

            return {
                success: true,
                executionTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                executionTimeMs: Date.now() - startTime,
            };
        }
    }

    private async handleSemanticMemory(
        job: QueueJob<MemoryJobData>
    ): Promise<JobResult<void>> {
        const startTime = Date.now();

        try {
            await memoryProcessor.processSemanticMemory(job.data);

            return {
                success: true,
                executionTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                executionTimeMs: Date.now() - startTime,
            };
        }
    }

    private async handleProceduralMemory(
        job: QueueJob<MemoryJobData>
    ): Promise<JobResult<void>> {
        const startTime = Date.now();

        try {
            await memoryProcessor.processProceduralMemory(job.data);

            return {
                success: true,
                executionTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                executionTimeMs: Date.now() - startTime,
            };
        }
    }

    private async handleResourceMemory(
        job: QueueJob<MemoryJobData>
    ): Promise<JobResult<void>> {
        const startTime = Date.now();

        try {
            await memoryProcessor.processResourceMemory(job.data);

            return {
                success: true,
                executionTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                executionTimeMs: Date.now() - startTime,
            };
        }
    }

    private async handleKnowledge(
        job: QueueJob<MemoryJobData>
    ): Promise<JobResult<void>> {
        const startTime = Date.now();

        try {
            await memoryProcessor.processKnowledge(job.data);

            return {
                success: true,
                executionTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                executionTimeMs: Date.now() - startTime,
            };
        }
    }

    // ========================================================================
    // CLEANUP JOB HANDLERS
    // ========================================================================

    private async handleCleanupExpiredMemories(
        job: QueueJob<CleanupJobData>
    ): Promise<JobResult<number>> {
        const startTime = Date.now();

        try {
            const count = await memoryProcessor.cleanupExpiredMemories(job.data);

            return {
                success: true,
                result: count,
                executionTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                executionTimeMs: Date.now() - startTime,
            };
        }
    }

    private async handleCleanupOldTraces(
        job: QueueJob<CleanupJobData>
    ): Promise<JobResult<number>> {
        const startTime = Date.now();

        try {
            const count = await memoryProcessor.cleanupOldTraces(job.data);

            return {
                success: true,
                result: count,
                executionTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                executionTimeMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Check if worker is running
     */
    isRunning(): boolean {
        return this.started;
    }

    /**
     * Get queue statistics
     */
    getStats(): Record<string, {
        pending: number;
        processing: number;
        completed: number;
        failed: number;
    }> {
        return queueManager.getStats();
    }
}

// Singleton instance
export const queueWorker = new QueueWorker();

export default queueWorker;
