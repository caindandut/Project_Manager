import { BaseRepository } from '../../common/base/BaseRepository';
import { prisma } from '../../config';
import { Task, Prisma } from '@prisma/client';

export class TaskRepository extends BaseRepository<
  Task,
  Prisma.TaskCreateInput,
  Prisma.TaskUpdateInput
> {
  constructor() {
    super(prisma, prisma.task);
  }

  async findById(id: number): Promise<Task | null> {
    return prisma.task.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdWithDetails(id: number) {
    return prisma.task.findUnique({
      where: { id },
      include: {
        project: { include: { workspace: true } },
        assignee: true,
        parent: true,
        subTasks: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
        comments: {
          where: { deletedAt: null },
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          where: { deletedAt: null },
          include: { uploadedBy: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findAllInProject(
    projectId: number,
    options?: {
      page?: number;
      limit?: number;
      cursor?: string;
      sort?: { field: string; direction: 'asc' | 'desc' }[];
      filter?: Record<string, any>;
    }
  ) {
    const where: any = {
      projectId,
      deletedAt: null,
      ...options?.filter,
    };

    let orderBy: any = options?.sort || [{ createdAt: 'desc' }];
    let skip: number | undefined;
    let take: number | undefined;
    let cursor: { id: number } | undefined;

    if (options?.cursor) {
      cursor = { id: parseInt(options.cursor, 10) };
      take = options.limit || 20;
      skip = 1;
    } else {
      skip = options?.page ? (options.page - 1) * (options.limit || 20) : 0;
      take = options?.limit || 20;
    }

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignee: true,
          parent: true,
          _count: {
            select: { subTasks: { where: { deletedAt: null } } },
          },
        },
        orderBy,
        skip,
        take,
        cursor,
      }),
      prisma.task.count({ where }),
    ]);

    return { data, total };
  }

  async findSubTasks(parentId: number, options?: { page?: number; limit?: number }) {
    const skip = options?.page ? (options.page - 1) * (options.limit || 20) : 0;
    const take = options?.limit || 20;

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where: { parentId, deletedAt: null },
        include: { assignee: true },
        orderBy: { order: 'asc' },
        skip,
        take,
      }),
      prisma.task.count({ where: { parentId, deletedAt: null } }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.TaskCreateInput): Promise<Task> {
    return prisma.task.create({ data });
  }

  async update(id: number, data: Prisma.TaskUpdateInput): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: number): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async deleteWithSubTasks(id: number): Promise<void> {
    // Delete all subtasks first
    await prisma.task.updateMany({
      where: { parentId: id },
      data: { deletedAt: new Date() },
    });
    // Delete the task
    await prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async logTime(id: number, hours: number): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: { loggedHours: { increment: hours } },
    });
  }

  async countByProject(projectId: number): Promise<number> {
    return prisma.task.count({
      where: { projectId, deletedAt: null },
    });
  }

  async countByStatus(projectId: number) {
    return prisma.task.groupBy({
      by: ['status'],
      where: { projectId, deletedAt: null },
      _count: { status: true },
    });
  }
}

export const taskRepository = new TaskRepository();
