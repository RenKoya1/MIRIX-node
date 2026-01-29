/**
 * Queue Module
 * Central exports for background job processing
 */

export {
    queueManager,
    type QueueJob,
    type JobResult,
    type JobHandler,
    type QueueConfig,
} from './manager';

export {
    queueWorker,
    JobType,
    type WorkerConfig,
    type MemoryJobData,
    type BackgroundAgentJobData,
    type CleanupJobData,
} from './worker';

export { memoryProcessor } from './memory-processor';
