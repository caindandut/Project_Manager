import { BaseRepository } from '../../common/base/BaseRepository';
import { prisma } from '../../config';
import { Prisma, User, Workspace, WorkspaceMember } from '@prisma/client';
import { WorkspaceRole } from '../../types/enums';

export type WorkspaceListItem = Workspace & {
  members: WorkspaceMember[];
  _count: {
    members: number;
    projects: number;
  };
};

export type WorkspaceMemberWithUser = WorkspaceMember & {
  user: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
};

export interface WorkspaceStats {
  memberCount: number;
  projectCount: number;
  taskCount: number;
}

export class WorkspaceRepository extends BaseRepository<
  Workspace,
  Prisma.WorkspaceCreateInput,
  Prisma.WorkspaceUpdateInput
> {
  constructor() {
    super(prisma, prisma.workspace);
  }

  async findById(id: number): Promise<Workspace | null> {
    return prisma.workspace.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findAllForUser(
    userId: number,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: WorkspaceListItem[]; total: number }> {
    const skip = options?.page ? (options.page - 1) * (options.limit || 20) : 0;
    const take = options?.limit || 20;

    const where: Prisma.WorkspaceWhereInput = {
      members: {
        some: {
          userId,
          deletedAt: null,
        },
      },
      deletedAt: null,
    };

    const [data, total] = await Promise.all([
      prisma.workspace.findMany({
        where,
        include: {
          members: {
            where: { userId, deletedAt: null },
          },
          _count: {
            select: {
              members: { where: { deletedAt: null } },
              projects: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.workspace.count({ where }),
    ]);

    return { data, total };
  }

  async createWithOwner(
    data: Prisma.WorkspaceCreateInput,
    ownerId: number,
  ): Promise<Workspace> {
    return prisma.workspace.create({
      data: {
        ...data,
        members: {
          create: {
            userId: ownerId,
            role: WorkspaceRole.OWNER,
          },
        },
      },
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findMemberByUserId(
    workspaceId: number,
    userId: number,
  ): Promise<WorkspaceMember | null> {
    return prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, deletedAt: null },
    });
  }

  async findMemberById(
    workspaceId: number,
    memberId: number,
  ): Promise<WorkspaceMember | null> {
    return prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId, deletedAt: null },
    });
  }

  async addMember(
    workspaceId: number,
    userId: number,
    role: WorkspaceRole.MEMBER | WorkspaceRole.GUEST = WorkspaceRole.MEMBER,
  ): Promise<WorkspaceMemberWithUser> {
    return prisma.workspaceMember.create({
      data: { workspaceId, userId, role },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }

  async updateMemberRole(
    memberId: number,
    role: WorkspaceRole.MEMBER | WorkspaceRole.GUEST,
  ): Promise<WorkspaceMember> {
    return prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
    });
  }

  async removeMemberById(memberId: number): Promise<void> {
    await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { deletedAt: new Date() },
    });
  }

  async getMembers(
    workspaceId: number,
    options?: { page?: number; limit?: number; role?: WorkspaceRole },
  ): Promise<{ data: WorkspaceMemberWithUser[]; total: number }> {
    const skip = options?.page ? (options.page - 1) * (options.limit || 50) : 0;
    const take = options?.limit || 50;
    const where: Prisma.WorkspaceMemberWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(options?.role ? { role: options.role } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.workspaceMember.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
        skip,
        take,
      }),
      prisma.workspaceMember.count({ where }),
    ]);

    return { data, total };
  }

  async getStats(workspaceId: number): Promise<WorkspaceStats> {
    const [memberCount, projectCount, taskCount] = await Promise.all([
      prisma.workspaceMember.count({
        where: { workspaceId, deletedAt: null },
      }),
      prisma.project.count({
        where: { workspaceId, deletedAt: null },
      }),
      prisma.task.count({
        where: {
          deletedAt: null,
          project: { workspaceId, deletedAt: null },
        },
      }),
    ]);

    return { memberCount, projectCount, taskCount };
  }
}

export const workspaceRepository = new WorkspaceRepository();
