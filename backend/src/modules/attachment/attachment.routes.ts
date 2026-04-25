import { Router } from 'express';
import multer from 'multer';
import { attachmentController } from './attachment.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { requireOwnerOrMember } from '../../common/middlewares/rbac.middleware';

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
  '/:workspaceId/tasks/:taskId/attachments',
  requireOwnerOrMember,
  attachmentController.getByTask
);

// Upload attachment to task
router.post(
  '/:workspaceId/tasks/:taskId/attachments',
  requireOwnerOrMember,
  upload.single('file'),
  attachmentController.upload
);

// Get attachment by ID
router.get(
  '/:workspaceId/tasks/:taskId/attachments/:attachmentId',
  requireOwnerOrMember,
  attachmentController.getById
);

// Download attachment
router.get(
  '/:workspaceId/tasks/:taskId/attachments/:attachmentId/download',
  requireOwnerOrMember,
  attachmentController.download
);

// Delete attachment
router.delete(
  '/:workspaceId/tasks/:taskId/attachments/:attachmentId',
  requireOwnerOrMember,
  attachmentController.delete
);

export default router;
