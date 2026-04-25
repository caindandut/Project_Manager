import { Workspace, WorkspaceMember } from '@prisma/client';
import { workspaceRepository, WorkspaceListItem, WorkspaceMemberWithUser } from './workspace.repository';
import { BaseService } from '../../common/base/BaseService';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode, WorkspaceRole } from '../../types/enums';
import { logger } from '../../common/utils/logger';
import { PaginationMeta, ListOptions } from '../../types/interfaces';

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  logo?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  logo?: string;
}

export interface InviteMemberInput {
  email: string;
  role?: WorkspaceRole;
}

export interface UpdateMemberRoleInput {
  role: WorkspaceRole;
}

interface WorkspaceListOptions {
  page?: number;
  limit?: number;
}

interface WorkspaceMemberListOptions extends WorkspaceListOptions {
  role?: WorkspaceRole;
}

type FormattedWorkspace = {
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class WorkspaceService extends BaseService<
  unknown,
  CreateWorkspaceInput,
  UpdateWorkspaceInput
> {
  async createForUser(data: CreateWorkspaceInput, userId: number) {
    const workspace = await workspaceRepository.createWithOwner(
      {
        name: data.name,
        description: data.description,
        logo: data.logo,
      },
      userId,
    );

    logger.info(`Workspace created: ${workspace.id} by user ${userId}`);
    return this.formatWorkspace(workspace);
  }

  async getWorkspaceDetail(workspaceId: number, userId: number) {
    const workspace = await this.findWorkspaceOrThrow(workspaceId);
    const [member, stats] = await Promise.all([
      workspaceRepository.findMemberByUserId(workspaceId, userId),
      workspaceRepository.getStats(workspaceId),
    ]);

    if (!member) {
      throw ApiError.forbidden(
        ErrorCode.FORBIDDEN_ACCESS,
        'You are not a member of this workspace',
      );
    }

    return {
      ...this.formatWorkspace(workspace),
      role: member.role,
      stats,
    };
  }

  async getAllForUser(userId: number, options?: WorkspaceListOptions) {
    const result = await workspaceRepository.findAllForUser(userId, options);

    return {
      data: result.data.map((workspace) => this.formatWorkspaceListItem(workspace)),
      meta: this.buildPaginationMeta(result.total, options?.page, options?.limit),
    };
  }

  async update(id: number, data: UpdateWorkspaceInput) {
    await this.findWorkspaceOrThrow(id);
    const updated = await workspaceRepository.update(id, data);
    return {
      ...this.formatWorkspace(updated),
      updatedAt: updated.updatedAt,
    };
  }

  async delete(id: number) {
    await this.findWorkspaceOrThrow(id);
    await workspaceRepository.softDelete(id);

    logger.info(`Workspace deleted: ${id}`);
    return { message: 'Workspace deleted successfully' };
  }

  async getMembers(workspaceId: number, options?: WorkspaceMemberListOptions) {
    await this.findWorkspaceOrThrow(workspaceId);
    const result = await workspaceRepository.getMembers(workspaceId, options);

    return {
      data: result.data.map((member) => this.formatMember(member)),
      meta: this.buildPaginationMeta(result.total, options?.page, options?.limit),
    };
  }

  async inviteMember(workspaceId: number, data: InviteMemberInput) {
    await this.findWorkspaceOrThrow(workspaceId);

    const role = data.role || WorkspaceRole.MEMBER;
    if (role === WorkspaceRole.OWNER) {
      throw ApiError.badRequest(
        ErrorCode.VALIDATION_ERROR,
        'Cannot invite a member as OWNER',
      );
    }

    const user = await workspaceRepository.findUserByEmail(data.email);
    if (!user) {
      throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    const existingMember = await workspaceRepository.findMemberByUserId(workspaceId, user.id);
    if (existingMember) {
      throw ApiError.conflict(
        ErrorCode.MEMBER_ALREADY_EXISTS,
        'User is already a member of this workspace',
      );
    }

    const member = await workspaceRepository.addMember(workspaceId, user.id, role);
    logger.info(`User ${user.id} added to workspace ${workspaceId} as ${role}`);

    return this.formatMember(member);
  }

  async updateMemberRole(
    workspaceId: number,
    memberId: number,
    data: UpdateMemberRoleInput,
    requesterId: number,
  ) {
    const member = await this.findMemberOrThrow(workspaceId, memberId);

    if (data.role === WorkspaceRole.OWNER) {
      throw ApiError.badRequest(
        ErrorCode.MEMBER_CANNOT_CHANGE_OWNER_ROLE,
        'Cannot assign OWNER role from this endpoint',
      );
    }

    if (member.role === WorkspaceRole.OWNER || member.userId === requesterId) {
      throw ApiError.badRequest(
        ErrorCode.MEMBER_CANNOT_CHANGE_OWNER_ROLE,
        'Cannot change this member role',
      );
    }

    const updated = await workspaceRepository.updateMemberRole(member.id, data.role);
    return {
      id: updated.id,
      role: updated.role,
      updatedAt: updated.updatedAt,
    };
  }

  async removeMember(workspaceId: number, memberId: number, requesterId: number) {
    const member = await this.findMemberOrThrow(workspaceId, memberId);

    if (member.role === WorkspaceRole.OWNER) {
      throw ApiError.badRequest(
        ErrorCode.WORKSPACE_CANNOT_REMOVE_OWNER,
        'Cannot remove workspace owner',
      );
    }

    if (member.userId === requesterId) {
      throw ApiError.badRequest(
        ErrorCode.MEMBER_CANNOT_REMOVE_SELF,
        'Cannot remove yourself from workspace',
      );
    }

    await workspaceRepository.removeMemberById(member.id);
    logger.info(`Member ${member.id} removed from workspace ${workspaceId}`);

    return { message: 'Member removed successfully' };
  }

  async leave(workspaceId: number, userId: number) {
    const member = await workspaceRepository.findMemberByUserId(workspaceId, userId);
    if (!member) {
      throw ApiError.notFound(ErrorCode.MEMBER_NOT_FOUND, 'Member not found');
    }

    if (member.role === WorkspaceRole.OWNER) {
      throw ApiError.badRequest(
        ErrorCode.WORKSPACE_LEAVE_FORBIDDEN,
        'Owner cannot leave the workspace. Transfer ownership first.',
      );
    }

    await workspaceRepository.removeMemberById(member.id);
    logger.info(`User ${userId} left workspace ${workspaceId}`);

    return { message: 'Left workspace successfully' };
  }

  async getById(id: number): Promise<unknown> {
    const workspace = await this.findWorkspaceOrThrow(id);
    return this.formatWorkspace(workspace);
  }

  getAll(_options?: ListOptions): Promise<{ data: unknown[]; meta?: PaginationMeta }> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  create(_data: CreateWorkspaceInput): Promise<unknown> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  private async findWorkspaceOrThrow(workspaceId: number): Promise<Workspace> {
    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw ApiError.notFound(ErrorCode.WORKSPACE_NOT_FOUND, 'Workspace not found');
    }

    return workspace;
  }

  private async findMemberOrThrow(
    workspaceId: number,
    memberId: number,
  ): Promise<WorkspaceMember> {
    const member = await workspaceRepository.findMemberById(workspaceId, memberId);
    if (!member) {
      throw ApiError.notFound(ErrorCode.MEMBER_NOT_FOUND, 'Member not found');
    }

    return member;
  }

  private formatWorkspace(workspace: Workspace): FormattedWorkspace {
    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      logo: workspace.logo,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }

  private formatWorkspaceListItem(workspace: WorkspaceListItem) {
    return {
      ...this.formatWorkspace(workspace),
      role: workspace.members[0]?.role,
      memberCount: workspace._count.members,
      projectCount: workspace._count.projects,
    };
  }

  private formatMember(member: WorkspaceMemberWithUser) {
    return {
      id: member.id,
      user: {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        avatar: member.user.avatar,
      },
      role: member.role,
      joinedAt: member.joinedAt,
    };
  }
}

export const workspaceService = new WorkspaceService();
