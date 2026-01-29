/**
 * DateTime Helpers
 * Utilities for time parsing and formatting
 */

// ============================================================================
// TIME FUNCTIONS
// ============================================================================

/**
 * Get current time in a specific timezone
 */
export function getLocalTime(timezone = 'Asia/Tokyo'): Date {
    const now = new Date();
    // Create formatter for the timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const values: Record<string, string> = {};
    for (const part of parts) {
        values[part.type] = part.value;
    }

    return new Date(
        `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`
    );
}

/**
 * Get current UTC time
 */
export function getUtcTime(): Date {
    return new Date();
}

/**
 * Convert datetime to Unix timestamp (seconds)
 */
export function datetimeToTimestamp(date: Date): number {
    return Math.floor(date.getTime() / 1000);
}

/**
 * Convert Unix timestamp to Date
 */
export function timestampToDatetime(timestamp: number): Date {
    return new Date(timestamp * 1000);
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDateFormat(dateStr: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) {
        return false;
    }

    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

/**
 * Extract date string from Date object
 */
export function extractDateFromTimestamp(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Check if datetime is in UTC
 */
export function isUtcDatetime(date: Date): boolean {
    const isoString = date.toISOString();
    return isoString.endsWith('Z');
}

/**
 * Format date to ISO string
 */
export function formatIsoDate(date: Date): string {
    return date.toISOString();
}

/**
 * Parse ISO date string
 */
export function parseIsoDate(dateStr: string): Date {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date string: ${dateStr}`);
    }
    return date;
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
        return 'just now';
    } else if (diffMin < 60) {
        return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    } else if (diffHour < 24) {
        return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    } else if (diffDay < 30) {
        return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Add hours to a date
 */
export function addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setTime(result.getTime() + hours * 60 * 60 * 1000);
    return result;
}

/**
 * Get start of day
 */
export function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

/**
 * Get end of day
 */
export function endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}
