import { Router } from 'express';
import { projectController } from './project.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import {
  requireGuest,
  requireMember,
} from '../../common/middlewares/rbac.middleware';
import { requireProjectAdmin } from '../../common/middlewares/project-rbac.middleware';
import { validate, validationRules } from '../../common/middlewares/validation.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all projects in workspace
router.get(
  '/:workspaceId/projects',
  requireGuest,
  projectController.getAll
);

// Get archived (soft-deleted) projects in workspace - ADMIN only
router.get(
  '/:workspaceId/projects/archived',
  requireMember,
  projectController.getArchived
);

// Get project by ID
router.get(
  '/:workspaceId/projects/:projectId',
  requireGuest,
  projectController.getById
);

// Create project (Owner or Member)
router.post(
  '/:workspaceId/projects',
  requireMember,
  validate(validationRules.createProject),
  projectController.create
);

// Restore archived project (Workspace Member or above - project-level RBAC skipped since project is deleted)
router.post(
  '/:workspaceId/projects/:projectId/restore',
  requireMember,
  projectController.restore
);

// Update project (Owner or Member)
router.patch(
  '/:workspaceId/projects/:projectId',
  requireGuest,
  requireProjectAdmin,
  validate(validationRules.updateProject),
  projectController.update
);

// Delete project (Project Admin only)
router.delete(
  '/:workspaceId/projects/:projectId',
  requireGuest,
  requireProjectAdmin,
  projectController.delete
);

export default router;
