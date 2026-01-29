/**
 * Functions Module
 * Central exports for agent functions and schema generation
 */

// Schema generator
export {
    zodToJsonSchema,
    buildFunctionSchema,
    toOpenAITool,
    toOpenAITools,
    toAnthropicTool,
    toAnthropicTools,
    stringParam,
    numberParam,
    booleanParam,
    enumParam,
    arrayParam,
    objectParam,
} from './schema-generator.js';

export type {
    FunctionSchema,
    PropertySchema,
} from './schema-generator.js';

// Base functions
export {
    sendMessage,
    sendIntermediateMessage,
    conversationSearch,
    searchInMemory,
    sendMessageSchema,
    sendIntermediateMessageSchema,
    conversationSearchSchema,
    searchInMemorySchema,
    baseFunctionSchemas,
    baseFunctions,
} from './base-functions.js';

// Memory functions
export {
    coreMemoryAppend,
    coreMemoryRewrite,
    coreMemoryGet,
    episodicMemoryInsert,
    episodicMemorySearch,
    semanticMemoryInsert,
    semanticMemorySearch,
    semanticMemoryUpdate,
    proceduralMemoryInsert,
    proceduralMemorySearch,
    resourceMemoryInsert,
    resourceMemorySearch,
    knowledgeMemoryInsert,
    knowledgeMemorySearch,
    coreMemoryAppendSchema,
    coreMemoryRewriteSchema,
    coreMemoryGetSchema,
    episodicMemoryInsertSchema,
    episodicMemorySearchSchema,
    semanticMemoryInsertSchema,
    semanticMemorySearchSchema,
    proceduralMemoryInsertSchema,
    proceduralMemorySearchSchema,
    resourceMemoryInsertSchema,
    resourceMemorySearchSchema,
    knowledgeMemoryInsertSchema,
    knowledgeMemorySearchSchema,
    memoryFunctionSchemas,
    memoryFunctions,
} from './memory-functions.js';

// Combined exports
export const allFunctionSchemas = [
    ...(() => {
        // Lazy import to avoid circular dependencies
        const { baseFunctionSchemas } = require('./base-functions.js');
        const { memoryFunctionSchemas } = require('./memory-functions.js');
        return [...baseFunctionSchemas, ...memoryFunctionSchemas];
    })(),
];
