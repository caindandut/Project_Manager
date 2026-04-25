import { Router } from 'express';
import { reportController } from './report.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { requireOwnerOrMember } from '../../common/middlewares/rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Workspace stats
router.get(
  '/workspaces/:workspaceId/stats',
  requireOwnerOrMember,
  reportController.getWorkspaceStats
);

// Workload report
router.get(
  '/workspaces/:workspaceId/workload',
  requireOwnerOrMember,
  reportController.getWorkloadReport
);

// Project progress
router.get(
  '/projects/:projectId/progress',
  requireOwnerOrMember,
  reportController.getProjectProgress
);

// Burndown chart data
router.get(
  '/projects/:projectId/burndown',
  requireOwnerOrMember,
  reportController.getBurndownData
);

export default router;
