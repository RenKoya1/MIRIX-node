/**
 * Client Module
 * Central exports for MIRIX SDK client
 */

export {
    MirixClient,
    createMirixClient,
    MirixApiError,
} from './sdk.js';

export type {
    MirixClientConfig,
    AgentConfig,
    ChatMessage,
    ChatResponse,
    AgentInfo,
    ListResponse,
} from './sdk.js';
