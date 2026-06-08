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
  assignees: TaskAssignee[];
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
  assignees: TaskAssignee[];
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

export interface ActiveAssignedTaskSummary {
  activeTaskCount: number;
  taskIds: number[];
  tasks: Array<{
    id: number;
    title: string;
    status: TaskStatus;
    parentId: number | null;
    parentStatus: TaskStatus | null;
  }>;
}

export class TaskRepository extends BaseRepository<
  Task,
  Prisma.TaskCreateInput,
  Prisma.TaskUpdateInput
> {
  private taskAssigneesTableExists?: boolean;

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

  async isProjectParticipant(projectId: number, userId: number): Promise<boolean> {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
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
      },
      select: { id: true },
    });

    return project !== null;
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
    const task = await prisma.task.findFirst({
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
    });

    if (!task) return null;
    const assignees = await this.findAssigneesByTaskIds([task.id]);
    return {
      ...task,
      assignees: assignees.get(task.id) || [],
    } as TaskDetail;
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

    const assignees = await this.findAssigneesByTaskIds(data.map((task) => task.id));
    return {
      data: data.map((task) => ({
        ...task,
        assignees: assignees.get(task.id) || [],
      })) as TaskListItem[],
      total,
    };
  }

  async findListItemById(id: number): Promise<TaskListItem | null> {
    const task = await prisma.task.findFirst({
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
    if (!task) return null;
    const assignees = await this.findAssigneesByTaskIds([task.id]);
    return {
      ...task,
      assignees: assignees.get(task.id) || [],
    } as TaskListItem;
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

  async replaceAssignees(taskId: number, assigneeIds: number[]): Promise<TaskAssignee[]> {
    await this.ensureTaskAssigneesTable();

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`DELETE FROM task_assignees WHERE task_id = ${taskId}`;

      for (const assigneeId of assigneeIds) {
        await tx.$executeRaw`
          INSERT IGNORE INTO task_assignees (task_id, user_id, assigned_at)
          VALUES (${taskId}, ${assigneeId}, CURRENT_TIMESTAMP(3))
        `;
      }
    });

    const assignees = await this.findAssigneesByTaskIds([taskId]);
    return assignees.get(taskId) || [];
  }

  async findAssignedTaskIds(userId: number, workspaceId?: number): Promise<number[]> {
    await this.ensureTaskAssigneesTable();

    let rows: Array<{ taskId: number }>;
    rows = workspaceId
      ? await prisma.$queryRaw<Array<{ taskId: number }>>`
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
        `
      : await prisma.$queryRaw<Array<{ taskId: number }>>`
          SELECT ta.task_id AS taskId
          FROM task_assignees ta
          INNER JOIN tasks t ON t.id = ta.task_id
          WHERE ta.user_id = ${userId}
            AND t.deleted_at IS NULL
        `;

    return rows.map((row) => row.taskId);
  }

  async findActiveAssignedTaskSummary(
    userId: number,
    options: { projectId?: number; workspaceId?: number; limit?: number },
  ): Promise<ActiveAssignedTaskSummary> {
    const scopeFilter = options.projectId
      ? Prisma.sql`AND t.project_id = ${options.projectId}`
      : options.workspaceId
        ? Prisma.sql`AND p.workspace_id = ${options.workspaceId}`
        : Prisma.empty;

    const hasTaskAssignees = await this.hasTaskAssigneesTable();
    const assignmentFilter = hasTaskAssignees
      ? Prisma.sql`AND (t.assignee_id = ${userId} OR ta.user_id IS NOT NULL)`
      : Prisma.sql`AND t.assignee_id = ${userId}`;
    const assigneeJoin = hasTaskAssignees
      ? Prisma.sql`
          LEFT JOIN task_assignees ta
            ON ta.task_id = t.id
            AND ta.user_id = ${userId}
        `
      : Prisma.empty;

    const baseWhere = Prisma.sql`
      t.deleted_at IS NULL
      AND p.deleted_at IS NULL
      AND t.status NOT IN ('DONE', 'CANCELLED')
      AND (parent.id IS NULL OR parent.status NOT IN ('DONE', 'CANCELLED'))
      ${assignmentFilter}
      ${scopeFilter}
    `;

    const countRows = await prisma.$queryRaw<Array<{ activeTaskCount: bigint | number }>>`
      SELECT COUNT(DISTINCT t.id) AS activeTaskCount
      FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      LEFT JOIN tasks parent
        ON parent.id = t.parent_id
        AND parent.deleted_at IS NULL
      ${assigneeJoin}
      WHERE ${baseWhere}
    `;

    const taskRows = await prisma.$queryRaw<Array<{
      id: number;
      title: string;
      status: TaskStatus;
      parentId: number | null;
      parentStatus: TaskStatus | null;
    }>>`
      SELECT
        t.id AS id,
        t.title AS title,
        t.status AS status,
        t.parent_id AS parentId,
        parent.status AS parentStatus
      FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      LEFT JOIN tasks parent
        ON parent.id = t.parent_id
        AND parent.deleted_at IS NULL
      ${assigneeJoin}
      WHERE ${baseWhere}
      ORDER BY t.updated_at DESC, t.id DESC
      LIMIT ${options.limit ?? 5}
    `;

    return {
      activeTaskCount: Number(countRows[0]?.activeTaskCount ?? 0),
      taskIds: taskRows.map((row) => row.id),
      tasks: taskRows,
    };
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

  async searchInWorkspace(workspaceId: number, query: string, userId: number, isWorkspaceAdmin: boolean) {
    const where: Prisma.TaskWhereInput = {
      project: {
        workspaceId,
        deletedAt: null,
        ...(!isWorkspaceAdmin ? {
          OR: [
            { ownerId: userId },
            { projectMembers: { some: { userId, status: 'ACCEPTED', deletedAt: null } } }
          ]
        } : {})
      },
      deletedAt: null,
      title: { contains: query }
    };

    return prisma.task.findMany({
      where,
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        project: { select: { id: true, name: true, key: true } },
      }
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

  private async findAssigneesByTaskIds(taskIds: number[]): Promise<Map<number, TaskAssignee[]>> {
    if (taskIds.length === 0) return new Map();
    await this.ensureTaskAssigneesTable();

    const rows = await prisma.$queryRaw<Array<TaskAssignee & { taskId: number }>>`
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

    return rows.reduce<Map<number, TaskAssignee[]>>((map, row) => {
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

  private async hasTaskAssigneesTable(): Promise<boolean> {
    if (this.taskAssigneesTableExists === true) return true;

    const rows = await prisma.$queryRaw<Array<Record<string, string>>>`
      SHOW TABLES LIKE 'task_assignees'
    `;
    const exists = rows.length > 0;
    if (exists) this.taskAssigneesTableExists = true;
    return exists;
  }

  private async ensureTaskAssigneesTable(): Promise<void> {
    if (await this.hasTaskAssigneesTable()) return;

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`task_assignees\` (
        \`id\` INTEGER NOT NULL AUTO_INCREMENT,
        \`task_id\` INTEGER NOT NULL,
        \`user_id\` INTEGER NOT NULL,
        \`assigned_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        UNIQUE INDEX \`uq_task_assignee_task_user\`(\`task_id\`, \`user_id\`),
        INDEX \`idx_task_assignee_task\`(\`task_id\`),
        INDEX \`idx_task_assignee_user\`(\`user_id\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await prisma.$executeRawUnsafe(`
      INSERT IGNORE INTO \`task_assignees\` (\`task_id\`, \`user_id\`, \`assigned_at\`)
      SELECT \`id\`, \`assignee_id\`, COALESCE(\`updated_at\`, \`created_at\`, CURRENT_TIMESTAMP(3))
      FROM \`tasks\`
      WHERE \`assignee_id\` IS NOT NULL AND \`deleted_at\` IS NULL
    `);

    this.taskAssigneesTableExists = true;
  }
}

export const taskRepository = new TaskRepository();
