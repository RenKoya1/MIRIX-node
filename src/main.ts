/**
 * MIRIX Server Entry Point
 * Starts the REST API server and background workers
 */

import { startServer } from './server/index';
import { queueWorker } from './queue/index';
import { connectDatabase, disconnectDatabase } from './database/index';
import { getLogger } from './log';

const logger = getLogger('main');

async function main(): Promise<void> {
    const port = parseInt(process.env.PORT ?? '3000', 10);

    try {
        // Connect to database
        logger.info('Connecting to database...');
        await connectDatabase();

        // Start queue worker
        logger.info('Starting queue worker...');
        await queueWorker.start();

        // Start REST API server
        logger.info({ port }, 'Starting server...');
        await startServer(port);

        logger.info({ port }, 'MIRIX server started successfully');
    } catch (error) {
        logger.error({ error }, 'Failed to start MIRIX server');
        process.exit(1);
    }
}

// Graceful shutdown
async function shutdown(): Promise<void> {
    logger.info('Shutting down...');

    try {
        await queueWorker.stop();
        await disconnectDatabase();
        logger.info('Shutdown complete');
    } catch (error) {
        logger.error({ error }, 'Error during shutdown');
    }

    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
main().catch((error) => {
    logger.error({ error }, 'Unhandled error in main');
    process.exit(1);
});
