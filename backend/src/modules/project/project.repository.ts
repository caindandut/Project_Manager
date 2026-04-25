import { BaseRepository } from '../../common/base/BaseRepository';
import { prisma } from '../../config';
import { Prisma, Project, TaskStatus, TaskType, User } from '@prisma/client';

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
  subtaskCount: number;
}

export interface RecentTask {
  id: number;
  title: string;
  status: TaskStatus;
  priority: string;
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
        orderBy: options?.sort || [{ createdAt: 'desc' }],
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
    const [statusCounts, subtaskCount] = await Promise.all([
      prisma.task.groupBy({
        by: ['status'],
        where: { projectId, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.task.count({
        where: { projectId, type: TaskType.SUB_TASK, deletedAt: null },
      }),
    ]);

    const countByStatus = new Map(
      statusCounts.map((count) => [count.status, count._count._all]),
    );

    return {
      totalTasks: statusCounts.reduce((total, count) => total + count._count._all, 0),
      todoTasks: countByStatus.get(TaskStatus.TODO) || 0,
      inProgressTasks: countByStatus.get(TaskStatus.IN_PROGRESS) || 0,
      reviewTasks: countByStatus.get(TaskStatus.REVIEW) || 0,
      doneTasks: countByStatus.get(TaskStatus.DONE) || 0,
      subtaskCount,
    };
  }

  async getRecentTasks(projectId: number, limit = 5): Promise<RecentTask[]> {
    return prisma.task.findMany({
      where: { projectId, deletedAt: null },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }
}

export const projectRepository = new ProjectRepository();
