/**
 * Memory Processor
 * Handles background memory processing tasks
 */

import { prismaRaw } from '../database/prisma-client';
import { logger } from '../log';
import type { MemoryJobData, CleanupJobData } from './worker';

// ============================================================================
// MEMORY PROCESSOR
// ============================================================================

class MemoryProcessor {
    private readonly logger = logger;
    private readonly prisma = prismaRaw;

    // ========================================================================
    // EPISODIC MEMORY PROCESSING
    // ========================================================================

    /**
     * Process episodic memory from conversation
     * Extracts events and experiences from messages
     */
    async processEpisodicMemory(data: MemoryJobData): Promise<void> {
        const { agentId, userId, organizationId, messageIds } = data;

        this.logger.debug(
            { agentId, userId, messageIds },
            'Processing episodic memory'
        );

        // Get messages if IDs provided
        let messages: { text: string | null; createdAt: Date }[] = [];
        if (messageIds && messageIds.length > 0) {
            messages = await this.prisma.message.findMany({
                where: {
                    id: { in: messageIds },
                    isDeleted: false,
                },
                select: {
                    text: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'asc' },
            });
        }

        if (messages.length === 0) {
            this.logger.debug({ agentId }, 'No messages to process for episodic memory');
            return;
        }

        // TODO: Use LLM to extract events from messages
        // For now, create a simple summary event

        const combinedText = messages
            .map((m) => m.text)
            .filter(Boolean)
            .join('\n');

        if (!combinedText) {
            return;
        }

        // Create episodic memory entry
        await this.prisma.episodicEvent.create({
            data: {
                id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                userId,
                organizationId,
                agentId,
                occurredAt: new Date(),
                actor: 'user',
                eventType: 'conversation',
                summary: combinedText.substring(0, 500),
                details: JSON.stringify({ messageCount: messages.length }),
                filterTags: {},
            },
        });

        this.logger.info({ agentId, messageCount: messages.length }, 'Episodic memory created');
    }

    // ========================================================================
    // SEMANTIC MEMORY PROCESSING
    // ========================================================================

    /**
     * Process semantic memory
     * Extracts facts and concepts from content
     */
    async processSemanticMemory(data: MemoryJobData): Promise<void> {
        const { agentId, userId, organizationId, content } = data;

        this.logger.debug(
            { agentId, userId },
            'Processing semantic memory'
        );

        if (!content) {
            return;
        }

        // TODO: Use LLM to extract semantic facts
        // For now, store the content directly

        await this.prisma.semanticMemoryItem.create({
            data: {
                id: `sem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                userId,
                organizationId,
                agentId,
                name: `fact-${Date.now()}`,
                summary: content.substring(0, 500),
                details: '',
                source: 'conversation',
                filterTags: {},
            },
        });

        this.logger.info({ agentId }, 'Semantic memory created');
    }

    // ========================================================================
    // PROCEDURAL MEMORY PROCESSING
    // ========================================================================

    /**
     * Process procedural memory
     * Extracts patterns and procedures from interactions
     */
    async processProceduralMemory(data: MemoryJobData): Promise<void> {
        const { agentId, userId, organizationId, content, metadata } = data;

        this.logger.debug(
            { agentId, userId },
            'Processing procedural memory'
        );

        if (!content) {
            return;
        }

        // TODO: Use LLM to extract procedures and patterns
        // For now, store as a system entry

        await this.prisma.proceduralMemoryItem.create({
            data: {
                id: `proc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                userId,
                organizationId,
                agentId,
                entryType: 'system',
                summary: content.substring(0, 500),
                steps: metadata?.steps ?? [],
                filterTags: {},
            },
        });

        this.logger.info({ agentId }, 'Procedural memory created');
    }

    // ========================================================================
    // RESOURCE MEMORY PROCESSING
    // ========================================================================

    /**
     * Process resource memory
     * Stores references to external resources
     */
    async processResourceMemory(data: MemoryJobData): Promise<void> {
        const { agentId, userId, organizationId, content, metadata } = data;

        this.logger.debug(
            { agentId, userId },
            'Processing resource memory'
        );

        if (!content && !metadata?.title) {
            return;
        }

        await this.prisma.resourceMemoryItem.create({
            data: {
                id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                userId,
                organizationId,
                agentId,
                title: (metadata?.title as string) ?? 'Untitled Resource',
                summary: content?.substring(0, 500) ?? '',
                resourceType: (metadata?.resourceType as string) ?? 'document',
                content: content ?? '',
                filterTags: {},
            },
        });

        this.logger.info({ agentId }, 'Resource memory created');
    }

    // ========================================================================
    // KNOWLEDGE PROCESSING
    // ========================================================================

    /**
     * Process knowledge items
     * Stores important information and secrets
     */
    async processKnowledge(data: MemoryJobData): Promise<void> {
        const { agentId, userId, organizationId, content, metadata } = data;

        this.logger.debug(
            { agentId, userId },
            'Processing knowledge'
        );

        if (!content) {
            return;
        }

        await this.prisma.knowledgeItem.create({
            data: {
                id: `know-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                userId,
                organizationId,
                agentId,
                entryType: (metadata?.entryType as string) ?? 'fact',
                source: (metadata?.source as string) ?? 'conversation',
                sensitivity: 'normal',
                secretValue: '',
                caption: content.substring(0, 500),
                filterTags: {},
            },
        });

        this.logger.info({ agentId }, 'Knowledge item created');
    }

    // ========================================================================
    // CLEANUP OPERATIONS
    // ========================================================================

    /**
     * Clean up old memory items (based on creation date)
     */
    async cleanupExpiredMemories(data: CleanupJobData): Promise<number> {
        const { organizationId, olderThan } = data;

        this.logger.debug(
            { organizationId, olderThan },
            'Cleaning up old memories'
        );

        const cutoffDate = olderThan ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days

        const where = {
            isDeleted: false,
            createdAt: { lte: cutoffDate },
            ...(organizationId && { organizationId }),
        };

        // Soft delete old items from each memory table
        const results = await Promise.all([
            this.prisma.episodicEvent.updateMany({
                where,
                data: { isDeleted: true },
            }),
            this.prisma.semanticMemoryItem.updateMany({
                where,
                data: { isDeleted: true },
            }),
            this.prisma.proceduralMemoryItem.updateMany({
                where,
                data: { isDeleted: true },
            }),
            this.prisma.resourceMemoryItem.updateMany({
                where,
                data: { isDeleted: true },
            }),
            this.prisma.knowledgeItem.updateMany({
                where,
                data: { isDeleted: true },
            }),
        ]);

        const totalCount = results.reduce((sum, r) => sum + r.count, 0);

        this.logger.info(
            { totalCount, organizationId },
            'Cleaned up old memories'
        );

        return totalCount;
    }

    /**
     * Clean up old trace records
     */
    async cleanupOldTraces(data: CleanupJobData): Promise<number> {
        const { organizationId, olderThan } = data;

        this.logger.debug(
            { organizationId, olderThan },
            'Cleaning up old traces'
        );

        const cutoffDate = olderThan ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days

        const where = {
            createdAt: { lte: cutoffDate },
            ...(organizationId && { organizationId }),
        };

        // Delete old traces
        const results = await Promise.all([
            this.prisma.memoryAgentTrace.deleteMany({
                where,
            }),
            this.prisma.memoryQueueTrace.deleteMany({
                where,
            }),
        ]);

        const totalCount = results.reduce((sum, r) => sum + r.count, 0);

        this.logger.info(
            { totalCount, organizationId },
            'Cleaned up old traces'
        );

        return totalCount;
    }

    // ========================================================================
    // EMBEDDING GENERATION
    // ========================================================================

    /**
     * Generate embeddings for a memory item
     * TODO: Implement actual embedding generation
     */
    async generateEmbedding(_text: string): Promise<number[]> {
        // Placeholder - should use actual embedding model
        // For now, return a dummy embedding
        return new Array(1536).fill(0).map(() => Math.random() - 0.5);
    }
}

// Singleton instance
export const memoryProcessor = new MemoryProcessor();

export default memoryProcessor;
