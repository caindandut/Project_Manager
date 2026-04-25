import { Router } from 'express';
import { notificationController } from './notification.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all notifications for current user
router.get('/', notificationController.getAll);

// Mark all as read
router.patch('/', notificationController.markAllAsRead);

// Clear all notifications
router.delete('/', notificationController.clearAll);

// Mark notification as read
router.patch('/:id', notificationController.markAsRead);

// Delete notification
router.delete('/:id', notificationController.delete);

export default router;
