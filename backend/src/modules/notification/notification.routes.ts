import { Router } from 'express';
import { notificationController } from './notification.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all notifications for current user
router.get('/', notificationController.getAll);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark all as read
router.post('/mark-all-read', notificationController.markAllAsRead);

// Clear all notifications
router.delete('/clear-all', notificationController.clearAll);

// Get notification by ID
router.get('/:id', notificationController.getAll);

// Mark notification as read
router.post('/:id/read', notificationController.markAsRead);

// Delete notification
router.delete('/:id', notificationController.delete);

export default router;
