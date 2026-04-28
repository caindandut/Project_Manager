import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { prisma } from '../../config';
import { success } from '../../common/utils/apiResponse';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { AuthenticatedRequest } from '../../types/interfaces';
import { Response } from 'express';

const router = Router();

router.use(authMiddleware);

/**
 * GET /my-tasks
 * Returns all tasks assigned to or created by the current user,
 * plus recent activity logs.
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
    }

    // Tasks assigned to user
    const assignedTasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        deletedAt: null,
      },
      include: {
        project: {
          select: { id: true, name: true, key: true },
        },
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    // Tasks created by user (tasks where the first activity log with action CREATE belongs to user)
    // Since we don't have a creatorId field, we use activity logs
    const createdTaskIds = await prisma.activityLog.findMany({
      where: {
        userId,
        action: 'CREATE',
        entityType: 'TASK',
      },
      select: { entityId: true },
      distinct: ['entityId'],
    });

    let createdTasks: typeof assignedTasks = [];
    if (createdTaskIds.length > 0) {
      createdTasks = await prisma.task.findMany({
        where: {
          id: { in: createdTaskIds.map((a) => a.entityId) },
          deletedAt: null,
        },
        include: {
          project: {
            select: { id: true, name: true, key: true },
          },
          assignee: {
            select: { id: true, name: true, avatar: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      });
    }

    // Recent activity logs for this user
    const activities = await prisma.activityLog.findMany({
      where: { userId },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
        task: {
          select: { id: true, title: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Format response
    const formatTask = (task: typeof assignedTasks[0]) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      type: task.type,
      dueDate: task.dueDate,
      startDate: task.startDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      project: task.project
        ? { id: task.project.id, name: task.project.name, key: task.project.key }
        : null,
      assignee: task.assignee
        ? { id: task.assignee.id, name: task.assignee.name, avatar: task.assignee.avatar }
        : null,
    });

    const formatActivity = (activity: typeof activities[0]) => {
      const meta = activity.metadata as Record<string, unknown> | null;
      return {
        id: activity.id,
        action: activity.action,
        entityType: activity.entityType,
        entityId: activity.entityId,
        field: meta?.field ?? null,
        oldValue: meta?.oldValue != null ? String(meta.oldValue) : null,
        newValue: meta?.newValue != null ? String(meta.newValue) : null,
        createdAt: activity.createdAt,
        user: activity.user,
        task: activity.task,
        metadata: meta,
      };
    };

    res.json(success({
      assigned: assignedTasks.map(formatTask),
      created: createdTasks.map(formatTask),
      activities: activities.map(formatActivity),
      stats: {
        totalAssigned: assignedTasks.length,
        totalCreated: createdTasks.length,
      },
    }));
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  }
});

export default router;
