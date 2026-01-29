/**
 * Memory Services Module
 * Exports all memory manager classes and their types
 */

// Base memory manager
export {
    BaseMemoryManager,
    type MemoryListOptions,
    type CacheConfig,
} from './base-memory-manager';

// Episodic memory
export {
    episodicMemoryManager,
    type CreateEpisodicEventInput,
    type UpdateEpisodicEventInput,
    type LastModify,
} from './episodic-memory-manager';

// Semantic memory
export {
    semanticMemoryManager,
    type CreateSemanticMemoryInput,
    type UpdateSemanticMemoryInput,
} from './semantic-memory-manager';

// Procedural memory
export {
    proceduralMemoryManager,
    type CreateProceduralMemoryInput,
    type UpdateProceduralMemoryInput,
} from './procedural-memory-manager';

// Resource memory
export {
    resourceMemoryManager,
    type CreateResourceMemoryInput,
    type UpdateResourceMemoryInput,
} from './resource-memory-manager';

// Knowledge memory
export {
    knowledgeMemoryManager,
    type CreateKnowledgeItemInput,
    type UpdateKnowledgeItemInput,
} from './knowledge-memory-manager';
