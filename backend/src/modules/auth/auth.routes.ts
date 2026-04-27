import { Router } from 'express';
import multer from 'multer';
import { body } from 'express-validator';
import { authController } from './auth.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { validate, validationRules } from '../../common/middlewares/validation.middleware';

const router = Router();

// Configure multer for avatar upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

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

// ─── OTP Auth Routes ──────────────────────────────────────────────────────────

router.post(
  '/send-otp',
  validate([
    body('email').isEmail().withMessage('Invalid email format'),
  ]),
  authController.sendOtp,
);

router.post(
  '/verify-otp',
  validate([
    body('email').isEmail().withMessage('Invalid email format'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ]),
  authController.verifyOtp,
);

router.post(
  '/register-with-otp',
  validate([
    body('email').isEmail().withMessage('Invalid email format'),
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('password').isLength({ min: 8, max: 100 }).withMessage('Password must be between 8 and 100 characters'),
  ]),
  authController.registerWithOtp,
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

// Upload avatar
router.post(
  '/me/avatar',
  authMiddleware,
  upload.single('avatar'),
  authController.uploadAvatar,
);

router.post(
  '/change-password',
  authMiddleware,
  validate(validationRules.changePassword),
  authController.changePassword,
);

router.post(
  '/complete-onboarding',
  authMiddleware,
  validate([
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('password').optional().isLength({ min: 8, max: 100 }),
    body('workspaceName').trim().isLength({ min: 1, max: 100 }),
    body('workspaceSlug').trim().isLength({ min: 1, max: 50 }).matches(/^[a-z0-9-]+$/),
  ]),
  authController.completeOnboarding,
);

export default router;
