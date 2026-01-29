/**
 * Queue Manager
 * Manages background job queues for memory processing
 */

import { logger } from '../log';

// ============================================================================
// TYPES
// ============================================================================

export interface QueueJob<T = unknown> {
    id: string;
    type: string;
    data: T;
    priority: number;
    attempts: number;
    maxAttempts: number;
    createdAt: Date;
    processAfter?: Date;
    metadata?: Record<string, unknown>;
}

export interface JobResult<R = unknown> {
    success: boolean;
    result?: R;
    error?: string;
    executionTimeMs: number;
}

export type JobHandler<T = unknown, R = unknown> = (
    job: QueueJob<T>
) => Promise<JobResult<R>>;

export interface QueueConfig {
    /** Maximum concurrent jobs */
    concurrency: number;
    /** Default retry attempts */
    defaultRetries: number;
    /** Retry delay in ms */
    retryDelay: number;
    /** Poll interval for new jobs in ms */
    pollInterval: number;
}

const DEFAULT_CONFIG: QueueConfig = {
    concurrency: 5,
    defaultRetries: 3,
    retryDelay: 5000,
    pollInterval: 1000,
};

// ============================================================================
// IN-MEMORY QUEUE
// ============================================================================

class InMemoryQueue {
    private jobs: Map<string, QueueJob> = new Map();
    private pending: string[] = [];
    private processing: Set<string> = new Set();
    private completed: Map<string, JobResult> = new Map();
    private failed: Map<string, { job: QueueJob; error: string }> = new Map();

    add(job: QueueJob): void {
        this.jobs.set(job.id, job);
        this.pending.push(job.id);
        // Sort by priority (higher first) then by creation time
        this.pending.sort((a, b) => {
            const jobA = this.jobs.get(a)!;
            const jobB = this.jobs.get(b)!;
            if (jobA.priority !== jobB.priority) {
                return jobB.priority - jobA.priority;
            }
            return jobA.createdAt.getTime() - jobB.createdAt.getTime();
        });
    }

    getNextPending(): QueueJob | null {
        const now = new Date();
        for (let i = 0; i < this.pending.length; i++) {
            const id = this.pending[i];
            const job = this.jobs.get(id);
            if (!job) continue;
            if (job.processAfter && job.processAfter > now) continue;
            this.pending.splice(i, 1);
            this.processing.add(id);
            return job;
        }
        return null;
    }

    markComplete(id: string, result: JobResult): void {
        this.processing.delete(id);
        this.completed.set(id, result);
    }

    markFailed(id: string, error: string): void {
        this.processing.delete(id);
        const job = this.jobs.get(id);
        if (job) {
            this.failed.set(id, { job, error });
        }
    }

    requeueForRetry(job: QueueJob): void {
        const updatedJob = {
            ...job,
            attempts: job.attempts + 1,
            processAfter: new Date(Date.now() + DEFAULT_CONFIG.retryDelay),
        };
        this.jobs.set(job.id, updatedJob);
        this.processing.delete(job.id);
        this.pending.push(job.id);
    }

    getStats(): {
        pending: number;
        processing: number;
        completed: number;
        failed: number;
    } {
        return {
            pending: this.pending.length,
            processing: this.processing.size,
            completed: this.completed.size,
            failed: this.failed.size,
        };
    }
}

// ============================================================================
// QUEUE MANAGER
// ============================================================================

class QueueManager {
    private readonly logger = logger;
    private queues: Map<string, InMemoryQueue> = new Map();
    private handlers: Map<string, JobHandler> = new Map();
    private config: QueueConfig;
    private running = false;
    private pollIntervalId?: NodeJS.Timeout;

    constructor(config: Partial<QueueConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Register a job handler for a queue type
     */
    registerHandler<T, R>(
        type: string,
        handler: JobHandler<T, R>
    ): void {
        this.handlers.set(type, handler as JobHandler);
        this.logger.info({ type }, 'Job handler registered');
    }

    /**
     * Add a job to the queue
     */
    async addJob<T>(
        type: string,
        data: T,
        options: {
            priority?: number;
            maxAttempts?: number;
            processAfter?: Date;
            metadata?: Record<string, unknown>;
        } = {}
    ): Promise<string> {
        const queue = this.getOrCreateQueue(type);

        const job: QueueJob<T> = {
            id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type,
            data,
            priority: options.priority ?? 0,
            attempts: 0,
            maxAttempts: options.maxAttempts ?? this.config.defaultRetries,
            createdAt: new Date(),
            processAfter: options.processAfter,
            metadata: options.metadata,
        };

        queue.add(job);
        this.logger.debug({ jobId: job.id, type }, 'Job added to queue');

        return job.id;
    }

    /**
     * Start processing queued jobs
     */
    start(): void {
        if (this.running) {
            return;
        }

        this.running = true;
        this.pollIntervalId = setInterval(() => {
            this.processQueues();
        }, this.config.pollInterval);

        this.logger.info('Queue manager started');
    }

    /**
     * Stop processing queued jobs
     */
    stop(): void {
        if (!this.running) {
            return;
        }

        this.running = false;
        if (this.pollIntervalId) {
            clearInterval(this.pollIntervalId);
            this.pollIntervalId = undefined;
        }

        this.logger.info('Queue manager stopped');
    }

    /**
     * Process jobs from all queues
     */
    private async processQueues(): Promise<void> {
        for (const [type, queue] of this.queues) {
            const handler = this.handlers.get(type);
            if (!handler) {
                continue;
            }

            const stats = queue.getStats();
            if (stats.processing >= this.config.concurrency) {
                continue;
            }

            const job = queue.getNextPending();
            if (!job) {
                continue;
            }

            // Process asynchronously
            this.processJob(type, job, handler);
        }
    }

    /**
     * Process a single job
     */
    private async processJob(
        type: string,
        job: QueueJob,
        handler: JobHandler
    ): Promise<void> {
        const queue = this.queues.get(type)!;
        const startTime = Date.now();

        this.logger.debug(
            { jobId: job.id, type, attempt: job.attempts + 1 },
            'Processing job'
        );

        try {
            const result = await handler(job);

            if (result.success) {
                queue.markComplete(job.id, result);
                this.logger.debug(
                    { jobId: job.id, type, executionTimeMs: result.executionTimeMs },
                    'Job completed successfully'
                );
            } else {
                if (job.attempts < job.maxAttempts - 1) {
                    queue.requeueForRetry(job);
                    this.logger.warn(
                        { jobId: job.id, type, error: result.error, attempt: job.attempts + 1 },
                        'Job failed, requeuing for retry'
                    );
                } else {
                    queue.markFailed(job.id, result.error ?? 'Unknown error');
                    this.logger.error(
                        { jobId: job.id, type, error: result.error },
                        'Job failed after max attempts'
                    );
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            if (job.attempts < job.maxAttempts - 1) {
                queue.requeueForRetry(job);
                this.logger.warn(
                    { jobId: job.id, type, error: errorMessage, attempt: job.attempts + 1 },
                    'Job threw exception, requeuing for retry'
                );
            } else {
                queue.markFailed(job.id, errorMessage);
                this.logger.error(
                    { jobId: job.id, type, error: errorMessage, executionTimeMs: Date.now() - startTime },
                    'Job threw exception after max attempts'
                );
            }
        }
    }

    /**
     * Get or create a queue for a type
     */
    private getOrCreateQueue(type: string): InMemoryQueue {
        let queue = this.queues.get(type);
        if (!queue) {
            queue = new InMemoryQueue();
            this.queues.set(type, queue);
        }
        return queue;
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
        const stats: Record<string, {
            pending: number;
            processing: number;
            completed: number;
            failed: number;
        }> = {};

        for (const [type, queue] of this.queues) {
            stats[type] = queue.getStats();
        }

        return stats;
    }

    /**
     * Check if queue manager is running
     */
    isRunning(): boolean {
        return this.running;
    }
}

// Singleton instance
export const queueManager = new QueueManager();

export default queueManager;
