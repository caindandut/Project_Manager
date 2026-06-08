import { projectService } from '../../modules/project/project.service';
import { workspaceService } from '../../modules/workspace/workspace.service';
import { logger } from '../utils/logger';

/**
 * Schedule a daily cleanup job using setInterval.
 * Runs every 24 hours to permanently delete projects that have been
 * soft-deleted for more than 30 days.
 */
export function startCleanupJob(): void {
  const RUN_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  const runCleanup = async () => {
    try {
      logger.info('Running scheduled cleanup: expired archived projects and workspaces...');
      await projectService.cleanupExpiredProjects();
      await workspaceService.cleanupExpiredWorkspaces();
    } catch (err) {
      logger.error('Cleanup job failed:', err);
    }
  };

  // Run immediately on startup, then every 24 hours
  void runCleanup();
  setInterval(() => { void runCleanup(); }, RUN_INTERVAL_MS);

  logger.info('Cleanup job scheduled: runs every 24 hours to delete expired projects.');
}
