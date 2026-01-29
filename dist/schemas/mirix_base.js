/**
 * Base schemas for Mirix TypeScript
 * Converted from: mirix/schemas/mirix_base.py
 */
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
/**
 * Generate a prefixed ID
 */
export function generateId(prefix) {
    return `${prefix}-${uuidv4()}`;
}
/**
 * Generate an ID regex pattern for validation
 */
export function idRegexPattern(prefix) {
    return new RegExp(`^${prefix}-[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$`);
}
/**
 * Create an ID schema for a given prefix
 */
export function createIdSchema(prefix) {
    return z
        .string()
        .regex(idRegexPattern(prefix), `ID must be in format: ${prefix}-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
        .default(() => generateId(prefix));
}
/**
 * Base metadata fields for ORM entities
 */
export const OrmMetadataBaseSchema = z.object({
    createdById: z.string().nullable().optional(),
    lastUpdatedById: z.string().nullable().optional(),
    createdAt: z.date().nullable().optional(),
    updatedAt: z.date().nullable().optional(),
});
/**
 * Common ID prefixes
 */
export const IdPrefix = {
    AGENT: 'agent',
    USER: 'user',
    CLIENT: 'client',
    ORGANIZATION: 'org',
    MESSAGE: 'msg',
    BLOCK: 'block',
    TOOL: 'tool',
    FILE: 'file',
    STEP: 'step',
    JOB: 'job',
    RUN: 'run',
    EPISODIC_MEMORY: 'em',
    SEMANTIC_MEMORY: 'sm',
    PROCEDURAL_MEMORY: 'pm',
    RESOURCE_MEMORY: 'rm',
    KNOWLEDGE: 'kn',
    API_KEY: 'sk',
    PROVIDER: 'prov',
};
//# sourceMappingURL=mirix_base.js.map