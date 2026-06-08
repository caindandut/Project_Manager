import { ActivityLog, Prisma, Project, Task, TaskStatus, User } from '@prisma/client';

export type MyTasksTab = 'inbox' | 'board' | 'list' | 'activity';
export type MyTasksDueFilter = 'overdue' | 'today' | 'week' | 'none';
export type MyTasksRoleFilter = 'assigned' | 'created' | 'all';
export type MyTasksSortField = 'dueDate' | 'updatedAt' | 'priority';

export interface MyTasksQuery {
  tab: MyTasksTab;
  q?: string;
  projectId?: number;
  status?: string;
  priority?: string;
  due?: MyTasksDueFilter;
  role: MyTasksRoleFilter;
  sort: MyTasksSortField;
  page: number;
  limit: number;
}

export type MyTasksTaskRecord = Task & {
  project: Pick<Project, 'id' | 'name' | 'key' | 'workspaceId'>;
  assignee: Pick<User, 'id' | 'name' | 'email' | 'avatar'> | null;
  assignees: Array<Pick<User, 'id' | 'name' | 'email' | 'avatar'>>;
  _count: {
    subTasks: number;
    comments: number;
  };
};

export type MyTasksActivityRecord = ActivityLog & {
  user: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
  task: (Pick<Task, 'id' | 'title' | 'status' | 'priority' | 'projectId'> & {
    project: Pick<Project, 'id' | 'name' | 'key' | 'workspaceId'>;
  }) | null;
};

export interface MyTasksFindOptions {
  where: Prisma.TaskWhereInput;
  orderBy: Prisma.TaskOrderByWithRelationInput[];
  page: number;
  limit: number;
}

export interface MyTasksStats {
  totalRelated: number;
  assigned: number;
  created: number;
  inbox: number;
  overdue: number;
  dueToday: number;
  completed: number;
  activityCount: number;
  byStatus: Partial<Record<TaskStatus, number>>;
}
