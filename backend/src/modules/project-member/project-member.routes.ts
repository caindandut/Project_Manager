import { Router } from 'express';
import { projectMemberController } from './project-member.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { validate, validationRules } from '../../common/middlewares/validation.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/v1/projects/:projectId/members
router.get(
  '/:projectId/members',
  projectMemberController.getMembers,
);

// POST /api/v1/projects/:projectId/members
router.post(
  '/:projectId/members',
  validate(validationRules.addProjectMember),
  projectMemberController.addMember,
);

// PATCH /api/v1/projects/:projectId/members/:memberId
router.patch(
  '/:projectId/members/:memberId',
  validate(validationRules.updateProjectMemberRole),
  projectMemberController.updateRole,
);

// DELETE /api/v1/projects/:projectId/members/:memberId
router.delete(
  '/:projectId/members/:memberId',
  projectMemberController.removeMember,
);

export default router;
