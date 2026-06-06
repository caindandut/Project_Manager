import { BaseRepository } from '../../common/base/BaseRepository';
import { prisma } from '../../config';
import { Invitation, Prisma, User, Workspace, WorkspaceMember } from '@prisma/client';
import { InvitationStatus, WorkspaceRole } from '../../types/enums';

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

export type WorkspaceInvitationWithDetails = Invitation & {
  workspace: Pick<Workspace, 'id' | 'name' | 'slug'>;
  invitedBy: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
};

export interface WorkspaceStats {
  memberCount: number;
  projectCount: number;
  taskCount: number;
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
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

  private async findByIdOrSlug(workspaceId: string): Promise<Workspace | null> {
    const isNumeric = /^\d+$/.test(workspaceId);
    if (isNumeric) {
      return this.findById(Number(workspaceId));
    }
    return this.findBySlug(workspaceId);
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
              projects: { where: this.buildAccessibleProjectWhereForCount(userId) },
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
    data: { name: string; description?: string; logo?: string; teamSize?: string },
    ownerId: number,
  ): Promise<Workspace> {
    // Generate unique slug from name
    let baseSlug = this.generateSlug(data.name);
    let slug = baseSlug;
    let counter = 1;

    // Check if slug exists and generate unique one
    while (await this.isSlugTaken(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return prisma.workspace.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        logo: data.logo,
        teamSize: data.teamSize,
        members: {
          create: {
            userId: ownerId,
            role: WorkspaceRole.ADMIN,
          },
        },
      },
    });
  }

  generateSlug(name: string): string {
    let slug = name.toLowerCase();
    slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    slug = slug.replace(/\s+/g, '-');
    slug = slug.replace(/[^a-z0-9-]/g, '');
    slug = slug.replace(/-+/g, '-');
    slug = slug.replace(/^-+|-+$/g, '');
    return slug;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const normalizedEmail = this.normalizeEmail(email);
    const gmailDotlessEmail = this.getGmailDotlessEmail(normalizedEmail);
    const directMatch = await prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
    });
    if (directMatch) return directMatch;

    const rows = await prisma.$queryRaw<User[]>`
      SELECT
        id,
        email,
        name,
        password,
        google_id AS googleId,
        google_avatar AS googleAvatar,
        avatar,
        bio,
        system_role AS systemRole,
        is_blocked AS isBlocked,
        created_at AS createdAt,
        updated_at AS updatedAt,
        deleted_at AS deletedAt
      FROM users
      WHERE deleted_at IS NULL
        AND (
          LOWER(email) = ${normalizedEmail}
          ${
            gmailDotlessEmail
              ? Prisma.sql`
                OR (
                  LOWER(SUBSTRING_INDEX(email, '@', -1)) IN ('gmail.com', 'googlemail.com')
                  AND CONCAT(REPLACE(SUBSTRING_INDEX(LOWER(email), '@', 1), '.', ''), '@gmail.com') = ${gmailDotlessEmail}
                )
              `
              : Prisma.empty
          }
        )
      LIMIT 1
    `;

    return rows[0] ?? null;
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
    role: WorkspaceRole.ADMIN | WorkspaceRole.MEMBER | WorkspaceRole.GUEST = WorkspaceRole.MEMBER,
  ): Promise<WorkspaceMemberWithUser> {
    return prisma.workspaceMember.upsert({
      where: {
        uq_workspace_member_user_workspace: { userId, workspaceId },
      },
      create: { workspaceId, userId, role },
      update: { role, deletedAt: null, joinedAt: new Date() },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }

  async updateMemberRole(
    memberId: number,
    role: WorkspaceRole.ADMIN | WorkspaceRole.MEMBER | WorkspaceRole.GUEST,
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

  async getStats(workspaceId: number, userId: number): Promise<WorkspaceStats> {
    const accessibleProjectWhere: Prisma.ProjectWhereInput = this.buildAccessibleProjectWhere(
      workspaceId,
      userId,
    );
    const taskWhere: Prisma.TaskWhereInput = {
      deletedAt: null,
      project: accessibleProjectWhere,
    };

    const [memberCount, projectCount, taskCount, statusCounts] = await Promise.all([
      prisma.workspaceMember.count({
        where: { workspaceId, deletedAt: null },
      }),
      prisma.project.count({
        where: accessibleProjectWhere,
      }),
      prisma.task.count({
        where: taskWhere,
      }),
      prisma.task.groupBy({
        by: ['status'],
        where: taskWhere,
        _count: { _all: true },
      }),
    ]);

    const getCount = (status: string) =>
      statusCounts.find((item) => item.status === status)?._count._all ?? 0;

    return {
      memberCount,
      projectCount,
      taskCount,
      todoCount: getCount('TODO'),
      inProgressCount: getCount('IN_PROGRESS'),
      doneCount: getCount('DONE'),
    };
  }

  async getRecentTasks(workspaceId: number, userId: number, take = 8) {
    return prisma.task.findMany({
      where: {
        deletedAt: null,
        project: this.buildAccessibleProjectWhere(workspaceId, userId),
      },
      include: {
        project: {
          select: { id: true, name: true, key: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  async getRecentActivities(workspaceId: number, userId: number, take = 8) {
    return prisma.activityLog.findMany({
      where: {
        OR: [
          {
            task: {
              project: this.buildAccessibleProjectWhere(workspaceId, userId),
            },
          },
          {
            entityType: 'WORKSPACE',
            entityId: workspaceId,
          },
        ],
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            project: {
              select: { id: true, name: true, key: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
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
              status: InvitationStatus.ACCEPTED,
              deletedAt: null,
            },
          },
        },
      ],
    };
  }

  private buildAccessibleProjectWhereForCount(userId: number): Prisma.ProjectWhereInput {
    return {
      deletedAt: null,
      OR: [
        { ownerId: userId },
        {
          projectMembers: {
            some: {
              userId,
              status: InvitationStatus.ACCEPTED,
              deletedAt: null,
            },
          },
        },
      ],
    };
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    return prisma.workspace.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  async findBySlugForUser(slug: string, userId: number): Promise<Workspace | null> {
    return prisma.workspace.findFirst({
      where: {
        slug,
        deletedAt: null,
        members: {
          some: {
            userId,
            deletedAt: null,
          },
        },
      },
    });
  }

  async findInvitations(workspaceId: number) {
    return prisma.invitation.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        invitedBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingInvitationByEmail(
    workspaceId: number,
    email: string,
  ): Promise<Invitation | null> {
    const invitationIds = await this.findInvitationIdsByEmail(email, {
      workspaceId,
      pendingOnly: true,
    });
    if (invitationIds.length === 0) return null;

    return prisma.invitation.findFirst({
      where: {
        id: { in: invitationIds },
      },
    });
  }

  async createInvitation(data: {
    workspaceId: number;
    invitedById: number;
    email: string;
    role: WorkspaceRole.ADMIN | WorkspaceRole.MEMBER | WorkspaceRole.GUEST;
    token: string;
    expiresAt: Date;
  }): Promise<WorkspaceInvitationWithDetails> {
    return prisma.invitation.create({
      data,
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        invitedBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }

  async findInvitationByToken(token: string): Promise<WorkspaceInvitationWithDetails | null> {
    return prisma.invitation.findFirst({
      where: { token, deletedAt: null },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        invitedBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }

  async findInvitationsByEmail(email: string): Promise<WorkspaceInvitationWithDetails[]> {
    const invitationIds = await this.findInvitationIdsByEmail(email);
    if (invitationIds.length === 0) return [];

    return prisma.invitation.findMany({
      where: {
        id: { in: invitationIds },
      },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        invitedBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateInvitationStatus(
    invitationId: number,
    status: InvitationStatus.ACCEPTED | InvitationStatus.DECLINED | InvitationStatus.EXPIRED,
  ): Promise<Invitation> {
    return prisma.invitation.update({
      where: { id: invitationId },
      data: { status },
    });
  }

  async acceptPendingInvitationsForUser(user: Pick<User, 'id' | 'email'>): Promise<void> {
    const invitationIds = await this.findInvitationIdsByEmail(user.email, {
      pendingOnly: true,
    });
    if (invitationIds.length === 0) return;

    const invitations = await prisma.invitation.findMany({
      where: {
        id: { in: invitationIds },
      },
    });

    for (const invitation of invitations) {
      const existingMember = await this.findMemberByUserId(invitation.workspaceId, user.id);
      if (!existingMember) {
        await this.addMember(
          invitation.workspaceId,
          user.id,
          invitation.role as WorkspaceRole.ADMIN | WorkspaceRole.MEMBER | WorkspaceRole.GUEST,
        );
      }

      await this.updateInvitationStatus(invitation.id, InvitationStatus.ACCEPTED);
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private getGmailDotlessEmail(email: string): string | null {
    const normalizedEmail = this.normalizeEmail(email);
    const [localPart, domain] = normalizedEmail.split('@');
    if (!localPart || !domain || (domain !== 'gmail.com' && domain !== 'googlemail.com')) {
      return null;
    }

    return `${localPart.replace(/\./g, '')}@gmail.com`;
  }

  private async findInvitationIdsByEmail(
    email: string,
    options?: { workspaceId?: number; pendingOnly?: boolean },
  ): Promise<number[]> {
    const normalizedEmail = this.normalizeEmail(email);
    const gmailDotlessEmail = this.getGmailDotlessEmail(normalizedEmail);
    const rows = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id
      FROM invitations
      WHERE deleted_at IS NULL
        AND (
          LOWER(email) = ${normalizedEmail}
          ${
            gmailDotlessEmail
              ? Prisma.sql`
                OR (
                  LOWER(SUBSTRING_INDEX(email, '@', -1)) IN ('gmail.com', 'googlemail.com')
                  AND CONCAT(REPLACE(SUBSTRING_INDEX(LOWER(email), '@', 1), '.', ''), '@gmail.com') = ${gmailDotlessEmail}
                )
              `
              : Prisma.empty
          }
        )
        ${options?.workspaceId ? Prisma.sql`AND workspace_id = ${options.workspaceId}` : Prisma.empty}
        ${options?.pendingOnly ? Prisma.sql`AND status = ${InvitationStatus.PENDING} AND expires_at > NOW()` : Prisma.empty}
      ORDER BY created_at DESC
    `;

    return rows.map((row) => Number(row.id));
  }

  async cancelInvitation(invitationId: number): Promise<void> {
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { deletedAt: new Date() },
    });
  }

  async isSlugTaken(slug: string, excludeId?: number): Promise<boolean> {
    const count = await prisma.workspace.count({
      where: {
        slug,
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    return count > 0;
  }

  async updateSlug(id: number, slug: string): Promise<Workspace> {
    return prisma.workspace.update({
      where: { id },
      data: { slug },
    });
  }
}

export const workspaceRepository = new WorkspaceRepository();
