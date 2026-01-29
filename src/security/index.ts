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
} from './api-key';

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
} from './permissions';

export type {
    AccessScope,
} from './permissions';
