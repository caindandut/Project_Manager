import path from 'path';
import fs from 'fs';
import { Attachment, Prisma } from '@prisma/client';
import { attachmentRepository, AttachmentWithUploader } from './attachment.repository';
import { BaseService } from '../../common/base/BaseService';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { logger } from '../../common/utils/logger';
import { config } from '../../config';
import { PaginationMeta, ListOptions } from '../../types/interfaces';
import { ALLOWED_MIME_TYPES, FILE_SIZE_LIMITS } from '../../config/constants';
import { prisma } from '../../config';

export interface UploadAttachmentInput {
  taskId: number;
  uploadedById: number;
  file: {
    originalname: string;
    buffer: Buffer;
    mimetype: string;
    size: number;
  };
}

interface AttachmentResponse {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  taskId: number;
  uploadedById: number;
  createdAt: Date;
  uploadedBy?: {
    id: number;
    name: string | null;
    avatar: string | null;
  };
}

type AttachmentServiceResponse = AttachmentResponse | { message: string };

export class AttachmentService extends BaseService<
  AttachmentServiceResponse,
  UploadAttachmentInput,
  unknown
> {
  private readonly UPLOAD_DIR = config.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

  async upload(data: UploadAttachmentInput): Promise<AttachmentResponse> {
    const { file, taskId, uploadedById } = data;

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw ApiError.badRequest(
        ErrorCode.ATTACHMENT_INVALID_TYPE,
        `File type ${file.mimetype} is not allowed`,
      );
    }

    const maxSize = FILE_SIZE_LIMITS.ARCHIVE;
    if (file.size > maxSize) {
      throw ApiError.badRequest(
        ErrorCode.ATTACHMENT_FILE_TOO_LARGE,
        `File size exceeds maximum limit of ${maxSize / 1024 / 1024}MB`,
      );
    }

    const taskDir = path.join(this.UPLOAD_DIR, String(taskId));
    if (!fs.existsSync(taskDir)) {
      fs.mkdirSync(taskDir, { recursive: true });
    }

    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const filePath = path.join(taskDir, filename);
    const fileUrl = `/uploads/${taskId}/${filename}`;

    fs.writeFileSync(filePath, file.buffer);

    const attachment = await attachmentRepository.create({
      fileName: file.originalname,
      fileUrl,
      fileSize: file.size,
      mimeType: file.mimetype,
      task: { connect: { id: data.taskId } },
      uploadedBy: { connect: { id: data.uploadedById } },
    });
    const fullAttachment = await attachmentRepository.findByIdWithUploader(attachment.id);

    if (!fullAttachment) {
      throw ApiError.notFound(
        ErrorCode.ATTACHMENT_NOT_FOUND,
        'Attachment not found',
      );
    }

    logger.info(`Attachment uploaded: ${attachment.id} for task ${taskId}`);

    await this.logActivity(attachment.id, taskId, uploadedById, 'ATTACHMENT_UPLOAD', {
      fileName: file.originalname,
    });

    return this.formatAttachment(fullAttachment);
  }

  async getById(id: number): Promise<AttachmentResponse> {
    const attachment = await attachmentRepository.findByIdWithUploader(id);
    if (!attachment) {
      throw ApiError.notFound(
        ErrorCode.ATTACHMENT_NOT_FOUND,
        'Attachment not found',
      );
    }

    return this.formatAttachment(attachment);
  }

  async getByTask(
    taskId: number,
    options?: { page?: number; limit?: number; cursor?: string },
  ): Promise<{ data: AttachmentResponse[]; meta: PaginationMeta }> {
    const result = await attachmentRepository.findByTaskId(taskId, options);
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    return {
      data: result.data.map((attachment) => this.formatAttachment(attachment)),
      meta: this.buildPaginationMeta(result.total, page, limit),
    };
  }

  async delete(id: number, userId: number): Promise<{ message: string }> {
    const attachment = await attachmentRepository.findById(id);
    if (!attachment) {
      throw ApiError.notFound(
        ErrorCode.ATTACHMENT_NOT_FOUND,
        'Attachment not found',
      );
    }

    if (attachment.uploadedById !== userId) {
      throw ApiError.forbidden(
        ErrorCode.FORBIDDEN_ACCESS,
        'You can only delete your own attachments',
      );
    }

    const filePath = this.getLocalPathFromUrl(attachment.fileUrl);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await attachmentRepository.softDelete(id);
    logger.info(`Attachment deleted: ${id}`);

    await this.logActivity(id, attachment.taskId, userId, 'ATTACHMENT_DELETE', {
      fileName: attachment.fileName,
    });

    return { message: 'Attachment deleted successfully' };
  }

  async getDownloadPath(id: number): Promise<{ path: string; filename: string }> {
    const attachment = await attachmentRepository.findById(id);
    if (!attachment) {
      throw ApiError.notFound(
        ErrorCode.ATTACHMENT_NOT_FOUND,
        'Attachment not found',
      );
    }

    const filePath = this.getLocalPathFromUrl(attachment.fileUrl);
    if (!filePath) {
      throw ApiError.badRequest(
        ErrorCode.ATTACHMENT_UPLOAD_FAILED,
        'Attachment uses remote storage and cannot be downloaded from local disk',
      );
    }

    return {
      path: filePath,
      filename: attachment.fileName,
    };
  }

  private formatAttachment(
    attachment: Attachment | AttachmentWithUploader,
  ): AttachmentResponse {
    const uploader = 'uploadedBy' in attachment ? attachment.uploadedBy : undefined;

    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      taskId: attachment.taskId,
      uploadedById: attachment.uploadedById,
      createdAt: attachment.createdAt,
      uploadedBy: uploader
        ? {
            id: uploader.id,
            name: uploader.name,
            avatar: uploader.avatar,
          }
        : undefined,
    };
  }

  private getLocalPathFromUrl(fileUrl: string): string | null {
    if (/^https?:\/\//i.test(fileUrl)) {
      return null;
    }

    const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
    return path.join(process.cwd(), relativePath);
  }

  private async logActivity(
    attachmentId: number,
    taskId: number,
    userId: number,
    action: string,
    extraData: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          action,
          entityType: 'ATTACHMENT',
          entityId: attachmentId,
          taskId,
          userId,
          metadata: {
            attachmentId,
            ...extraData,
          } as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      logger.error('Failed to log attachment activity', err);
    }
  }

  getAll(
    _options?: ListOptions,
  ): Promise<{ data: AttachmentServiceResponse[]; meta?: PaginationMeta }> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  create(_data: UploadAttachmentInput): Promise<AttachmentServiceResponse> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  update(_id: number, _data: unknown, ..._args: unknown[]): Promise<AttachmentServiceResponse> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }
}

export const attachmentService = new AttachmentService();
