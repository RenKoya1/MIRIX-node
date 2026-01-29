/**
 * Source Schema
 * Converted from: mirix/schemas/source.py
 */

import { z } from 'zod';
import { generateId } from './mirix_base';
import { EmbeddingConfigSchema } from './memory';

/**
 * ID prefix for sources
 */
const SOURCE_ID_PREFIX = 'source';

/**
 * Generate a source ID
 */
export function generateSourceId(): string {
    return generateId(SOURCE_ID_PREFIX);
}

/**
 * Source Schema
 *
 * Representation of a source, which is a collection of files and passages.
 */
export const SourceSchema = z.object({
    /** The ID of the source */
    id: z.string().default(() => generateSourceId()).describe('The ID of the source'),

    /** The name of the source */
    name: z.string().describe('The name of the source'),

    /** The description of the source */
    description: z.string().nullable().optional().describe('The description of the source'),

    /** The embedding configuration used by the source */
    embeddingConfig: EmbeddingConfigSchema.describe('The embedding configuration used by the source'),

    /** The ID of the organization that created the source */
    organizationId: z.string().nullable().optional().describe('The ID of the organization that created the source'),

    /** Metadata associated with the source */
    metadata: z.record(z.unknown()).nullable().optional().describe('Metadata associated with the source'),

    // Metadata fields
    /** The id of the user that created this source */
    createdById: z.string().nullable().optional().describe('The id of the user that created this source'),

    /** The id of the user that last updated this source */
    lastUpdatedById: z.string().nullable().optional().describe('The id of the user that last updated this source'),

    /** The timestamp when the source was created */
    createdAt: z.date().nullable().optional().describe('The timestamp when the source was created'),

    /** The timestamp when the source was last updated */
    updatedAt: z.date().nullable().optional().describe('The timestamp when the source was last updated'),
});

export type Source = z.infer<typeof SourceSchema>;

/**
 * Source Create Schema
 *
 * Schema for creating a new source.
 */
export const SourceCreateSchema = z.object({
    /** The name of the source */
    name: z.string().describe('The name of the source'),

    /** The embedding configuration used by the source (optional) */
    embeddingConfig: EmbeddingConfigSchema.nullable().optional().describe('The embedding configuration used by the source'),

    /** The description of the source */
    description: z.string().nullable().optional().describe('The description of the source'),

    /** Metadata associated with the source */
    metadata: z.record(z.unknown()).nullable().optional().describe('Metadata associated with the source'),
});

export type SourceCreate = z.infer<typeof SourceCreateSchema>;

/**
 * Source Update Schema
 *
 * Schema for updating an existing source.
 */
export const SourceUpdateSchema = z.object({
    /** The name of the source */
    name: z.string().nullable().optional().describe('The name of the source'),

    /** The description of the source */
    description: z.string().nullable().optional().describe('The description of the source'),

    /** Metadata associated with the source */
    metadata: z.record(z.unknown()).nullable().optional().describe('Metadata associated with the source'),

    /** The embedding configuration used by the source */
    embeddingConfig: EmbeddingConfigSchema.nullable().optional().describe('The embedding configuration used by the source'),
});

export type SourceUpdate = z.infer<typeof SourceUpdateSchema>;
