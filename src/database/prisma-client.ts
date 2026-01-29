/**
 * Prisma Client Singleton
 * Provides a singleton instance of PrismaClient with connection management
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../log';

// Global reference to the Prisma client for development hot-reloading
declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

/**
 * Create a new Prisma client instance
 */
function createPrismaClient(): PrismaClient {
    const client = new PrismaClient({
        log:
            process.env.NODE_ENV === 'development'
                ? ['query', 'error', 'warn']
                : ['error'],
        errorFormat: 'pretty',
    });

    return client;
}

/**
 * Get the singleton Prisma client instance
 * Uses global variable in development to persist across hot-reloads
 */
function getPrismaClient(): PrismaClient {
    if (process.env.NODE_ENV === 'production') {
        return createPrismaClient();
    }

    // In development, use global variable to persist across hot-reloads
    if (!global.__prisma) {
        global.__prisma = createPrismaClient();
    }

    return global.__prisma;
}

// Singleton instance
export const prismaRaw = getPrismaClient();

// Extended client alias (for now, same as raw)
export const prisma = prismaRaw;

// Export type for extended client
export type ExtendedPrismaClient = typeof prisma;

/**
 * Connect to the database
 */
export async function connectDatabase(): Promise<void> {
    try {
        await prismaRaw.$connect();
        logger.info('Connected to database');
    } catch (error) {
        logger.error({ error }, 'Failed to connect to database');
        throw error;
    }
}

/**
 * Disconnect from the database
 */
export async function disconnectDatabase(): Promise<void> {
    try {
        await prismaRaw.$disconnect();
        logger.info('Disconnected from database');
    } catch (error) {
        logger.error({ error }, 'Failed to disconnect from database');
        throw error;
    }
}

/**
 * Execute a function within a transaction
 */
export async function withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: {
        maxWait?: number;
        timeout?: number;
    }
): Promise<T> {
    return prismaRaw.$transaction(fn, {
        maxWait: options?.maxWait ?? 5000,
        timeout: options?.timeout ?? 10000,
    });
}

/**
 * Health check for database connection
 */
export async function healthCheck(): Promise<boolean> {
    try {
        await prismaRaw.$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        logger.error({ error }, 'Database health check failed');
        return false;
    }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
    connected: boolean;
    tables: string[];
}> {
    try {
        const tables = await prismaRaw.$queryRaw<{ tablename: string }[]>`
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
        `;
        return {
            connected: true,
            tables: tables.map((t) => t.tablename),
        };
    } catch (error) {
        logger.error({ error }, 'Failed to get database stats');
        return {
            connected: false,
            tables: [],
        };
    }
}

export default prisma;
