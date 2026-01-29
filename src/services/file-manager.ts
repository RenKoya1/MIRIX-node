/**
 * File Manager
 * Provides CRUD operations for file metadata and cloud file mappings
 */

import { FileMetadata, CloudFileMapping, Prisma } from '@prisma/client';
import { BaseManager, CacheConfig, ActorContext, ListOptions, ListResult } from './base-manager';
import { ValidationError } from '../errors';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateFileInput {
    organizationId: string;
    sourceId?: string;
    fileName?: string;
    filePath?: string;
    sourceUrl?: string;
    googleCloudUrl?: string;
    fileType?: string;
    fileSize?: number;
    fileCreationDate?: string;
    fileLastModifiedDate?: string;
    clientId?: string;
}

export interface UpdateFileInput {
    fileName?: string;
    filePath?: string;
    sourceUrl?: string;
    googleCloudUrl?: string;
    fileType?: string;
    fileSize?: number;
}

export interface FileListOptions extends ListOptions {
    fileType?: string;
    clientId?: string;
}

export interface CreateCloudMappingInput {
    organizationId: string;
    cloudFileId: string;
    localFileId: string;
    status: string;
    timestamp: string;
}

export interface UpdateCloudMappingInput {
    status?: string;
    timestamp?: string;
}

// ============================================================================
// FILE MANAGER
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

class FileManager extends BaseManager<
    FileMetadata,
    CreateFileInput,
    UpdateFileInput
> {
    protected readonly modelName = 'FileMetadata';

    protected readonly cacheConfig: CacheConfig = {
        enabled: true,
        prefix: 'file:',
        ttl: 1800,
        useHash: true,
    };

    protected getDelegate(): AnyDelegate {
        return this.prisma.fileMetadata;
    }

    async create(
        data: CreateFileInput,
        actor?: ActorContext
    ): Promise<FileMetadata> {
        const org = await this.prisma.organization.findUnique({
            where: { id: data.organizationId },
        });
        if (!org) {
            throw new ValidationError('Organization not found', { field: 'organizationId' });
        }

        return super.create(data, actor);
    }

    async findBySourceId(
        sourceId: string,
        organizationId: string
    ): Promise<FileMetadata | null> {
        return this.getDelegate().findFirst({
            where: {
                sourceId,
                organizationId,
                isDeleted: false,
            },
        });
    }

    async listFiles(
        actor: ActorContext,
        options: FileListOptions = {}
    ): Promise<ListResult<FileMetadata>> {
        const {
            cursor,
            limit = 50,
            sort = { field: 'createdAt', order: 'desc' },
            startDate,
            endDate,
            includeDeleted = false,
            fileType,
            clientId,
        } = options;

        const where: Prisma.FileMetadataWhereInput = {
            organizationId: actor.organizationId,
        };

        if (!includeDeleted) {
            where.isDeleted = false;
        }

        if (fileType) {
            where.fileType = fileType;
        }

        if (clientId) {
            where.clientId = clientId;
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }

        let cursorClause = undefined;
        if (cursor) {
            cursorClause = { id: cursor };
        }

        const [items, total] = await Promise.all([
            this.getDelegate().findMany({
                where,
                orderBy: { [sort.field]: sort.order },
                take: limit + 1,
                skip: cursor ? 1 : 0,
                cursor: cursorClause,
            }),
            this.getDelegate().count({ where }),
        ]);

        const hasMore = items.length > limit;
        if (hasMore) items.pop();

        const nextCursor = hasMore && items.length > 0
            ? items[items.length - 1].id
            : undefined;

        return { items, total, hasMore, nextCursor };
    }

    async getTotalStorageUsed(
        organizationId: string
    ): Promise<number> {
        const result = await this.getDelegate().aggregate({
            where: {
                organizationId,
                isDeleted: false,
            },
            _sum: {
                fileSize: true,
            },
        });

        return result._sum.fileSize ?? 0;
    }

    // ========================================================================
    // CLOUD FILE MAPPING METHODS
    // ========================================================================

    async createCloudMapping(
        data: CreateCloudMappingInput,
        actor?: ActorContext
    ): Promise<CloudFileMapping> {
        return this.prisma.cloudFileMapping.create({
            data: {
                id: `cfm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                cloudFileId: data.cloudFileId,
                localFileId: data.localFileId,
                status: data.status,
                timestamp: data.timestamp,
                organization: { connect: { id: data.organizationId } },
                createdById: actor?.id,
                lastUpdatedById: actor?.id,
            },
        });
    }

    async getCloudMappingByCloudId(
        cloudFileId: string,
        organizationId: string
    ): Promise<CloudFileMapping | null> {
        return this.prisma.cloudFileMapping.findFirst({
            where: {
                cloudFileId,
                organizationId,
                isDeleted: false,
            },
        });
    }

    async updateCloudMappingStatus(
        id: string,
        status: string,
        actor?: ActorContext
    ): Promise<CloudFileMapping> {
        return this.prisma.cloudFileMapping.update({
            where: { id },
            data: {
                status,
                timestamp: new Date().toISOString(),
                updatedAt: new Date(),
                lastUpdatedById: actor?.id,
            },
        });
    }

    protected prepareCreateData(
        data: CreateFileInput,
        actor?: ActorContext
    ): Prisma.FileMetadataCreateInput {
        return {
            sourceId: data.sourceId,
            fileName: data.fileName,
            filePath: data.filePath,
            sourceUrl: data.sourceUrl,
            googleCloudUrl: data.googleCloudUrl,
            fileType: data.fileType,
            fileSize: data.fileSize,
            fileCreationDate: data.fileCreationDate,
            fileLastModifiedDate: data.fileLastModifiedDate,
            organization: data.organizationId
                ? { connect: { id: data.organizationId } }
                : undefined,
            client: data.clientId
                ? { connect: { id: data.clientId } }
                : undefined,
            createdById: actor?.id,
            lastUpdatedById: actor?.id,
        };
    }

    protected prepareUpdateData(
        data: UpdateFileInput,
        actor?: ActorContext
    ): Prisma.FileMetadataUpdateInput {
        const updateData: Prisma.FileMetadataUpdateInput = {
            updatedAt: new Date(),
            lastUpdatedById: actor?.id,
        };

        if (data.fileName !== undefined) updateData.fileName = data.fileName;
        if (data.filePath !== undefined) updateData.filePath = data.filePath;
        if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl;
        if (data.googleCloudUrl !== undefined) updateData.googleCloudUrl = data.googleCloudUrl;
        if (data.fileType !== undefined) updateData.fileType = data.fileType;
        if (data.fileSize !== undefined) updateData.fileSize = data.fileSize;

        return updateData;
    }
}

export const fileManager = new FileManager();
export default fileManager;
