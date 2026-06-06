import { Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '../../config';
import {
  MyTasksActivityRecord,
  MyTasksFindOptions,
  MyTasksStats,
  MyTasksTaskRecord,
} from './my-tasks.interface';

const taskInclude = {
  project: {
    select: { id: true, name: true, key: true, workspaceId: true },
  },
  assignee: {
    select: { id: true, name: true, email: true, avatar: true },
  },
  _count: {
    select: {
      subTasks: { where: { deletedAt: null } },
      comments: { where: { deletedAt: null } },
    },
  },
} satisfies Prisma.TaskInclude;

const activityInclude = {
  user: {
    select: { id: true, name: true, email: true, avatar: true },
  },
  task: {
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      projectId: true,
      project: {
        select: { id: true, name: true, key: true, workspaceId: true },
      },
    },
  },
} satisfies Prisma.ActivityLogInclude;

export class MyTasksRepository {
  private taskAssigneesTableExists?: boolean;

  async findCreatedTaskIds(workspaceId: number, userId: number): Promise<number[]> {
    const activities = await prisma.activityLog.findMany({
      where: {
        userId,
        action: 'CREATE',
        entityType: 'TASK',
        task: {
          deletedAt: null,
          project: this.buildAccessibleProjectWhere(workspaceId, userId),
        },
      },
      select: { entityId: true },
      distinct: ['entityId'],
    });

    return activities.map((activity) => activity.entityId);
  }

  async findTasks(options: MyTasksFindOptions): Promise<{ data: MyTasksTaskRecord[]; total: number }> {
    const skip = (options.page - 1) * options.limit;

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where: options.where,
        include: taskInclude,
        orderBy: options.orderBy,
        skip,
        take: options.limit,
      }),
      prisma.task.count({ where: options.where }),
    ]);

    const assignees = await this.findAssigneesByTaskIds(data.map((task) => task.id));
    return {
      data: data.map((task) => ({
        ...task,
        assignees: assignees.get(task.id) || [],
      })) as MyTasksTaskRecord[],
      total,
    };
  }

  async findActivities(workspaceId: number, userId: number, limit: number): Promise<MyTasksActivityRecord[]> {
    const activities = await prisma.activityLog.findMany({
      where: {
        userId,
        task: {
          deletedAt: null,
          project: this.buildAccessibleProjectWhere(workspaceId, userId),
        },
      },
      include: activityInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return activities as MyTasksActivityRecord[];
  }

  async findFilterProjects(workspaceId: number, userId: number, createdTaskIds: number[]) {
    const assignedTaskIds = await this.findAssignedTaskIds(userId, workspaceId);

    return prisma.project.findMany({
      where: {
        ...this.buildAccessibleProjectWhere(workspaceId, userId),
        tasks: {
          some: {
            deletedAt: null,
            OR: [
              { assigneeId: userId },
              ...(assignedTaskIds.length > 0 ? [{ id: { in: assignedTaskIds } }] : []),
              ...(createdTaskIds.length > 0 ? [{ id: { in: createdTaskIds } }] : []),
            ],
          },
        },
      },
      select: { id: true, name: true, key: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async getStats(workspaceId: number, userId: number, createdTaskIds: number[], assignedTaskIds: number[]): Promise<MyTasksStats> {
    const relatedWhere = this.buildRelatedWhere(workspaceId, userId, createdTaskIds, assignedTaskIds);
    const today = this.getTodayRange();

    const [totalRelated, assigned, created, inbox, overdue, dueToday, completed, byStatus] = await Promise.all([
      prisma.task.count({ where: relatedWhere }),
      prisma.task.count({
        where: {
          deletedAt: null,
          OR: [
            { assigneeId: userId },
            ...(assignedTaskIds.length > 0 ? [{ id: { in: assignedTaskIds } }] : []),
          ],
          project: this.buildAccessibleProjectWhere(workspaceId, userId),
        },
      }),
      createdTaskIds.length > 0
        ? prisma.task.count({
            where: {
              deletedAt: null,
              id: { in: createdTaskIds },
              project: this.buildAccessibleProjectWhere(workspaceId, userId),
            },
          })
        : Promise.resolve(0),
      prisma.task.count({
        where: {
          ...relatedWhere,
          status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
        },
      }),
      prisma.task.count({
        where: {
          ...relatedWhere,
          status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
          dueDate: { lt: today.start },
        },
      }),
      prisma.task.count({
        where: {
          ...relatedWhere,
          status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
          dueDate: { gte: today.start, lte: today.end },
        },
      }),
      prisma.task.count({
        where: {
          ...relatedWhere,
          status: TaskStatus.DONE,
        },
      }),
      prisma.task.groupBy({
        by: ['status'],
        where: relatedWhere,
        _count: { _all: true },
      }),
    ]);

    return {
      totalRelated,
      assigned,
      created,
      inbox,
      overdue,
      dueToday,
      completed,
      byStatus: byStatus.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = item._count._all;
        return acc;
      }, {}),
    };
  }

  async findAssignedTaskIds(userId: number, workspaceId: number): Promise<number[]> {
    if (!(await this.hasTaskAssigneesTable())) return [];

    try {
      const rows = await prisma.$queryRaw<Array<{ taskId: number }>>`
        SELECT ta.task_id AS taskId
        FROM task_assignees ta
        INNER JOIN tasks t ON t.id = ta.task_id
        INNER JOIN projects p ON p.id = t.project_id
        LEFT JOIN project_members pm
          ON pm.project_id = p.id
          AND pm.user_id = ${userId}
          AND pm.status = 'ACCEPTED'
          AND pm.deleted_at IS NULL
        WHERE ta.user_id = ${userId}
          AND t.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND p.workspace_id = ${workspaceId}
          AND (p.owner_id = ${userId} OR pm.id IS NOT NULL)
      `;

      return rows.map((row) => row.taskId);
    } catch (error) {
      if (this.isTaskAssigneesTableMissing(error)) {
        this.taskAssigneesTableExists = false;
        return [];
      }
      throw error;
    }
  }

  buildRelatedWhere(workspaceId: number, userId: number, createdTaskIds: number[], assignedTaskIds: number[]): Prisma.TaskWhereInput {
    return {
      deletedAt: null,
      project: this.buildAccessibleProjectWhere(workspaceId, userId),
      OR: [
        { assigneeId: userId },
        ...(assignedTaskIds.length > 0 ? [{ id: { in: assignedTaskIds } }] : []),
        ...(createdTaskIds.length > 0 ? [{ id: { in: createdTaskIds } }] : []),
      ],
    };
  }

  private getTodayRange(): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return { start, end };
  }

  private buildAccessibleProjectWhere(
    workspaceId: number,
    userId: number,
  ): Prisma.ProjectWhereInput {
    return {
      workspaceId,
      deletedAt: null,
      OR: [
        { ownerId: userId },
        {
          projectMembers: {
            some: {
              userId,
              status: 'ACCEPTED',
              deletedAt: null,
            },
          },
        },
      ],
    };
  }

  private async findAssigneesByTaskIds(taskIds: number[]) {
    if (taskIds.length === 0) return new Map<number, MyTasksTaskRecord['assignees']>();
    if (!(await this.hasTaskAssigneesTable())) return this.findLegacyAssigneesByTaskIds(taskIds);

    let rows: Array<{ taskId: number; id: number; name: string; email: string; avatar: string | null }>;
    try {
      rows = await prisma.$queryRaw<Array<{ taskId: number; id: number; name: string; email: string; avatar: string | null }>>`
        SELECT
          ta.task_id AS taskId,
          u.id AS id,
          u.name AS name,
          u.email AS email,
          u.avatar AS avatar
        FROM task_assignees ta
        INNER JOIN users u ON u.id = ta.user_id
        WHERE ta.task_id IN (${Prisma.join(taskIds)})
          AND u.deleted_at IS NULL
        ORDER BY ta.assigned_at ASC, ta.id ASC
      `;
    } catch (error) {
      if (this.isTaskAssigneesTableMissing(error)) {
        this.taskAssigneesTableExists = false;
        return this.findLegacyAssigneesByTaskIds(taskIds);
      }
      throw error;
    }

    return rows.reduce<Map<number, MyTasksTaskRecord['assignees']>>((map, row) => {
      const assignees = map.get(row.taskId) || [];
      assignees.push({
        id: row.id,
        name: row.name,
        email: row.email,
        avatar: row.avatar,
      });
      map.set(row.taskId, assignees);
      return map;
    }, new Map());
  }

  private isTaskAssigneesTableMissing(error: unknown): boolean {
    const knownError = error as { code?: unknown; meta?: { code?: unknown; message?: unknown } };
    const metaMessage = typeof knownError.meta?.message === 'string' ? knownError.meta.message : '';
    const metaCode = typeof knownError.meta?.code === 'string' ? knownError.meta.code : '';
    const message = `${error instanceof Error ? error.message : String(error)} ${metaMessage}`;

    return (
      knownError.code === 'P2010' &&
      metaCode === '1146' &&
      message.includes('task_assignees')
    ) || (
      message.includes('task_assignees') &&
      (
        message.includes('1146') ||
        message.toLowerCase().includes("doesn't exist") ||
        message.toLowerCase().includes('does not exist')
      )
    );
  }

  private async findLegacyAssigneesByTaskIds(taskIds: number[]) {
    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds }, deletedAt: null, assigneeId: { not: null } },
      select: {
        id: true,
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    return tasks.reduce<Map<number, MyTasksTaskRecord['assignees']>>((map, task) => {
      if (task.assignee) map.set(task.id, [task.assignee]);
      return map;
    }, new Map());
  }

  private async hasTaskAssigneesTable(): Promise<boolean> {
    if (this.taskAssigneesTableExists === true) return true;

    const rows = await prisma.$queryRaw<Array<Record<string, string>>>`
      SHOW TABLES LIKE 'task_assignees'
    `;
    const exists = rows.length > 0;
    if (exists) this.taskAssigneesTableExists = true;
    return exists;
  }
}

export const myTasksRepository = new MyTasksRepository();
