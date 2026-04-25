import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from './auth.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { validate, validationRules } from '../../common/middlewares/validation.middleware';

const router = Router();

// ─── Google OAuth ──────────────────────────────────────────────────────────────

router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

// ─── Public routes ─────────────────────────────────────────────────────────────

router.post(
  '/register',
  validate(validationRules.register),
  authController.register,
);

router.post(
  '/login',
  validate(validationRules.login),
  authController.login,
);

router.post('/refresh', authController.refresh);

router.post(
  '/forgot-password',
  validate(validationRules.forgotPassword),
  authController.forgotPassword,
);

router.post(
  '/reset-password',
  validate(validationRules.resetPassword),
  authController.resetPassword,
);

// ─── Protected routes ─────────────────────────────────────────────────────────

router.post('/logout', authMiddleware, authController.logout);

router.get('/me', authMiddleware, authController.me);

router.patch(
  '/me',
  authMiddleware,
  validate([
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('bio').optional().trim().isLength({ max: 1000 }).withMessage('Bio must be at most 1000 characters'),
    body('avatar').optional().trim().isURL().withMessage('Avatar must be a valid URL'),
  ]),
  authController.updateProfile,
);

router.post(
  '/change-password',
  authMiddleware,
  validate(validationRules.changePassword),
  authController.changePassword,
);

export default router;
