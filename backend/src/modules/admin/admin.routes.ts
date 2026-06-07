import { Router } from 'express';
import { adminController } from './admin.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { requireSystemOwner } from '../../common/middlewares/system-role.middleware';

const router = Router();

// All admin routes require auth + system owner
router.use(authMiddleware);
router.use(requireSystemOwner);

// Dashboard
router.get('/dashboard/stats', adminController.getStats);
router.get('/dashboard/trends', adminController.getTrends);
router.get('/dashboard/recent-activity', adminController.getRecentActivity);

// Users
router.get('/users', adminController.getUsers);
router.get('/users/:userId', adminController.getUserDetail);
router.patch('/users/:userId/status', adminController.updateUserStatus);
router.patch('/users/:userId/role', adminController.updateUserRole);

// Owner read-only oversight
router.get('/workspaces', adminController.getWorkspaces);
router.get('/projects', adminController.getProjects);

// System health & maintenance
router.get('/system/health', adminController.getSystemHealth);
router.post('/system/maintenance/expired-refresh-tokens', adminController.cleanupExpiredRefreshTokens);
router.post('/system/maintenance/expired-otp-codes', adminController.cleanupExpiredOtpCodes);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
