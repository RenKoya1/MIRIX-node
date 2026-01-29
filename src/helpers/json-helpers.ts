/**
 * JSON Helpers
 * Utilities for JSON serialization with special type handling
 */

// ============================================================================
// JSON SERIALIZATION
// ============================================================================

/**
 * Custom JSON serializer that handles special types
 */
export function jsonStringify(
    value: unknown,
    space?: number
): string {
    return JSON.stringify(value, jsonReplacer, space);
}

/**
 * Custom JSON deserializer
 */
export function jsonParse<T = unknown>(text: string): T {
    return JSON.parse(text, jsonReviver) as T;
}

/**
 * JSON replacer function for serialization
 */
function jsonReplacer(_key: string, value: unknown): unknown {
    // Handle Date objects
    if (value instanceof Date) {
        return value.toISOString();
    }

    // Handle BigInt
    if (typeof value === 'bigint') {
        return value.toString();
    }

    // Handle Map
    if (value instanceof Map) {
        return Object.fromEntries(value);
    }

    // Handle Set
    if (value instanceof Set) {
        return Array.from(value);
    }

    // Handle undefined in arrays
    if (value === undefined) {
        return null;
    }

    return value;
}

/**
 * JSON reviver function for deserialization
 */
function jsonReviver(_key: string, value: unknown): unknown {
    // Try to parse ISO date strings
    if (typeof value === 'string') {
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
        if (isoDateRegex.test(value)) {
            return new Date(value);
        }
    }

    return value;
}

// ============================================================================
// ROBUST JSON PARSING
// ============================================================================

/**
 * Parse JSON with fallback strategies for malformed JSON
 */
export function parseJsonRobust<T = unknown>(text: string): T | null {
    // Strategy 1: Standard parsing
    try {
        return JSON.parse(text) as T;
    } catch {
        // Continue to next strategy
    }

    // Strategy 2: Try to fix common issues
    try {
        const fixed = fixMalformedJson(text);
        return JSON.parse(fixed) as T;
    } catch {
        // Continue to next strategy
    }

    // Strategy 3: Extract JSON from text
    try {
        const extracted = extractJsonFromText(text);
        if (extracted) {
            return JSON.parse(extracted) as T;
        }
    } catch {
        // Failed all strategies
    }

    return null;
}

/**
 * Attempt to fix common JSON malformations
 */
function fixMalformedJson(text: string): string {
    let fixed = text.trim();

    // Remove trailing commas before } or ]
    fixed = fixed.replace(/,\s*([\]}])/g, '$1');

    // Fix single quotes to double quotes
    fixed = fixed.replace(/'/g, '"');

    // Fix unquoted keys
    fixed = fixed.replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    // Remove comments
    fixed = fixed.replace(/\/\/[^\n]*/g, '');
    fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');

    return fixed;
}

/**
 * Extract JSON object or array from text
 */
function extractJsonFromText(text: string): string | null {
    // Try to find JSON object
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
        return objectMatch[0];
    }

    // Try to find JSON array
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
        return arrayMatch[0];
    }

    return null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely get nested property from object
 */
export function getNestedProperty(
    obj: Record<string, unknown>,
    path: string,
    defaultValue?: unknown
): unknown {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
        if (current === null || current === undefined) {
            return defaultValue;
        }
        if (typeof current !== 'object') {
            return defaultValue;
        }
        current = (current as Record<string, unknown>)[key];
    }

    return current ?? defaultValue;
}

/**
 * Deep clone an object using JSON serialization
 */
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if a string is valid JSON
 */
export function isValidJson(text: string): boolean {
    try {
        JSON.parse(text);
        return true;
    } catch {
        return false;
    }
}

/**
 * Pretty print JSON
 */
export function prettyJson(value: unknown): string {
    return jsonStringify(value, 2);
}

/**
 * Compact JSON (no whitespace)
 */
export function compactJson(value: unknown): string {
    return jsonStringify(value);
}
