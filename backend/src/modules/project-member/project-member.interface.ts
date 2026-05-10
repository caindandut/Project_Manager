import { ProjectRole } from '@prisma/client';

export interface ProjectMemberWithUser {
  id: number;
  role: ProjectRole;
  joinedAt: Date;
  projectId: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface AddProjectMemberInput {
  userId: number;
  role?: ProjectRole;
}

export interface UpdateProjectMemberRoleInput {
  role: ProjectRole;
}

export interface ProjectMemberListOptions {
  page?: number;
  limit?: number;
}
