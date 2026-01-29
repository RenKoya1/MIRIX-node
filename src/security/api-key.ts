/**
 * API Key Utilities
 * Functions for generating and validating API keys
 */

import { createHash, randomBytes } from 'crypto';

// ============================================================================
// API KEY GENERATION
// ============================================================================

/**
 * Generate a new API key
 */
export function generateApiKey(prefix = 'mk'): {
    key: string;
    hash: string;
} {
    // Generate random bytes
    const bytes = randomBytes(32);

    // Create the key with prefix
    const key = `${prefix}_${bytes.toString('base64url')}`;

    // Hash the key for storage
    const hash = hashApiKey(key);

    return { key, hash };
}

/**
 * Hash an API key for secure storage
 */
export function hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
}

/**
 * Verify an API key against its hash
 */
export function verifyApiKey(key: string, hash: string): boolean {
    const computedHash = hashApiKey(key);
    return computedHash === hash;
}

/**
 * Extract the prefix from an API key
 */
export function getApiKeyPrefix(key: string): string | null {
    const match = key.match(/^([a-z]+)_/);
    return match ? match[1] : null;
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
    // Format: prefix_base64urlChars
    const regex = /^[a-z]+_[A-Za-z0-9_-]{32,64}$/;
    return regex.test(key);
}

// ============================================================================
// API KEY TYPES
// ============================================================================

export const ApiKeyPrefix = {
    /** Main API key */
    MAIN: 'mk',
    /** Test API key */
    TEST: 'tk',
    /** Admin API key */
    ADMIN: 'ak',
    /** Webhook API key */
    WEBHOOK: 'wk',
} as const;

export type ApiKeyPrefix = (typeof ApiKeyPrefix)[keyof typeof ApiKeyPrefix];

/**
 * Get API key type from prefix
 */
export function getApiKeyType(key: string): string | null {
    const prefix = getApiKeyPrefix(key);
    if (!prefix) return null;

    for (const [type, p] of Object.entries(ApiKeyPrefix)) {
        if (p === prefix) return type.toLowerCase();
    }

    return null;
}

// ============================================================================
// API KEY MASKING
// ============================================================================

/**
 * Mask an API key for display (show only first and last 4 characters)
 */
export function maskApiKey(key: string): string {
    if (key.length <= 12) {
        return '*'.repeat(key.length);
    }

    const prefix = key.slice(0, 6);
    const suffix = key.slice(-4);
    const masked = '*'.repeat(key.length - 10);

    return `${prefix}${masked}${suffix}`;
}

/**
 * Partially reveal an API key (for verification purposes)
 */
export function partialReveal(key: string): string {
    const prefix = getApiKeyPrefix(key);
    if (!prefix) return maskApiKey(key);

    // Show prefix and last 4 characters
    const suffix = key.slice(-4);
    return `${prefix}_${'*'.repeat(20)}${suffix}`;
}
