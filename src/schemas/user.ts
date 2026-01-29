/**
 * User Schema
 * Converted from: mirix/schemas/user.py
 */

import { z } from 'zod';
import { IdPrefix, generateId } from './mirix_base';
import { DEFAULT_ORG_ID } from '../constants';

/**
 * Generate a user ID with short UUID format
 */
export function generateUserId(): string {
    const shortId = generateId(IdPrefix.USER).split('-').slice(0, 2).join('-').substring(0, 13);
    return shortId.startsWith('user-') ? shortId : `user-${shortId.substring(5)}`;
}

/**
 * User Schema
 *
 * Representation of a user.
 */
export const UserSchema = z.object({
    /** The unique identifier of the user */
    id: z.string().describe('The unique identifier of the user'),

    /** The organization id of the user */
    organizationId: z.string().nullable().default(DEFAULT_ORG_ID).describe('The organization id of the user'),

    /** The client this user belongs to */
    clientId: z.string().nullable().optional().describe('The client this user belongs to'),

    /** The name of the user */
    name: z.string().describe('The name of the user'),

    /** Whether the user is active or not */
    status: z.string().default('active').describe('Whether the user is active or not'),

    /** The timezone of the user */
    timezone: z.string().describe('The timezone of the user'),

    /** Whether this is an admin user for the client */
    isAdmin: z.boolean().default(false).describe('Whether this is an admin user for the client'),

    /** The creation date of the user */
    createdAt: z.date().nullable().optional().default(() => new Date()).describe('The creation date of the user'),

    /** The update date of the user */
    updatedAt: z.date().nullable().optional().default(() => new Date()).describe('The update date of the user'),

    /** Whether this user is deleted or not */
    isDeleted: z.boolean().default(false).describe('Whether this user is deleted or not'),

    /** The last time self-reflection was performed for this user */
    lastSelfReflectionTime: z.date().nullable().optional().describe('The last time self-reflection was performed for this user'),
});

export type User = z.infer<typeof UserSchema>;

/**
 * User Create Schema
 *
 * Schema for creating a new user.
 */
export const UserCreateSchema = z.object({
    /** The unique identifier of the user (optional, will be generated if not provided) */
    id: z.string().nullable().optional().describe('The unique identifier of the user'),

    /** The name of the user */
    name: z.string().describe('The name of the user'),

    /** Whether the user is active or not */
    status: z.string().default('active').describe('Whether the user is active or not'),

    /** The timezone of the user */
    timezone: z.string().describe('The timezone of the user'),

    /** The organization id of the user */
    organizationId: z.string().describe('The organization id of the user'),
});

export type UserCreate = z.infer<typeof UserCreateSchema>;

/**
 * User Update Schema
 *
 * Schema for updating an existing user.
 */
export const UserUpdateSchema = z.object({
    /** The id of the user to update */
    id: z.string().describe('The id of the user to update'),

    /** The new name of the user */
    name: z.string().nullable().optional().describe('The new name of the user'),

    /** The new status of the user */
    status: z.string().nullable().optional().describe('The new status of the user'),

    /** The new timezone of the user */
    timezone: z.string().nullable().optional().describe('The new timezone of the user'),

    /** The new organization id of the user */
    organizationId: z.string().nullable().optional().describe('The new organization id of the user'),

    /** The last time self-reflection was performed for this user */
    lastSelfReflectionTime: z.date().nullable().optional().describe('The last time self-reflection was performed for this user'),
});

export type UserUpdate = z.infer<typeof UserUpdateSchema>;
