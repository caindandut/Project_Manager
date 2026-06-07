import { ProjectMember, ProjectRole } from '@prisma/client';
import { projectMemberRepository } from './project-member.repository';
import {
  AddProjectMemberInput,
  UpdateProjectMemberRoleInput,
  ProjectMemberListOptions,
  ProjectMemberWithUser,
} from './project-member.interface';
import { BaseService } from '../../common/base/BaseService';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { logger } from '../../common/utils/logger';
import { PaginationMeta, ListOptions } from '../../types/interfaces';
import { prisma } from '../../config';
import { realtimeService } from '../../common/realtime';
import { taskRepository } from '../task/task.repository';

export class ProjectMemberService extends BaseService<
  unknown,
  AddProjectMemberInput,
  UpdateProjectMemberRoleInput
> {
  // -----------------------------------------------------------------
  // GET members list
  // -----------------------------------------------------------------

  async getMembers(projectId: number, requesterId: number, options?: ProjectMemberListOptions) {
    // Verify project exists
    await this.findProjectOrThrow(projectId);

    // Check requester has accepted access to the project.
    await this.assertCanViewProject(projectId, requesterId);

    const result = await projectMemberRepository.findByProject(projectId, options);

    return {
      data: result.data.map((m) => this.formatMember(m)),
      meta: this.buildPaginationMeta(result.total, options?.page, options?.limit),
    };
  }

  // -----------------------------------------------------------------
  // ADD member (invite from workspace)
  // -----------------------------------------------------------------

  async addMember(projectId: number, data: AddProjectMemberInput, requesterId: number) {
    const project = await this.findProjectOrThrow(projectId);

    // RBAC: requester must be project ADMIN.
    await this.assertCanManageMembers(projectId, project.workspaceId, requesterId);

    // Target user must be a workspace member
    const workspaceMembership = await prisma.workspaceMember.findFirst({
      where: { userId: data.userId, workspaceId: project.workspaceId, deletedAt: null },
    });
    if (!workspaceMembership) {
      throw ApiError.badRequest(
        ErrorCode.MEMBER_NOT_FOUND,
        'User is not a member of the workspace containing this project',
      );
    }

    // Check if already a project member
    const existing = await projectMemberRepository.findByProjectAndUser(projectId, data.userId);
    if (existing) {
      throw ApiError.conflict(
        ErrorCode.MEMBER_ALREADY_EXISTS,
        'Đã là thành viên',
      );
    }

    const role: ProjectRole = data.role ?? 'MEMBER';
    const member = await projectMemberRepository.addMember(projectId, data.userId, role);

    // If it's not the creator adding themselves (which shouldn't happen via this endpoint normally),
    // we emit an invitation notification.
    if (requesterId !== data.userId) {
      const actor = await prisma.user.findUnique({ where: { id: requesterId } });
      await prisma.notification.create({
        data: {
          type: 'INVITATION_RECEIVED',
          category: 'DIRECT',
          title: 'Lời mời tham gia dự án',
          message: `${actor?.name || 'Ai đó'} đã mời bạn tham gia dự án "${project.name}"`,
          userId: data.userId,
          actorId: requesterId,
          metadata: { type: 'project', projectId, memberId: member.id },
        },
      });
      realtimeService.emitToUser(data.userId, {
        type: 'invitation',
        action: 'created',
        entityId: member.id,
        workspaceId: project.workspaceId,
        projectId,
        actorId: requesterId,
        userId: data.userId,
      });
    }

    logger.info(`User ${data.userId} added to project ${projectId} as ${role}`);
    realtimeService.emitToProject(project.workspaceId, projectId, {
      type: 'invitation',
      action: 'created',
      entityId: member.id,
      actorId: requesterId,
      userId: data.userId,
    });

    // Return full member info
    const created = await projectMemberRepository.findMemberById(projectId, member.id);
    return this.formatMember(created!);
  }

  async getMyInvitations(userId: number) {
    const invitations = await prisma.projectMember.findMany({
      where: {
        userId,
        deletedAt: null,
        project: {
          ownerId: { not: userId },
          deletedAt: null,
          workspace: {
            deletedAt: null,
          },
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            key: true,
            workspaceId: true,
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((invitation) => ({
      id: invitation.id,
      role: invitation.role,
      status: invitation.status,
      invitedAt: invitation.createdAt,
      joinedAt: invitation.joinedAt,
      project: {
        id: invitation.project.id,
        name: invitation.project.name,
        key: invitation.project.key,
        workspaceId: invitation.project.workspaceId,
        workspace: invitation.project.workspace,
      },
    }));
  }

  // -----------------------------------------------------------------
  // ACCEPT / DECLINE INVITATION
  // -----------------------------------------------------------------

  async acceptInvitation(projectId: number, memberId: number, requesterId: number) {
    const member = await this.findMemberOrThrow(projectId, memberId);

    if (member.userId !== requesterId) {
      throw ApiError.forbidden(ErrorCode.FORBIDDEN_ACCESS, 'You can only accept your own invitations');
    }

    if (member.status === 'ACCEPTED') {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Already accepted');
    }

    await prisma.projectMember.update({
      where: { id: memberId },
      data: { status: 'ACCEPTED' },
    });
    const project = await this.findProjectOrThrow(projectId);
    realtimeService.emitToProject(project.workspaceId, projectId, {
      type: 'invitation',
      action: 'accepted',
      entityId: memberId,
      actorId: requesterId,
      userId: requesterId,
    });
    realtimeService.emitToUser(requesterId, {
      type: 'invitation',
      action: 'accepted',
      entityId: memberId,
      workspaceId: project.workspaceId,
      projectId,
      actorId: requesterId,
      userId: requesterId,
    });

    return { message: 'Invitation accepted' };
  }

  async declineInvitation(projectId: number, memberId: number, requesterId: number) {
    const member = await this.findMemberOrThrow(projectId, memberId);

    if (member.userId !== requesterId) {
      throw ApiError.forbidden(ErrorCode.FORBIDDEN_ACCESS, 'You can only decline your own invitations');
    }

    if (member.status === 'ACCEPTED') {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Already accepted');
    }

    await prisma.projectMember.update({
      where: { id: memberId },
      data: { status: 'DECLINED' },
    });
    const project = await this.findProjectOrThrow(projectId);
    realtimeService.emitToProject(project.workspaceId, projectId, {
      type: 'invitation',
      action: 'declined',
      entityId: memberId,
      actorId: requesterId,
      userId: requesterId,
    });
    realtimeService.emitToUser(requesterId, {
      type: 'invitation',
      action: 'declined',
      entityId: memberId,
      workspaceId: project.workspaceId,
      projectId,
      actorId: requesterId,
      userId: requesterId,
    });

    return { message: 'Invitation declined' };
  }

  // -----------------------------------------------------------------
  // UPDATE member role
  // -----------------------------------------------------------------

  async updateMemberRole(
    projectId: number,
    memberId: number,
    data: UpdateProjectMemberRoleInput,
    requesterId: number,
  ) {
    const project = await this.findProjectOrThrow(projectId);

    // RBAC
    await this.assertCanManageMembers(projectId, project.workspaceId, requesterId);

    const member = await this.findMemberOrThrow(projectId, memberId);

    // Cannot change role of project ADMIN (project owner)
    if (member.role === 'ADMIN') {
      throw ApiError.badRequest(
        ErrorCode.FORBIDDEN_ACCESS,
        'Cannot change the role of the Project Admin',
      );
    }

    const updated = await projectMemberRepository.updateRole(memberId, data.role);

    logger.info(`Member ${memberId} role changed to ${data.role} in project ${projectId}`);
    realtimeService.emitToProject(project.workspaceId, projectId, {
      type: 'project',
      action: 'updated',
      entityId: memberId,
      actorId: requesterId,
      userId: member.userId,
    });

    return {
      id: updated.id,
      role: updated.role,
      updatedAt: updated.updatedAt,
    };
  }

  // -----------------------------------------------------------------
  // DELETE (soft-delete) member
  // -----------------------------------------------------------------

  async removeMember(projectId: number, memberId: number, requesterId: number) {
    const project = await this.findProjectOrThrow(projectId);

    // RBAC
    await this.assertCanManageMembers(projectId, project.workspaceId, requesterId);

    const member = await this.findMemberOrThrow(projectId, memberId);

    // Cannot remove project ADMIN
    if (member.role === 'ADMIN') {
      throw ApiError.badRequest(
        ErrorCode.FORBIDDEN_ACCESS,
        'Cannot remove the Project Admin from the project',
      );
    }

    await this.assertMemberHasNoActiveTasks(member.userId, projectId);

    await projectMemberRepository.removeMember(memberId);

    logger.info(`Member ${memberId} removed from project ${projectId}`);
    realtimeService.emitToProject(project.workspaceId, projectId, {
      type: 'project',
      action: 'deleted',
      entityId: memberId,
      actorId: requesterId,
      userId: member.userId,
    });
    realtimeService.emitToUser(member.userId, {
      type: 'project',
      action: 'deleted',
      entityId: memberId,
      workspaceId: project.workspaceId,
      projectId,
      actorId: requesterId,
      userId: member.userId,
    });

    return { message: 'Member removed successfully' };
  }

  // =================================================================
  // Abstract method implementations (BaseService contract)
  // =================================================================

  async getById(id: number): Promise<unknown> {
    const member = await prisma.projectMember.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });
    if (!member) {
      throw ApiError.notFound(ErrorCode.MEMBER_NOT_FOUND, 'Project member not found');
    }
    return this.formatMember(member as ProjectMemberWithUser);
  }

  getAll(_options?: ListOptions): Promise<{ data: unknown[]; meta?: PaginationMeta }> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  async create(data: AddProjectMemberInput): Promise<unknown> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Use addMember instead');
  }

  async update(id: number, data: UpdateProjectMemberRoleInput): Promise<unknown> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Use updateMemberRole instead');
  }

  async delete(id: number): Promise<unknown> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Use removeMember instead');
  }

  // =================================================================
  // Private helpers
  // =================================================================

  private async findProjectOrThrow(projectId: number) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) {
      throw ApiError.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
    }
    return project;
  }

  private async findMemberOrThrow(projectId: number, memberId: number) {
    const member = await projectMemberRepository.findMemberById(projectId, memberId);
    if (!member) {
      throw ApiError.notFound(ErrorCode.MEMBER_NOT_FOUND, 'Project member not found');
    }
    return member;
  }

  /**
   * Asserts the requester can view the project members.
   * Allowed: accepted project member or project owner.
   */
  private async assertCanViewProject(projectId: number, userId: number): Promise<void> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { ownerId: true },
    });
    if (!project) {
      throw ApiError.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
    }

    if (project.ownerId === userId) return;

    const projectMember = await prisma.projectMember.findFirst({
      where: { projectId, userId, status: 'ACCEPTED', deletedAt: null },
    });
    if (!projectMember) {
      throw ApiError.forbidden(
        ErrorCode.FORBIDDEN_ACCESS,
        'You are not a member of this project',
      );
    }
  }

  /**
   * Asserts the requester can manage project members (add/update/remove).
   * Allowed: accepted project ADMIN or project owner.
   */
  private async assertCanManageMembers(
    projectId: number,
    _workspaceId: number,
    userId: number,
  ): Promise<void> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { ownerId: true },
    });
    if (!project) {
      throw ApiError.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
    }

    if (project.ownerId === userId) return;

    const projectMember = await projectMemberRepository.findByProjectAndUser(projectId, userId);
    if (projectMember && projectMember.role === 'ADMIN' && projectMember.status === 'ACCEPTED') return;

    throw ApiError.forbidden(
      ErrorCode.FORBIDDEN_ACCESS,
      'Only project admin can manage project members',
    );
  }

  private async assertMemberHasNoActiveTasks(userId: number, projectId: number): Promise<void> {
    const summary = await taskRepository.findActiveAssignedTaskSummary(userId, {
      projectId,
      limit: 5,
    });

    if (summary.activeTaskCount > 0) {
      throw ApiError.conflict(
        ErrorCode.PROJECT_MEMBER_HAS_ACTIVE_TASKS,
        'Cannot remove this project member because they still have active tasks in this project.',
        summary,
      );
    }
  }

  private formatMember(member: ProjectMemberWithUser & { status?: string }) {
    return {
      id: member.id,
      user: {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        avatar: member.user.avatar,
      },
      role: member.role,
      status: member.status,
      joinedAt: member.joinedAt,
    };
  }
}

export const projectMemberService = new ProjectMemberService();
