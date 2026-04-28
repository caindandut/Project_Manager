import {
  ActivityLog,
  Attachment,
  Comment,
  Prisma,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
  User,
  Workspace,
} from '@prisma/client';
import { BaseRepository } from '../../common/base/BaseRepository';
import { prisma } from '../../config';

export type TaskAssignee = Pick<User, 'id' | 'name' | 'email' | 'avatar'>;

export type TaskListItem = Task & {
  assignee: Pick<User, 'id' | 'name' | 'avatar'> | null;
  _count: {
    subTasks: number;
    comments: number;
  };
};

export type TaskDetail = Task & {
  project: Pick<Project, 'id' | 'name' | 'key' | 'workspaceId'> & {
    workspace: Pick<Workspace, 'id' | 'name'>;
  };
  assignee: TaskAssignee | null;
  parent: Pick<Task, 'id' | 'title' | 'status'> | null;
  subTasks: Array<Pick<Task, 'id' | 'title' | 'status' | 'priority' | 'createdAt'>>;
  comments: Array<Comment & { user: Pick<User, 'id' | 'name' | 'avatar'> }>;
  attachments: Array<Attachment & { uploadedBy: Pick<User, 'id' | 'name' | 'avatar'> }>;
  activities: Array<ActivityLog & { user: Pick<User, 'id' | 'name' | 'avatar'> }>;
};

export interface TaskCursorListOptions {
  limit: number;
  cursorId?: number;
  where: Prisma.TaskWhereInput;
  orderBy: Prisma.TaskOrderByWithRelationInput[];
}

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

  async findProjectById(projectId: number): Promise<Pick<Project, 'id' | 'workspaceId'> | null> {
    return prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true, workspaceId: true },
    });
  }

  async isWorkspaceMember(workspaceId: number, userId: number): Promise<boolean> {
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, deletedAt: null },
      select: { id: true },
    });

    return member !== null;
  }

  async findByIdWithProject(
    taskId: number,
  ): Promise<(Task & { project: Pick<Project, 'id' | 'workspaceId'> }) | null> {
    return prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: {
        project: {
          select: { id: true, workspaceId: true },
        },
      },
    });
  }

  async findByIdWithDetails(
    id: number,
    options: {
      includeSubTasks: boolean;
      includeComments: boolean;
      includeAttachments: boolean;
      includeActivities?: boolean;
      commentLimit: number;
    },
  ): Promise<TaskDetail | null> {
    return prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            key: true,
            workspaceId: true,
            workspace: {
              select: { id: true, name: true },
            },
          },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        parent: {
          select: { id: true, title: true, status: true },
        },
        subTasks: {
          where: { deletedAt: null },
          select: { id: true, title: true, status: true, priority: true, createdAt: true },
          orderBy: { order: 'asc' },
          take: options.includeSubTasks ? undefined : 0,
        },
        comments: {
          where: { deletedAt: null },
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: options.includeComments ? options.commentLimit : 0,
        },
        attachments: {
          where: { deletedAt: null },
          include: { uploadedBy: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: options.includeAttachments ? undefined : 0,
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: options.includeActivities !== false ? 50 : 0,
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    }) as Promise<TaskDetail | null>;
  }

  async findAllInProject(
    projectId: number,
    options: TaskCursorListOptions,
  ): Promise<{ data: TaskListItem[]; total: number }> {
    const where: Prisma.TaskWhereInput = {
      ...options.where,
      projectId,
      deletedAt: null,
    };

    const cursor = options.cursorId ? { id: options.cursorId } : undefined;
    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
          _count: {
            select: {
              subTasks: { where: { deletedAt: null } },
              comments: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: options.orderBy,
        cursor,
        skip: cursor ? 1 : 0,
        take: options.limit,
      }),
      prisma.task.count({ where }),
    ]);

    return { data, total };
  }

  async findListItemById(id: number): Promise<TaskListItem | null> {
    return prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        _count: {
          select: {
            subTasks: { where: { deletedAt: null } },
            comments: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  async createTask(data: Prisma.TaskUncheckedCreateInput): Promise<Task> {
    return prisma.task.create({ data });
  }

  async updateTask(id: number, data: Prisma.TaskUncheckedUpdateInput): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: number, status: TaskStatus): Promise<Pick<Task, 'id' | 'status' | 'updatedAt'>> {
    return prisma.task.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, updatedAt: true },
    });
  }

  async updateAssignee(
    id: number,
    assigneeId: number | null,
  ): Promise<Task & { assignee: Pick<User, 'id' | 'name' | 'avatar'> | null }> {
    return prisma.task.update({
      where: { id },
      data: { assigneeId },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async logTime(id: number, hours: number): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: { loggedHours: { increment: hours } },
    });
  }

  async deleteWithSubTasks(id: number): Promise<number> {
    const now = new Date();
    const subTasks = await prisma.task.updateMany({
      where: { parentId: id, deletedAt: null },
      data: { deletedAt: now },
    });

    await prisma.task.update({
      where: { id },
      data: { deletedAt: now },
    });

    return subTasks.count;
  }

  async countSubTasks(parentId: number): Promise<number> {
    return prisma.task.count({
      where: { parentId, deletedAt: null },
    });
  }

  buildWhereFromFilters(filter: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: number;
    assigneeIdIn?: number[];
    type?: TaskType;
    hasSubtasks?: boolean;
    titleContains?: string;
  }): Prisma.TaskWhereInput {
    return {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.priority ? { priority: filter.priority } : {}),
      ...(filter.assigneeId !== undefined ? { assigneeId: filter.assigneeId } : {}),
      ...(filter.assigneeIdIn ? { assigneeId: { in: filter.assigneeIdIn } } : {}),
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.titleContains ? { title: { contains: filter.titleContains } } : {}),
      ...(filter.hasSubtasks !== undefined
        ? {
            subTasks: filter.hasSubtasks
              ? { some: { deletedAt: null } }
              : { none: { deletedAt: null } },
          }
        : {}),
    };
  }
}

export const taskRepository = new TaskRepository();
