/**
 * Memory Services Module
 * Exports all memory manager classes and their types
 */

// Base memory manager
export {
    BaseMemoryManager,
    type MemoryListOptions,
    type CacheConfig,
} from './base-memory-manager.js';

// Episodic memory
export {
    episodicMemoryManager,
    type CreateEpisodicEventInput,
    type UpdateEpisodicEventInput,
    type LastModify,
} from './episodic-memory-manager.js';

// Semantic memory
export {
    semanticMemoryManager,
    type CreateSemanticMemoryInput,
    type UpdateSemanticMemoryInput,
} from './semantic-memory-manager.js';

// Procedural memory
export {
    proceduralMemoryManager,
    type CreateProceduralMemoryInput,
    type UpdateProceduralMemoryInput,
} from './procedural-memory-manager.js';

// Resource memory
export {
    resourceMemoryManager,
    type CreateResourceMemoryInput,
    type UpdateResourceMemoryInput,
} from './resource-memory-manager.js';

// Knowledge memory
export {
    knowledgeMemoryManager,
    type CreateKnowledgeItemInput,
    type UpdateKnowledgeItemInput,
} from './knowledge-memory-manager.js';
