import { Router } from 'express';
import { taskController } from './task.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { requireOwnerOrMember } from '../../common/middlewares/rbac.middleware';
import { validate, validationRules } from '../../common/middlewares/validation.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all tasks in project
router.get(
  '/:workspaceId/projects/:projectId/tasks',
  requireOwnerOrMember,
  taskController.getAll
);

// Create task in project
router.post(
  '/:workspaceId/projects/:projectId/tasks',
  requireOwnerOrMember,
  validate(validationRules.createTask),
  taskController.create
);

// Get task by ID
router.get(
  '/:workspaceId/tasks/:taskId',
  requireOwnerOrMember,
  taskController.getById
);

// Get subtasks of a task
router.get(
  '/:workspaceId/tasks/:taskId/subtasks',
  requireOwnerOrMember,
  taskController.getSubTasks
);

// Create subtask
router.post(
  '/:workspaceId/tasks/:taskId/subtasks',
  requireOwnerOrMember,
  validate(validationRules.createTask),
  taskController.createSubTask
);

// Update task
router.patch(
  '/:workspaceId/tasks/:taskId',
  requireOwnerOrMember,
  validate(validationRules.updateTask),
  taskController.update
);

// Delete task (cascades to subtasks)
router.delete(
  '/:workspaceId/tasks/:taskId',
  requireOwnerOrMember,
  taskController.delete
);

// Log time on task
router.post(
  '/:workspaceId/tasks/:taskId/time-log',
  requireOwnerOrMember,
  validate(validationRules.timeLog),
  taskController.logTime
);

export default router;
