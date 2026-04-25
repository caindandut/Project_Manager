import { Router } from 'express';
import { commentController } from './comment.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { requireOwnerOrMember } from '../../common/middlewares/rbac.middleware';
import { validate, validationRules } from '../../common/middlewares/validation.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get comments for a task
router.get(
  '/:workspaceId/tasks/:taskId/comments',
  requireOwnerOrMember,
  commentController.getAllByTask
);

// Create comment on task
router.post(
  '/:workspaceId/tasks/:taskId/comments',
  requireOwnerOrMember,
  validate(validationRules.createComment),
  commentController.create
);

// Get comment by ID
router.get(
  '/:workspaceId/tasks/:taskId/comments/:commentId',
  requireOwnerOrMember,
  commentController.getById
);

// Update comment
router.patch(
  '/:workspaceId/tasks/:taskId/comments/:commentId',
  requireOwnerOrMember,
  validate(validationRules.updateComment),
  commentController.update
);

// Delete comment
router.delete(
  '/:workspaceId/tasks/:taskId/comments/:commentId',
  requireOwnerOrMember,
  commentController.delete
);

export default router;
