import { Router } from 'express';
import multer from 'multer';
import { attachmentController } from './attachment.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { requireTaskRole } from '../task/task-rbac.middleware';
import { requireAttachmentRole } from './attachment-rbac.middleware';

const router = Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

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
