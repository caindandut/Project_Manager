import { BaseRepository } from '../../common/base/BaseRepository';
import { prisma } from '../../config';
import { Prisma, Project, TaskPriority, TaskStatus, TaskType, User } from '@prisma/client';

export type ProjectWithOwner = Project & {
  owner: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
  _count: {
    tasks: number;
  };
};

export interface ProjectListItem extends ProjectWithOwner {
  completedTaskCount: number;
}

export interface ProjectStats {
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  reviewTasks: number;
  doneTasks: number;
  overdueTasks: number;
  memberCount: number;
  subtaskCount: number;
  // Priority breakdown
  lowestPriorityTasks: number;
  lowPriorityTasks: number;
  mediumPriorityTasks: number;
  highPriorityTasks: number;
  highestPriorityTasks: number;
}

export interface RecentTask {
  id: number;
  title: string;
  status: TaskStatus;
  priority: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignee: { id: number; name: string | null; email: string; avatar: string | null } | null;
}

export interface ProjectActivity {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  user: { id: number; name: string | null; avatar: string | null };
  task: { id: number; title: string } | null;
}

export class ProjectRepository extends BaseRepository<
  Project,
  Prisma.ProjectCreateInput,
  Prisma.ProjectUpdateInput
> {
  constructor() {
    super(prisma, prisma.project);
  }

  async findById(id: number): Promise<Project | null> {
    return prisma.project.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdInWorkspace(
    projectId: number,
    workspaceId: number,
  ): Promise<Project | null> {
    return prisma.project.findFirst({
      where: { id: projectId, workspaceId, deletedAt: null },
    });
  }

  async findByWorkspaceAndKey(
    workspaceId: number,
    key: string,
  ): Promise<Project | null> {
    return prisma.project.findFirst({
      where: { workspaceId, key, deletedAt: null },
    });
  }

  async findAllInWorkspace(
    workspaceId: number,
    options?: { page?: number; limit?: number; sort?: Prisma.ProjectOrderByWithRelationInput[] },
  ): Promise<{ data: ProjectListItem[]; total: number }> {
    const skip = options?.page ? (options.page - 1) * (options.limit || 20) : 0;
    const take = options?.limit || 20;
    const where: Prisma.ProjectWhereInput = { workspaceId, deletedAt: null };

    return this.queryProjectList(where, skip, take, options?.sort);
  }

  /**
   * Find projects in workspace filtered to those the user is a member of (or owner).
   * Used for MEMBER/GUEST workspace roles.
   */
  async findAllInWorkspaceForUser(
    workspaceId: number,
    userId: number,
    options?: { page?: number; limit?: number; sort?: Prisma.ProjectOrderByWithRelationInput[] },
  ): Promise<{ data: ProjectListItem[]; total: number }> {
    const skip = options?.page ? (options.page - 1) * (options.limit || 20) : 0;
    const take = options?.limit || 20;
    const where: Prisma.ProjectWhereInput = {
      workspaceId,
      deletedAt: null,
      OR: [
        { ownerId: userId },
        { projectMembers: { some: { userId, deletedAt: null } } },
      ],
    };

    return this.queryProjectList(where, skip, take, options?.sort);
  }

  private async queryProjectList(
    where: Prisma.ProjectWhereInput,
    skip: number,
    take: number,
    sort?: Prisma.ProjectOrderByWithRelationInput[],
  ): Promise<{ data: ProjectListItem[]; total: number }> {
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          owner: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          _count: {
            select: { tasks: { where: { deletedAt: null } } },
          },
        },
        orderBy: sort || [{ createdAt: 'desc' }],
        skip,
        take,
      }),
      prisma.project.count({ where }),
    ]);

    const completedCounts = await prisma.task.groupBy({
      by: ['projectId'],
      where: {
        projectId: { in: projects.map((project) => project.id) },
        status: TaskStatus.DONE,
        deletedAt: null,
      },
      _count: { _all: true },
    });

    const completedCountByProjectId = new Map(
      completedCounts.map((count) => [count.projectId, count._count._all]),
    );

    return {
      data: projects.map((project) => ({
        ...project,
        completedTaskCount: completedCountByProjectId.get(project.id) || 0,
      })),
      total,
    };
  }

  async findByIdWithDetails(
    projectId: number,
    workspaceId: number,
  ): Promise<ProjectWithOwner | null> {
    return prisma.project.findFirst({
      where: { id: projectId, workspaceId, deletedAt: null },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        _count: {
          select: { tasks: { where: { deletedAt: null } } },
        },
      },
    });
  }

  async getStats(projectId: number): Promise<ProjectStats> {
    const [statusCounts, priorityCounts, subtaskCount, overdueTasks, memberCount] = await Promise.all([
      prisma.task.groupBy({
        by: ['status'],
        where: { projectId, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ['priority'],
        where: { projectId, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.task.count({
        where: { projectId, type: TaskType.SUB_TASK, deletedAt: null },
      }),
      prisma.task.count({
        where: {
          projectId,
          deletedAt: null,
          dueDate: { lt: new Date() },
          status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
        },
      }),
      prisma.projectMember.count({
        where: { projectId, deletedAt: null },
      }),
    ]);

    const countByStatus = new Map(
      statusCounts.map((count) => [count.status, count._count._all]),
    );

    const countByPriority = new Map(
      priorityCounts.map((count) => [count.priority, count._count._all]),
    );

    return {
      totalTasks: statusCounts.reduce((total, count) => total + count._count._all, 0),
      todoTasks: countByStatus.get(TaskStatus.TODO) || 0,
      inProgressTasks: countByStatus.get(TaskStatus.IN_PROGRESS) || 0,
      reviewTasks: countByStatus.get(TaskStatus.REVIEW) || 0,
      doneTasks: countByStatus.get(TaskStatus.DONE) || 0,
      overdueTasks,
      memberCount,
      subtaskCount,
      lowestPriorityTasks: countByPriority.get(TaskPriority.LOWEST) || 0,
      lowPriorityTasks: countByPriority.get(TaskPriority.LOW) || 0,
      mediumPriorityTasks: countByPriority.get(TaskPriority.MEDIUM) || 0,
      highPriorityTasks: countByPriority.get(TaskPriority.HIGH) || 0,
      highestPriorityTasks: countByPriority.get(TaskPriority.HIGHEST) || 0,
    };
  }

  async getRecentTasks(projectId: number, limit = 10): Promise<RecentTask[]> {
    const tasks = await prisma.task.findMany({
      where: { projectId, deletedAt: null },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    return tasks as RecentTask[];
  }

  /**
   * Get recent activity logs for a project (across all its tasks).
   */
  async getRecentActivities(projectId: number, limit = 15): Promise<ProjectActivity[]> {
    const activities = await prisma.activityLog.findMany({
      where: {
        task: {
          projectId,
          deletedAt: null,
        },
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
        task: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return activities.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      metadata: a.metadata as Record<string, unknown> | null,
      createdAt: a.createdAt,
      user: a.user,
      task: a.task,
    }));
  }
}

export const projectRepository = new ProjectRepository();

