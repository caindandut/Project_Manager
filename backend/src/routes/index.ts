import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import workspaceRoutes from '../modules/workspace/workspace.routes';
import projectRoutes from '../modules/project/project.routes';
import taskRoutes from '../modules/task/task.routes';
import commentRoutes from '../modules/comment/comment.routes';
import attachmentRoutes from '../modules/attachment/attachment.routes';
import notificationRoutes from '../modules/notification/notification.routes';
import notificationPreferenceRoutes from '../modules/notification/notification-preference.routes';
import reportRoutes from '../modules/report/report.routes';
import myTasksRoutes from '../modules/my-tasks/my-tasks.routes';
import projectMemberRoutes from '../modules/project-member/project-member.routes';
import adminRoutes from '../modules/admin/admin.routes';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// Workspace routes
router.use('/workspaces', workspaceRoutes);

// Project routes (nested under workspaces)
router.use('/workspaces', projectRoutes);

// Task routes
router.use('/', taskRoutes);

// Comment routes (nested under tasks)
router.use('/', commentRoutes);

// Attachment routes (nested under tasks)
router.use('/', attachmentRoutes);

// Notification routes
router.use('/notifications', notificationRoutes);

// Notification preferences routes
router.use('/notification-preferences', notificationPreferenceRoutes);

// Report routes
router.use('/reports', reportRoutes);

// Project member routes (nested under projects)
router.use('/projects', projectMemberRoutes);

// My tasks routes
router.use('/my-tasks', myTasksRoutes);

// Admin routes (system owner only)
router.use('/admin', adminRoutes);

export default router;
