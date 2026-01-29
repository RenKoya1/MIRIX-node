/**
 * Permission Utilities
 * Functions for permission checking and validation
 */

// ============================================================================
// PERMISSION LEVELS
// ============================================================================

export const PermissionLevel = {
    /** Read-only access */
    READ_ONLY: 'read_only',
    /** Restricted access (read + limited write) */
    RESTRICTED: 'restricted',
    /** Full access */
    ALL: 'all',
} as const;

export type PermissionLevel = (typeof PermissionLevel)[keyof typeof PermissionLevel];

/**
 * Permission level hierarchy (lower index = lower permission)
 */
const PERMISSION_HIERARCHY: PermissionLevel[] = [
    PermissionLevel.READ_ONLY,
    PermissionLevel.RESTRICTED,
    PermissionLevel.ALL,
];

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

/**
 * Check if a permission level meets the required level
 */
export function hasPermission(
    current: PermissionLevel,
    required: PermissionLevel
): boolean {
    const currentIndex = PERMISSION_HIERARCHY.indexOf(current);
    const requiredIndex = PERMISSION_HIERARCHY.indexOf(required);

    if (currentIndex === -1 || requiredIndex === -1) {
        return false;
    }

    return currentIndex >= requiredIndex;
}

/**
 * Get the highest permission level from a list
 */
export function getHighestPermission(permissions: PermissionLevel[]): PermissionLevel {
    let highest: PermissionLevel = PermissionLevel.READ_ONLY;
    let highestIndex = 0;

    for (const perm of permissions) {
        const index = PERMISSION_HIERARCHY.indexOf(perm);
        if (index > highestIndex) {
            highest = perm;
            highestIndex = index;
        }
    }

    return highest;
}

/**
 * Check if a permission level is valid
 */
export function isValidPermission(permission: string): permission is PermissionLevel {
    return PERMISSION_HIERARCHY.includes(permission as PermissionLevel);
}

// ============================================================================
// RESOURCE PERMISSIONS
// ============================================================================

export const ResourceAction = {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
} as const;

export type ResourceAction = (typeof ResourceAction)[keyof typeof ResourceAction];

export const ResourceType = {
    AGENT: 'agent',
    MESSAGE: 'message',
    TOOL: 'tool',
    MEMORY: 'memory',
    USER: 'user',
    ORGANIZATION: 'organization',
} as const;

export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

/**
 * Permission mapping for resource actions
 */
const RESOURCE_PERMISSIONS: Record<ResourceAction, PermissionLevel> = {
    [ResourceAction.CREATE]: PermissionLevel.ALL,
    [ResourceAction.READ]: PermissionLevel.READ_ONLY,
    [ResourceAction.UPDATE]: PermissionLevel.ALL,
    [ResourceAction.DELETE]: PermissionLevel.ALL,
    [ResourceAction.LIST]: PermissionLevel.READ_ONLY,
};

/**
 * Check if a permission level allows a specific action
 */
export function canPerformAction(
    permission: PermissionLevel,
    action: ResourceAction
): boolean {
    const requiredPermission = RESOURCE_PERMISSIONS[action];
    return hasPermission(permission, requiredPermission);
}

/**
 * Get all allowed actions for a permission level
 */
export function getAllowedActions(permission: PermissionLevel): ResourceAction[] {
    return Object.entries(RESOURCE_PERMISSIONS)
        .filter(([, required]) => hasPermission(permission, required))
        .map(([action]) => action as ResourceAction);
}

// ============================================================================
// SCOPE CHECKING
// ============================================================================

export interface AccessScope {
    organizationId?: string;
    userId?: string;
    clientId?: string;
}

/**
 * Check if an access scope includes another scope
 */
export function scopeIncludes(broader: AccessScope, narrower: AccessScope): boolean {
    // If broader scope has no restrictions, it includes everything
    if (!broader.organizationId && !broader.userId && !broader.clientId) {
        return true;
    }

    // Check organization
    if (broader.organizationId && broader.organizationId !== narrower.organizationId) {
        return false;
    }

    // Check user (if specified)
    if (broader.userId && broader.userId !== narrower.userId) {
        return false;
    }

    // Check client (if specified)
    if (broader.clientId && broader.clientId !== narrower.clientId) {
        return false;
    }

    return true;
}

/**
 * Merge two access scopes (intersection)
 */
export function mergeScopes(scope1: AccessScope, scope2: AccessScope): AccessScope {
    return {
        organizationId: scope1.organizationId ?? scope2.organizationId,
        userId: scope1.userId ?? scope2.userId,
        clientId: scope1.clientId ?? scope2.clientId,
    };
}
