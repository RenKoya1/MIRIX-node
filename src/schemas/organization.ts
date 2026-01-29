/**
 * Organization Schema
 * Converted from: mirix/schemas/organization.py
 */

import { z } from 'zod';
import { IdPrefix, generateId } from './mirix_base';

/**
 * Generate an organization ID with short UUID format
 */
export function generateOrganizationId(): string {
    const uuid = generateId(IdPrefix.ORGANIZATION);
    // Extract first 8 hex characters after the prefix
    const parts = uuid.split('-');
    return `org-${parts[1].substring(0, 8)}`;
}

/**
 * Organization Schema
 *
 * Representation of an organization.
 */
export const OrganizationSchema = z.object({
    /** The unique identifier of the organization */
    id: z.string().default(() => generateOrganizationId()).describe('The unique identifier of the organization'),

    /** The name of the organization. Server will generate if not provided */
    name: z.string().nullable().optional().describe('The name of the organization. Server will generate if not provided'),

    /** The creation date of the organization */
    createdAt: z.date().nullable().optional().default(() => new Date()).describe('The creation date of the organization'),
});

export type Organization = z.infer<typeof OrganizationSchema>;

/**
 * Organization Create Schema
 *
 * Schema for creating a new organization.
 */
export const OrganizationCreateSchema = z.object({
    /** The unique identifier of the organization (optional, will be generated if not provided) */
    id: z.string().nullable().optional().describe('The unique identifier of the organization'),

    /** The name of the organization */
    name: z.string().nullable().optional().describe('The name of the organization'),
});

export type OrganizationCreate = z.infer<typeof OrganizationCreateSchema>;
