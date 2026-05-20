import { Router } from 'express';
import { notificationController } from './notification.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get unread count (DIRECT only, for badge) — must be before /:id
router.get('/unread-count', notificationController.getUnreadCount);

// Get group detail — must be before /:id
router.get('/groups/:groupKey', notificationController.getGroupDetail);

// Mark group as read — must be before /:id
router.patch('/groups/:groupKey/read', notificationController.markGroupAsRead);

// Get all notifications for current user (supports ?grouped=true&category=DIRECT)
router.get('/', notificationController.getAll);

// Mark all as read (supports ?category=DIRECT)
router.patch('/', notificationController.markAllAsRead);

// Clear all notifications (supports ?category=DIRECT)
router.delete('/', notificationController.clearAll);

// Mark single notification as read
router.patch('/:id', notificationController.markAsRead);

// Delete single notification
router.delete('/:id', notificationController.delete);

export default router;
