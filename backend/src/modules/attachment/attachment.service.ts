import path from 'path';
import fs from 'fs';
import { attachmentRepository } from './attachment.repository';
import { BaseService } from '../../common/base/BaseService';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { logger } from '../../common/utils/logger';
import { config } from '../../config';
import { PaginationMeta, ListOptions } from '../../types/interfaces';
import { ALLOWED_MIME_TYPES, FILE_SIZE_LIMITS } from '../../config/constants';

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

export class AttachmentService extends BaseService<
  unknown,
  UploadAttachmentInput,
  unknown
> {
  private readonly UPLOAD_DIR = config.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

  async upload(data: UploadAttachmentInput) {
    const { file, taskId, uploadedById } = data;

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw ApiError.badRequest(
        ErrorCode.ATTACHMENT_INVALID_TYPE,
        `File type ${file.mimetype} is not allowed`,
      );
    }

    const maxSize = FILE_SIZE_LIMITS.DOCUMENT;
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
    } as any);

    logger.info(`Attachment uploaded: ${attachment.id} for task ${taskId}`);

    return this.formatAttachment(attachment);
  }

  async getById(id: number) {
    const attachment = await attachmentRepository.findById(id);
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
  ) {
    const result = await attachmentRepository.findByTaskId(taskId, options);

    return {
      data: result.data.map((a: any) => this.formatAttachment(a, a.uploadedBy)),
      meta: {
        ...(options?.cursor ? { cursor: options.cursor } : {}),
        limit: options?.limit || 20,
        hasMore: result.data.length === (options?.limit || 20),
        total: result.total,
      },
    };
  }

  async delete(id: number, userId: number) {
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

    const filePath = path.join(process.cwd(), attachment.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await attachmentRepository.softDelete(id);
    logger.info(`Attachment deleted: ${id}`);

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

    return {
      path: path.join(process.cwd(), attachment.fileUrl),
      filename: attachment.fileName,
    };
  }

  private formatAttachment(attachment: any, uploader?: any) {
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

  getAll(_options?: ListOptions): Promise<{ data: unknown[]; meta?: PaginationMeta }> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  create(_data: UploadAttachmentInput): Promise<unknown> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  update(_id: number, _data: unknown, ..._args: unknown[]): Promise<unknown> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }
}

export const attachmentService = new AttachmentService();
