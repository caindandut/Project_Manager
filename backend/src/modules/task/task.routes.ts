import { Router } from 'express';
import { taskController } from './task.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { validate, validationRules } from '../../common/middlewares/validation.middleware';
import { requireProjectTaskRole, requireTaskRole } from './task-rbac.middleware';

const router = Router();

router.use(authMiddleware);

router.get(
  '/projects/:projectId/tasks',
  requireProjectTaskRole('GUEST'),
  taskController.getAll,
);

router.post(
  '/projects/:projectId/tasks',
  requireProjectTaskRole('MEMBER'),
  validate(validationRules.createTask),
  taskController.create,
);

router.get(
  '/tasks/:taskId',
  requireTaskRole('GUEST'),
  taskController.getById,
);

router.patch(
  '/tasks/:taskId',
  requireTaskRole('MEMBER'),
  validate(validationRules.updateTask),
  taskController.update,
);

router.delete(
  '/tasks/:taskId',
  requireTaskRole('MEMBER'),
  taskController.delete,
);

router.post(
  '/tasks/:taskId/subtasks',
  requireTaskRole('MEMBER'),
  validate(validationRules.createTask),
  taskController.createSubTask,
);

router.patch(
  '/tasks/:taskId/status',
  requireTaskRole('MEMBER'),
  validate(validationRules.updateTaskStatus),
  taskController.updateStatus,
);

router.patch(
  '/tasks/:taskId/assignee',
  requireTaskRole('MEMBER'),
  validate(validationRules.assignTask),
  taskController.assign,
);

router.post(
  '/tasks/:taskId/time-log',
  requireTaskRole('MEMBER'),
  validate(validationRules.timeLog),
  taskController.logTime,
);

export default router;
