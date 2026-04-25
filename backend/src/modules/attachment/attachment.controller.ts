import { Request, Response } from 'express';
import { attachmentService } from './attachment.service';
import { BaseController } from '../../common/base/BaseController';
import { AuthenticatedRequest } from '../../types/interfaces';
import { success } from '../../common/utils/apiResponse';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import path from 'path';
import fs from 'fs';

export class AttachmentController extends BaseController {
  constructor() {
    super('AttachmentController');
  }

  upload = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      if (!req.file) {
        throw ApiError.badRequest(
          ErrorCode.ATTACHMENT_UPLOAD_FAILED,
          'No file uploaded'
        );
      }

      const taskId = parseInt(req.params.taskId, 10);
      const result = await attachmentService.upload({
        taskId,
        uploadedById: authReq.user.id,
        file: {
          originalname: req.file.originalname,
          buffer: req.file.buffer,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
      });
      res.status(201).json(success(result));
    });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const attachmentId = parseInt(req.params.attachmentId || req.params.id, 10);
      const result = await attachmentService.getById(attachmentId);
      res.json(success(result));
    });
  };

  getByTask = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const taskId = parseInt(req.params.taskId, 10);
      const page = parseInt(req.query.page as string, 10) || undefined;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const cursor = req.query.cursor as string;

      const result = await attachmentService.getByTask(taskId, { page, limit, cursor });
      res.json(success(result.data, result.meta));
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const attachmentId = parseInt(req.params.attachmentId || req.params.id, 10);
      const result = await attachmentService.delete(attachmentId, authReq.user.id);
      res.json(success(result));
    });
  };

  download = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const attachmentId = parseInt(req.params.attachmentId, 10);
      const { path: filePath, filename } = await attachmentService.getDownloadPath(attachmentId);

      if (!fs.existsSync(filePath)) {
        throw ApiError.notFound(
          ErrorCode.ATTACHMENT_NOT_FOUND,
          'File not found on disk'
        );
      }

      res.download(filePath, filename);
    });
  };
}

export const attachmentController = new AttachmentController();
