/**
 * Security Module
 * Central exports for security utilities
 */

// API Key utilities
export {
    generateApiKey,
    hashApiKey,
    verifyApiKey,
    getApiKeyPrefix,
    isValidApiKeyFormat,
    getApiKeyType,
    maskApiKey,
    partialReveal,
    ApiKeyPrefix,
} from './api-key.js';

// Permission utilities
export {
    PermissionLevel,
    hasPermission,
    getHighestPermission,
    isValidPermission,
    ResourceAction,
    ResourceType,
    canPerformAction,
    getAllowedActions,
    scopeIncludes,
    mergeScopes,
} from './permissions.js';

export type {
    AccessScope,
} from './permissions.js';
