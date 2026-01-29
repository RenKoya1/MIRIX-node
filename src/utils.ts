/**
 * Utils Module
 * Comprehensive utility functions for MIRIX
 * Converted from: mirix/utils.py
 */

import { createHash, randomUUID } from 'crypto';
import path from 'path';
import {
    TOOL_CALL_ID_MAX_LEN,
    MAX_FILENAME_LENGTH,
    MAX_ERROR_MESSAGE_CHAR_LIMIT,
    ERROR_MESSAGE_PREFIX,
    CLI_WARNING_PREFIX,
} from './constants';
import { logger } from './log';

// ============================================================================
// VERBOSE/DEBUG SETTINGS
// ============================================================================

const DEBUG = process.env.LOG_LEVEL === 'DEBUG';

let VERBOSE = (process.env.MIRIX_VERBOSE ?? 'true').toLowerCase() === 'true' ||
    process.env.MIRIX_VERBOSE === '1';

/**
 * Get verbose setting
 */
export function getVerbose(): boolean {
    return VERBOSE;
}

/**
 * Set verbose setting
 */
export function setVerbose(value: boolean): void {
    VERBOSE = value;
}

// ============================================================================
// WORD BANKS FOR RANDOM NAMES
// ============================================================================

const ADJECTIVE_BANK = [
    'beautiful', 'gentle', 'angry', 'vivacious', 'grumpy', 'luxurious', 'fierce',
    'delicate', 'fluffy', 'radiant', 'elated', 'magnificent', 'sassy', 'ecstatic',
    'lustrous', 'gleaming', 'sorrowful', 'majestic', 'proud', 'dynamic', 'energetic',
    'mysterious', 'loyal', 'brave', 'decisive', 'frosty', 'cheerful', 'adorable',
    'melancholy', 'vibrant', 'elegant', 'gracious', 'inquisitive', 'opulent',
    'peaceful', 'rebellious', 'scintillating', 'dazzling', 'whimsical', 'impeccable',
    'meticulous', 'resilient', 'charming', 'creative', 'intuitive', 'compassionate',
    'innovative', 'enthusiastic', 'tremendous', 'effervescent', 'tenacious',
    'fearless', 'sophisticated', 'witty', 'optimistic', 'exquisite', 'sincere',
    'generous', 'kindhearted', 'serene', 'amiable', 'adventurous', 'bountiful',
    'courageous', 'diligent', 'exotic', 'grateful', 'harmonious', 'imaginative',
    'jubilant', 'keen', 'luminous', 'nurturing', 'outgoing', 'passionate', 'quaint',
    'resourceful', 'sturdy', 'tactful', 'unassuming', 'versatile', 'wondrous',
    'youthful', 'zealous',
];

const NOUN_BANK = [
    'lizard', 'firefighter', 'banana', 'castle', 'dolphin', 'elephant', 'forest',
    'giraffe', 'harbor', 'iceberg', 'jewelry', 'kangaroo', 'library', 'mountain',
    'notebook', 'orchard', 'penguin', 'quilt', 'rainbow', 'squirrel', 'teapot',
    'umbrella', 'volcano', 'waterfall', 'xylophone', 'yacht', 'zebra', 'apple',
    'butterfly', 'caterpillar', 'dragonfly', 'flamingo', 'gorilla', 'hippopotamus',
    'iguana', 'jellyfish', 'koala', 'lemur', 'mongoose', 'nighthawk', 'octopus',
    'panda', 'quokka', 'rhinoceros', 'salamander', 'tortoise', 'unicorn', 'vulture',
    'walrus', 'yak', 'asteroid', 'balloon', 'compass', 'dinosaur', 'eagle',
    'firefly', 'galaxy', 'hedgehog', 'island', 'jaguar', 'kettle', 'lion',
    'mammoth', 'nucleus', 'owl', 'pumpkin', 'quasar', 'reindeer', 'snail', 'tiger',
    'universe', 'wombat', 'alligator', 'buffalo', 'cactus', 'donkey', 'emerald',
    'falcon', 'gazelle', 'hamster', 'icicle', 'jackal', 'kitten', 'leopard',
    'mushroom', 'narwhal', 'opossum', 'peacock', 'quail', 'rabbit', 'scorpion',
    'toucan', 'urchin', 'viper', 'wolf',
];

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

/**
 * Remove duplicates from an array while preserving order
 */
export function deduplicate<T>(list: T[]): T[] {
    const seen = new Set<T>();
    const result: T[] = [];

    for (const item of list) {
        if (!seen.has(item)) {
            seen.add(item);
            result.push(item);
        }
    }

    return result;
}

// ============================================================================
// URL UTILITIES
// ============================================================================

/**
 * Smart URL join that handles trailing slashes properly
 */
export function smartUrljoin(baseUrl: string, relativeUrl: string): string {
    if (!baseUrl.endsWith('/')) {
        baseUrl += '/';
    }
    return new URL(relativeUrl, baseUrl).toString();
}

/**
 * Check if a URL is valid
 */
export function isValidUrl(url: string): boolean {
    try {
        const result = new URL(url);
        return Boolean(result.protocol && result.host);
    } catch {
        return false;
    }
}

// ============================================================================
// DATETIME UTILITIES
// ============================================================================

/**
 * Check if a Date object is in UTC timezone
 */
export function isUtcDatetime(dt: Date): boolean {
    return dt.getTimezoneOffset() === 0;
}

/**
 * Get current UTC time
 */
export function getUtcTime(): Date {
    return new Date();
}

/**
 * Get current UTC time as ISO string
 */
export function getUtcTimeIso(): string {
    return new Date().toISOString();
}

/**
 * Format datetime to string
 */
export function formatDatetime(dt: Date): string {
    return dt.toISOString().replace('T', ' ').replace('Z', ' UTC+0000');
}

/**
 * Get local time with optional timezone
 */
export function getLocalTime(timezone?: string): string {
    const now = new Date();

    if (timezone) {
        return now.toLocaleString('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZoneName: 'short',
        });
    }

    return now.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZoneName: 'short',
    });
}

/**
 * Convert datetime to timestamp
 */
export function datetimeToTimestamp(dt: Date): number {
    return Math.floor(dt.getTime() / 1000);
}

/**
 * Convert timestamp to datetime
 */
export function timestampToDatetime(ts: number): Date {
    return new Date(ts * 1000);
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDateFormat(dateStr: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;

    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

/**
 * Extract date from timestamp string
 */
export function extractDateFromTimestamp(timestamp: string): string | null {
    const match = timestamp.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
}

// ============================================================================
// ID/UUID UTILITIES
// ============================================================================

/**
 * Generate a tool call ID
 */
export function getToolCallId(): string {
    return randomUUID().replace(/-/g, '').slice(0, TOOL_CALL_ID_MAX_LEN);
}

/**
 * Create UUID from string (consistent hashing)
 */
export function createUuidFromString(val: string): string {
    const hash = createHash('md5').update(val).digest('hex');
    return [
        hash.slice(0, 8),
        hash.slice(8, 12),
        hash.slice(12, 16),
        hash.slice(16, 20),
        hash.slice(20, 32),
    ].join('-');
}

// ============================================================================
// VERSION UTILITIES
// ============================================================================

/**
 * Compare versions to check if version_a is less than version_b
 */
export function versionLessThan(versionA: string, versionB: string): boolean {
    const versionPattern = /^\d+\.\d+\.\d+$/;

    if (!versionPattern.test(versionA) || !versionPattern.test(versionB)) {
        throw new Error("Version strings must be in the format 'int.int.int'");
    }

    const partsA = versionA.split('.').map(Number);
    const partsB = versionB.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
        if (partsA[i] < partsB[i]) return true;
        if (partsA[i] > partsB[i]) return false;
    }

    return false;
}

// ============================================================================
// NAME GENERATION
// ============================================================================

/**
 * Generate a random username by combining an adjective and a noun
 */
export function createRandomUsername(): string {
    const adjective = ADJECTIVE_BANK[Math.floor(Math.random() * ADJECTIVE_BANK.length)];
    const noun = NOUN_BANK[Math.floor(Math.random() * NOUN_BANK.length)];

    return (
        adjective.charAt(0).toUpperCase() + adjective.slice(1) +
        noun.charAt(0).toUpperCase() + noun.slice(1)
    );
}

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

/**
 * Debug print (only when DEBUG is enabled)
 */
export function printd(...args: unknown[]): void {
    if (DEBUG) {
        logger.debug(args.join(' '));
    }
}

/**
 * Verbose print (only when VERBOSE is enabled)
 */
export function printv(...args: unknown[]): void {
    if (getVerbose()) {
        logger.info(args.join(' '));
    }
}

// ============================================================================
// STRING/DIFF UTILITIES
// ============================================================================

/**
 * Generate unified diff between two strings (simple implementation)
 */
export function unitedDiff(str1: string, str2: string): string {
    const lines1 = str1.split('\n');
    const lines2 = str2.split('\n');
    const result: string[] = [];

    // Simple line-by-line comparison
    const maxLen = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLen; i++) {
        const line1 = lines1[i];
        const line2 = lines2[i];

        if (line1 === undefined && line2 !== undefined) {
            result.push(`+${line2}`);
        } else if (line1 !== undefined && line2 === undefined) {
            result.push(`-${line1}`);
        } else if (line1 !== line2) {
            result.push(`-${line1}`);
            result.push(`+${line2}`);
        } else {
            result.push(` ${line1}`);
        }
    }

    return result.join('\n');
}

// ============================================================================
// JSON UTILITIES
// ============================================================================

/**
 * Parse JSON with error handling
 */
export function jsonLoads(data: string): unknown {
    return JSON.parse(data);
}

/**
 * Stringify JSON with formatting
 */
export function jsonDumps(data: unknown, indent: number = 2): string {
    return JSON.stringify(data, null, indent);
}

/**
 * Parse JSON with multiple fallback strategies
 */
export function parseJson(str: string): Record<string, unknown> {
    // Try standard JSON parse
    try {
        return JSON.parse(str);
    } catch (e) {
        logger.debug(`Error parsing json with JSON.parse: ${e}`);
    }

    // Try to fix common JSON issues
    try {
        // Remove trailing commas
        const fixed = str
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            // Fix single quotes
            .replace(/'/g, '"')
            // Remove comments
            .replace(/\/\/.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '');

        return JSON.parse(fixed);
    } catch (e) {
        logger.error(`Error parsing json after fixes: ${e}`);
        throw e;
    }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate and potentially truncate function response
 */
export function validateFunctionResponse(
    functionResponseString: unknown,
    returnCharLimit: number,
    strict: boolean = false,
    truncate: boolean = true
): string {
    let response: string;

    if (typeof functionResponseString !== 'string') {
        if (functionResponseString === null || functionResponseString === undefined) {
            response = 'None';
        } else if (typeof functionResponseString === 'object') {
            if (strict) {
                throw new Error(`Invalid function response: ${JSON.stringify(functionResponseString)}`);
            }
            try {
                response = JSON.stringify(functionResponseString);
            } catch {
                throw new Error(`Invalid function response: ${functionResponseString}`);
            }
        } else {
            if (strict) {
                throw new Error(`Invalid function response: ${functionResponseString}`);
            }
            try {
                response = String(functionResponseString);
            } catch {
                throw new Error(`Invalid function response: ${functionResponseString}`);
            }
        }
    } else {
        response = functionResponseString;
    }

    // Truncate if necessary
    if (truncate && response.length > returnCharLimit) {
        logger.debug(
            `${CLI_WARNING_PREFIX}function return was over limit (${response.length} > ${returnCharLimit}) and was truncated`
        );
        response = `${response.slice(0, returnCharLimit)}... [NOTE: function output was truncated since it exceeded the character limit (${response.length} > ${returnCharLimit})]`;
    }

    return response;
}

// ============================================================================
// FILENAME UTILITIES
// ============================================================================

/**
 * Sanitize filename to prevent directory traversal and invalid characters
 */
export function sanitizeFilename(filename: string): string {
    // Extract base filename
    filename = path.basename(filename);

    // Split base and extension
    const ext = path.extname(filename);
    let base = path.basename(filename, ext);

    // Remove invalid characters
    base = base
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\.\./g, '')
        .replace(/^\.+/, '');

    if (!base) {
        throw new Error('Invalid filename - derived file name is empty');
    }

    // Truncate the base name
    const maxBaseLength = MAX_FILENAME_LENGTH - ext.length - 33; // 32 for UUID + 1 for '_'
    if (base.length > maxBaseLength) {
        base = base.slice(0, maxBaseLength);
    }

    // Append unique suffix
    const uniqueSuffix = randomUUID().replace(/-/g, '');
    return `${base}_${uniqueSuffix}${ext}`;
}

// ============================================================================
// ERROR UTILITIES
// ============================================================================

/**
 * Get friendly error message
 */
export function getFriendlyErrorMsg(
    functionName: string,
    exceptionName: string,
    exceptionMessage: string
): string {
    let errorMsg = `${ERROR_MESSAGE_PREFIX} executing function ${functionName}: ${exceptionName}: ${exceptionMessage}`;

    if (errorMsg.length > MAX_ERROR_MESSAGE_CHAR_LIMIT) {
        errorMsg = errorMsg.slice(0, MAX_ERROR_MESSAGE_CHAR_LIMIT);
    }

    return errorMsg;
}

// ============================================================================
// TYPE UTILITIES
// ============================================================================

/**
 * Check if value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge objects deeply
 */
export function deepMerge<T extends Record<string, unknown>>(
    target: T,
    ...sources: Partial<T>[]
): T {
    const result = { ...target };

    for (const source of sources) {
        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                const sourceValue = source[key];
                const targetValue = result[key];

                if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
                    (result as Record<string, unknown>)[key] = deepMerge(
                        targetValue as Record<string, unknown>,
                        sourceValue as Record<string, unknown>
                    );
                } else {
                    (result as Record<string, unknown>)[key] = sourceValue;
                }
            }
        }
    }

    return result;
}

// ============================================================================
// ASYNC UTILITIES
// ============================================================================

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 30000
): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
            logger.debug(`Retry attempt ${attempt + 1}/${maxRetries} failed, waiting ${delay}ms`);
            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Run multiple promises with concurrency limit
 */
export async function runWithConcurrency<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    concurrency: number
): Promise<R[]> {
    const results: R[] = [];
    const executing: Promise<void>[] = [];

    for (const item of items) {
        const p = Promise.resolve().then(async () => {
            const result = await fn(item);
            results.push(result);
        });

        executing.push(p);

        if (executing.length >= concurrency) {
            await Promise.race(executing);
            executing.splice(
                executing.findIndex(p => p === Promise.resolve()),
                1
            );
        }
    }

    await Promise.all(executing);
    return results;
}

// ============================================================================
// TOKEN COUNTING (Placeholder)
// ============================================================================

/**
 * Estimate token count (rough approximation)
 * Note: For accurate token counting, use tiktoken or similar library
 */
export function estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
}

/**
 * Count tokens (placeholder - requires tiktoken integration)
 */
export function countTokens(text: string, _model: string = 'gpt-4'): number {
    // TODO: Integrate with js-tiktoken for accurate counting
    return estimateTokenCount(text);
}
