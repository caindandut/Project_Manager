import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { requireGuest } from '../../common/middlewares/rbac.middleware';
import { myTasksController } from './my-tasks.controller';

const router = Router();

router.use(authMiddleware);

router.get(
  '/:workspaceId/my-tasks',
  requireGuest,
  myTasksController.getWorkspaceMyTasks,
);

export default router;
