/**
 * Tracing Module
 * OpenTelemetry tracing support for Mirix
 * Converted from: mirix/tracing.py
 */

import { Context, MiddlewareHandler } from 'hono';
import { logger } from './log.js';

// ============================================================================
// TYPES
// ============================================================================

export interface SpanContext {
    traceId: string;
    spanId: string;
    traceFlags: number;
}

export interface Span {
    name: string;
    context: SpanContext;
    startTime: number;
    endTime?: number;
    status: SpanStatus;
    attributes: Record<string, AttributeValue>;
    events: SpanEvent[];
    kind: SpanKind;
}

export type AttributeValue = string | number | boolean | string[] | number[] | boolean[];

export interface SpanEvent {
    name: string;
    timestamp: number;
    attributes?: Record<string, AttributeValue>;
}

export enum SpanStatus {
    OK = 'OK',
    ERROR = 'ERROR',
    UNSET = 'UNSET',
}

export enum SpanKind {
    INTERNAL = 'INTERNAL',
    SERVER = 'SERVER',
    CLIENT = 'CLIENT',
    PRODUCER = 'PRODUCER',
    CONSUMER = 'CONSUMER',
}

export interface TracerConfig {
    endpoint?: string;
    serviceName: string;
    enabled: boolean;
}

// ============================================================================
// STATE
// ============================================================================

let isTracingInitialized = false;
let tracerConfig: TracerConfig = {
    serviceName: 'mirix-server',
    enabled: false,
};

// Excluded endpoints regex patterns
const excludedEndpointsRegex: RegExp[] = [
    /^GET \/v1\/agents\/[^/]+\/messages$/,
    /^GET \/v1\/agents\/[^/]+\/context$/,
    /^GET \/v1\/agents\/[^/]+\/archival-memory$/,
    /^GET \/v1\/agents\/[^/]+\/sources$/,
];

// Active span stack (simple implementation)
const spanStack: Span[] = [];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a random trace ID (32 hex characters)
 */
function generateTraceId(): string {
    return Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
}

/**
 * Generate a random span ID (16 hex characters)
 */
function generateSpanId(): string {
    return Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
}

/**
 * Check if running in test environment
 */
function isTestEnvironment(): boolean {
    return process.env.NODE_ENV === 'test' || process.env.VITEST !== undefined;
}

// ============================================================================
// SPAN MANAGEMENT
// ============================================================================

/**
 * Create a new span
 */
export function createSpan(
    name: string,
    kind: SpanKind = SpanKind.INTERNAL,
    parentContext?: SpanContext
): Span {
    const now = Date.now();
    const traceId = parentContext?.traceId ?? generateTraceId();

    return {
        name,
        context: {
            traceId,
            spanId: generateSpanId(),
            traceFlags: 1,
        },
        startTime: now,
        status: SpanStatus.UNSET,
        attributes: {},
        events: [],
        kind,
    };
}

/**
 * Start a new span and make it current
 */
export function startSpan(
    name: string,
    kind: SpanKind = SpanKind.INTERNAL
): Span {
    const parentContext = getCurrentSpan()?.context;
    const span = createSpan(name, kind, parentContext);
    spanStack.push(span);
    return span;
}

/**
 * End the current span
 */
export function endSpan(status: SpanStatus = SpanStatus.OK): void {
    const span = spanStack.pop();
    if (span) {
        span.endTime = Date.now();
        span.status = status;

        // Log span if tracing is enabled
        if (isTracingInitialized) {
            const duration = span.endTime - span.startTime;
            logger.debug(
                {
                    traceId: span.context.traceId,
                    spanId: span.context.spanId,
                    name: span.name,
                    duration,
                    status: span.status,
                    attributes: span.attributes,
                },
                'Span completed'
            );
        }
    }
}

/**
 * Get the current active span
 */
export function getCurrentSpan(): Span | undefined {
    return spanStack[spanStack.length - 1];
}

/**
 * Get the current trace ID
 */
export function getTraceId(): string | undefined {
    return getCurrentSpan()?.context.traceId;
}

// ============================================================================
// SPAN HELPERS
// ============================================================================

/**
 * Set an attribute on the current span
 */
export function setSpanAttribute(key: string, value: AttributeValue): void {
    const span = getCurrentSpan();
    if (span) {
        span.attributes[key] = value;
    }
}

/**
 * Set multiple attributes on the current span
 */
export function logAttributes(attributes: Record<string, AttributeValue>): void {
    const span = getCurrentSpan();
    if (span) {
        Object.assign(span.attributes, attributes);
    }
}

/**
 * Add an event to the current span
 */
export function logEvent(
    name: string,
    attributes?: Record<string, AttributeValue>,
    timestamp?: number
): void {
    const span = getCurrentSpan();
    if (span) {
        span.events.push({
            name,
            timestamp: timestamp ?? Date.now(),
            attributes,
        });
    }
}

/**
 * Record an exception on the current span
 */
export function recordException(error: Error): void {
    const span = getCurrentSpan();
    if (span) {
        span.status = SpanStatus.ERROR;
        span.events.push({
            name: 'exception',
            timestamp: Date.now(),
            attributes: {
                'exception.type': error.name,
                'exception.message': error.message,
                'exception.stacktrace': error.stack ?? '',
            },
        });
    }
}

// ============================================================================
// SETUP
// ============================================================================

/**
 * Initialize tracing
 */
export function setupTracing(config: Partial<TracerConfig> = {}): void {
    if (isTestEnvironment()) {
        logger.info('Tracing disabled in test environment');
        return;
    }

    tracerConfig = {
        serviceName: config.serviceName ?? 'mirix-server',
        endpoint: config.endpoint,
        enabled: config.enabled ?? !!config.endpoint,
    };

    if (tracerConfig.enabled && tracerConfig.endpoint) {
        isTracingInitialized = true;
        logger.info(
            { endpoint: tracerConfig.endpoint, serviceName: tracerConfig.serviceName },
            'Tracing initialized'
        );
    }
}

/**
 * Check if tracing is initialized
 */
export function isTracingEnabled(): boolean {
    return isTracingInitialized;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Hono middleware for request tracing
 */
export function traceRequestMiddleware(): MiddlewareHandler {
    return async (c: Context, next) => {
        if (!isTracingInitialized) {
            return next();
        }

        const spanName = `${c.req.method} ${c.req.path}`;

        // Check if endpoint is excluded
        if (excludedEndpointsRegex.some((regex) => regex.test(spanName))) {
            return next();
        }

        const span = startSpan(spanName, SpanKind.SERVER);

        // Add request attributes
        setSpanAttribute('http.method', c.req.method);
        setSpanAttribute('http.url', c.req.url);
        setSpanAttribute('http.path', c.req.path);

        // Add trace ID to response headers
        c.header('X-Trace-ID', span.context.traceId);

        try {
            await next();

            // Add response attributes
            setSpanAttribute('http.status_code', c.res.status);

            endSpan(c.res.status < 400 ? SpanStatus.OK : SpanStatus.ERROR);
        } catch (error) {
            if (error instanceof Error) {
                recordException(error);
            }
            endSpan(SpanStatus.ERROR);
            throw error;
        }
    };
}

// ============================================================================
// DECORATORS / WRAPPERS
// ============================================================================

/**
 * Wrap a function with tracing
 */
export function traceFunction<T extends (...args: unknown[]) => unknown>(
    name: string,
    fn: T
): T {
    const wrapped = ((...args: unknown[]) => {
        if (!isTracingInitialized) {
            return fn(...args);
        }

        startSpan(name);

        // Add parameters as attributes
        args.forEach((arg, index) => {
            if (arg !== undefined && arg !== null) {
                setSpanAttribute(`parameter.${index}`, String(arg));
            }
        });

        try {
            const result = fn(...args);

            // Handle promises
            if (result instanceof Promise) {
                return result
                    .then((value) => {
                        endSpan(SpanStatus.OK);
                        return value;
                    })
                    .catch((error) => {
                        if (error instanceof Error) {
                            recordException(error);
                        }
                        endSpan(SpanStatus.ERROR);
                        throw error;
                    });
            }

            endSpan(SpanStatus.OK);
            return result;
        } catch (error) {
            if (error instanceof Error) {
                recordException(error);
            }
            endSpan(SpanStatus.ERROR);
            throw error;
        }
    }) as T;

    return wrapped;
}

/**
 * Trace a method (decorator-style function)
 */
export function traceMethod<T extends (...args: unknown[]) => unknown>(
    _target: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value;

    if (originalMethod) {
        descriptor.value = traceFunction(propertyKey, originalMethod);
    }

    return descriptor;
}

/**
 * Execute code within a span
 */
export async function withSpan<T>(
    name: string,
    fn: () => T | Promise<T>,
    kind: SpanKind = SpanKind.INTERNAL
): Promise<T> {
    if (!isTracingInitialized) {
        return fn();
    }

    startSpan(name, kind);

    try {
        const result = await fn();
        endSpan(SpanStatus.OK);
        return result;
    } catch (error) {
        if (error instanceof Error) {
            recordException(error);
        }
        endSpan(SpanStatus.ERROR);
        throw error;
    }
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

/**
 * Create a traced error response
 */
export function createTracedErrorResponse(
    error: Error,
    _statusCode: number = 500
): { detail: string; trace_id: string } {
    const span = getCurrentSpan();
    if (span) {
        recordException(error);
    }

    return {
        detail: error.message,
        trace_id: getTraceId() ?? '',
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    setupTracing,
    isTracingEnabled,
    startSpan,
    endSpan,
    getCurrentSpan,
    getTraceId,
    setSpanAttribute,
    logAttributes,
    logEvent,
    recordException,
    traceRequestMiddleware,
    traceFunction,
    traceMethod,
    withSpan,
    createTracedErrorResponse,
};
