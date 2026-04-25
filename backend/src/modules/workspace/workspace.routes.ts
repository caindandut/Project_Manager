import { Router } from 'express';
import { workspaceController } from './workspace.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import {
  requireGuest,
  requireOwner,
} from '../../common/middlewares/rbac.middleware';
import { validate, validationRules } from '../../common/middlewares/validation.middleware';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  validate(validationRules.createWorkspace),
  workspaceController.create,
);

router.get('/', workspaceController.getAll);

router.get(
  '/:workspaceId',
  requireGuest,
  workspaceController.getById,
);

router.patch(
  '/:workspaceId',
  requireOwner,
  validate(validationRules.updateWorkspace),
  workspaceController.update,
);

router.delete(
  '/:workspaceId',
  requireOwner,
  workspaceController.delete,
);

router.get(
  '/:workspaceId/members',
  requireGuest,
  workspaceController.getMembers,
);

router.post(
  '/:workspaceId/members',
  requireOwner,
  validate(validationRules.inviteMember),
  workspaceController.inviteMember,
);

router.delete(
  '/:workspaceId/members/me',
  requireGuest,
  workspaceController.leave,
);

router.patch(
  '/:workspaceId/members/:memberId',
  requireOwner,
  validate(validationRules.updateMemberRole),
  workspaceController.updateMemberRole,
);

router.delete(
  '/:workspaceId/members/:memberId',
  requireOwner,
  workspaceController.removeMember,
);

export default router;
