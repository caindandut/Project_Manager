import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import workspaceRoutes from '../modules/workspace/workspace.routes';
import projectRoutes from '../modules/project/project.routes';
import taskRoutes from '../modules/task/task.routes';
import commentRoutes from '../modules/comment/comment.routes';
import attachmentRoutes from '../modules/attachment/attachment.routes';
import notificationRoutes from '../modules/notification/notification.routes';
import reportRoutes from '../modules/report/report.routes';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// Workspace routes
router.use('/workspaces', workspaceRoutes);

// Project routes (nested under workspaces)
router.use('/workspaces', projectRoutes);

// Task routes (nested under workspaces)
router.use('/workspaces', taskRoutes);

// Comment routes (nested under tasks)
router.use('/workspaces', commentRoutes);

// Attachment routes (nested under tasks)
router.use('/workspaces', attachmentRoutes);

// Notification routes
router.use('/notifications', notificationRoutes);

// Report routes
router.use('/reports', reportRoutes);

export default router;
