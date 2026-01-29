/**
 * Client Schema
 * Converted from: mirix/schemas/client.py
 */

import { z } from 'zod';
import { IdPrefix, generateId } from './mirix_base';
import { DEFAULT_ORG_ID } from '../constants';

/**
 * Generate a client ID with short UUID format
 */
export function generateClientId(): string {
    const uuid = generateId(IdPrefix.CLIENT);
    // Extract first 8 hex characters after the prefix
    const parts = uuid.split('-');
    return `client-${parts[1].substring(0, 8)}`;
}

/**
 * Client scope options
 */
export const ClientScope = {
    READ: 'read',
    WRITE: 'write',
    READ_WRITE: 'read_write',
    ADMIN: 'admin',
} as const;

export type ClientScope = (typeof ClientScope)[keyof typeof ClientScope];

/**
 * Client Schema
 *
 * Representation of a client application.
 */
export const ClientSchema = z.object({
    /** The unique identifier of the client */
    id: z.string().default(() => generateClientId()).describe('The unique identifier of the client'),

    /** The organization id of the client */
    organizationId: z.string().nullable().default(DEFAULT_ORG_ID).describe('The organization id of the client'),

    /** The name of the client application */
    name: z.string().describe('The name of the client application'),

    /** Whether the client is active or not */
    status: z.string().default('active').describe('Whether the client is active or not'),

    /** Scope of client (read, write, read_write, admin) */
    scope: z.string().default('read_write').describe('Scope of client'),

    // Dashboard authentication fields
    /** Email address for dashboard login */
    email: z.string().nullable().optional().describe('Email address for dashboard login'),

    /** Hashed password for dashboard login */
    passwordHash: z.string().nullable().optional().describe('Hashed password for dashboard login'),

    /** Last dashboard login time */
    lastLogin: z.date().nullable().optional().describe('Last dashboard login time'),

    /** Available credits for LLM API calls. New clients start with $10. 1 credit = 1 dollar */
    credits: z.number().default(10.0).describe('Available credits for LLM API calls. New clients start with $10. 1 credit = 1 dollar'),

    /** The creation date of the client */
    createdAt: z.date().nullable().optional().default(() => new Date()).describe('The creation date of the client'),

    /** The update date of the client */
    updatedAt: z.date().nullable().optional().default(() => new Date()).describe('The update date of the client'),

    /** Whether this client is deleted or not */
    isDeleted: z.boolean().default(false).describe('Whether this client is deleted or not'),
});

export type Client = z.infer<typeof ClientSchema>;

/**
 * Client Create Schema
 *
 * Schema for creating a new client.
 */
export const ClientCreateSchema = z.object({
    /** The unique identifier of the client (optional, will be generated if not provided) */
    id: z.string().nullable().optional().describe('The unique identifier of the client'),

    /** The name of the client application */
    name: z.string().describe('The name of the client application'),

    /** Whether the client is active or not */
    status: z.string().default('active').describe('Whether the client is active or not'),

    /** Scope of client */
    scope: z.string().default('read_write').describe('Scope of client'),

    /** The organization id of the client */
    organizationId: z.string().describe('The organization id of the client'),
});

export type ClientCreate = z.infer<typeof ClientCreateSchema>;

/**
 * Client Update Schema
 *
 * Schema for updating an existing client.
 */
export const ClientUpdateSchema = z.object({
    /** The id of the client to update */
    id: z.string().describe('The id of the client to update'),

    /** The new name of the client */
    name: z.string().nullable().optional().describe('The new name of the client'),

    /** The new status of the client */
    status: z.string().nullable().optional().describe('The new status of the client'),

    /** The new scope of the client */
    scope: z.string().nullable().optional().describe('The new scope of the client'),

    /** The new organization id of the client */
    organizationId: z.string().nullable().optional().describe('The new organization id of the client'),

    /** The new credits balance for the client. 1 credit = 1 dollar */
    credits: z.number().nullable().optional().describe('The new credits balance for the client. 1 credit = 1 dollar'),
});

export type ClientUpdate = z.infer<typeof ClientUpdateSchema>;
