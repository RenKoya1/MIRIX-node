/**
 * Base schemas for Mirix TypeScript
 * Converted from: mirix/schemas/mirix_base.py
 */
import { z } from 'zod';
/**
 * Generate a prefixed ID
 */
export declare function generateId(prefix: string): string;
/**
 * Generate an ID regex pattern for validation
 */
export declare function idRegexPattern(prefix: string): RegExp;
/**
 * Create an ID schema for a given prefix
 */
export declare function createIdSchema(prefix: string): z.ZodDefault<z.ZodString>;
/**
 * Base metadata fields for ORM entities
 */
export declare const OrmMetadataBaseSchema: z.ZodObject<{
    createdById: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lastUpdatedById: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    updatedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
}, "strip", z.ZodTypeAny, {
    createdById?: string | null | undefined;
    lastUpdatedById?: string | null | undefined;
    createdAt?: Date | null | undefined;
    updatedAt?: Date | null | undefined;
}, {
    createdById?: string | null | undefined;
    lastUpdatedById?: string | null | undefined;
    createdAt?: Date | null | undefined;
    updatedAt?: Date | null | undefined;
}>;
export type OrmMetadataBase = z.infer<typeof OrmMetadataBaseSchema>;
/**
 * Common ID prefixes
 */
export declare const IdPrefix: {
    readonly AGENT: "agent";
    readonly USER: "user";
    readonly CLIENT: "client";
    readonly ORGANIZATION: "org";
    readonly MESSAGE: "msg";
    readonly BLOCK: "block";
    readonly TOOL: "tool";
    readonly FILE: "file";
    readonly STEP: "step";
    readonly JOB: "job";
    readonly RUN: "run";
    readonly EPISODIC_MEMORY: "em";
    readonly SEMANTIC_MEMORY: "sm";
    readonly PROCEDURAL_MEMORY: "pm";
    readonly RESOURCE_MEMORY: "rm";
    readonly KNOWLEDGE: "kn";
    readonly API_KEY: "sk";
    readonly PROVIDER: "prov";
};
export type IdPrefix = (typeof IdPrefix)[keyof typeof IdPrefix];
//# sourceMappingURL=mirix_base.d.ts.map