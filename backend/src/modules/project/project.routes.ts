import { Router } from 'express';
import { projectController } from './project.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import {
  requireGuest,
  requireOwner,
  requireMember,
} from '../../common/middlewares/rbac.middleware';
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

// Update project (Owner or Member)
router.patch(
  '/:workspaceId/projects/:projectId',
  requireMember,
  validate(validationRules.updateProject),
  projectController.update
);

// Delete project (Owner only)
router.delete(
  '/:workspaceId/projects/:projectId',
  requireOwner,
  projectController.delete
);

export default router;
