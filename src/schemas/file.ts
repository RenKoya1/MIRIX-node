/**
 * File Metadata Schema
 * Converted from: mirix/schemas/file.py
 */

import { z } from 'zod';
import { generateId } from './mirix_base';

/**
 * ID prefix for files
 */
const FILE_ID_PREFIX = 'file';

/**
 * Generate a file ID
 */
export function generateFileId(): string {
    return generateId(FILE_ID_PREFIX);
}

/**
 * File Metadata Schema
 *
 * Representation of a single FileMetadata.
 */
export const FileMetadataSchema = z.object({
    /** The unique identifier of the file */
    id: z.string().default(() => generateFileId()).describe('The unique identifier of the file'),

    /** The unique identifier of the client associated with the document */
    clientId: z.string().nullable().optional().describe('The unique identifier of the client associated with the document'),

    /** The unique identifier of the organization associated with the document */
    organizationId: z.string().nullable().optional().describe('The unique identifier of the organization associated with the document'),

    /** The unique identifier of the source associated with the file */
    sourceId: z.string().nullable().optional().describe('The unique identifier of the source associated with the file'),

    /** The name of the file */
    fileName: z.string().nullable().optional().describe('The name of the file'),

    /** The path to the file on the local filesystem */
    filePath: z.string().nullable().optional().describe('The path to the file on the local filesystem'),

    /** The URL of the remote file (for files not stored locally) */
    sourceUrl: z.string().nullable().optional().describe('The URL of the remote file (for files not stored locally)'),

    /** The Google Cloud URI for files stored in Google Cloud (e.g., Google Gemini files) */
    googleCloudUrl: z.string().nullable().optional().describe('The Google Cloud URI for files stored in Google Cloud'),

    /** The type of the file (MIME type) */
    fileType: z.string().nullable().optional().describe('The type of the file (MIME type)'),

    /** The size of the file in bytes */
    fileSize: z.number().nullable().optional().describe('The size of the file in bytes'),

    /** The creation date of the file */
    fileCreationDate: z.string().nullable().optional().describe('The creation date of the file'),

    /** The last modified date of the file */
    fileLastModifiedDate: z.string().nullable().optional().describe('The last modified date of the file'),

    // ORM metadata, optional fields
    /** The creation date of the file record */
    createdAt: z.date().nullable().optional().default(() => new Date()).describe('The creation date of the file record'),

    /** The update date of the file record */
    updatedAt: z.date().nullable().optional().default(() => new Date()).describe('The update date of the file record'),

    /** Whether this file is deleted or not */
    isDeleted: z.boolean().default(false).describe('Whether this file is deleted or not'),
});

export type FileMetadata = z.infer<typeof FileMetadataSchema>;
