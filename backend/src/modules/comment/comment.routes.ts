import { Router } from 'express';
import { commentController } from './comment.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { validate, validationRules } from '../../common/middlewares/validation.middleware';
import { requireTaskRole } from '../task/task-rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get comments for a task
router.get(
  '/tasks/:taskId/comments',
  requireTaskRole('GUEST'),
  commentController.getAllByTask
);

// Create comment on task
router.post(
  '/tasks/:taskId/comments',
  requireTaskRole('GUEST'),
  validate(validationRules.createComment),
  commentController.create
);

// Update comment
router.patch(
  '/comments/:commentId',
  validate(validationRules.updateComment),
  commentController.update
);

// Delete comment
router.delete(
  '/comments/:commentId',
  commentController.delete
);

export default router;
