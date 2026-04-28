import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { attachmentController } from './attachment.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { requireTaskRole } from '../task/task-rbac.middleware';
import { requireAttachmentRole } from './attachment-rbac.middleware';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { FILE_SIZE_LIMITS } from '../../config/constants';

const router = Router();

// Configure multer for file upload - use 50MB limit (matches ARCHIVE limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_SIZE_LIMITS.ARCHIVE, // 50MB
  },
});

// Multer error handler middleware
const handleMulterError = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      throw ApiError.badRequest(
        ErrorCode.ATTACHMENT_FILE_TOO_LARGE,
        `File size exceeds maximum limit of ${FILE_SIZE_LIMITS.ARCHIVE / 1024 / 1024}MB`
      );
    }
    throw ApiError.badRequest(ErrorCode.ATTACHMENT_UPLOAD_FAILED, err.message);
  }
  next(err);
};

// All routes require authentication
router.use(authMiddleware);

// Get attachments for a task
router.get(
  '/tasks/:taskId/attachments',
  requireTaskRole('GUEST'),
  attachmentController.getByTask
);

// Upload attachment to task
router.post(
  '/tasks/:taskId/attachments',
  requireTaskRole('GUEST'),
  upload.single('file'),
  handleMulterError,
  attachmentController.upload
);

// Get attachment by ID / download attachment
router.get(
  '/attachments/:attachmentId',
  requireAttachmentRole('GUEST'),
  attachmentController.download
);

// Delete attachment
router.delete(
  '/attachments/:attachmentId',
  requireAttachmentRole('GUEST'),
  attachmentController.delete
);

export default router;
