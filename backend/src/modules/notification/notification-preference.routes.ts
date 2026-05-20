import { Router } from 'express';
import { notificationPreferenceController } from './notification-preference.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all notification preferences
router.get('/', notificationPreferenceController.getPreferences);

// Update preference for a specific event type
router.patch('/:eventType', notificationPreferenceController.updatePreference);

export default router;
