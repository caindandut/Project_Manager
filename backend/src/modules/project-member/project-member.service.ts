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

    // Check requester is a member of the project (or workspace admin)
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

    // RBAC: requester must be workspace Admin/Owner OR project ADMIN
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

    logger.info(`User ${data.userId} added to project ${projectId} as ${role}`);

    // Return full member info
    const created = await projectMemberRepository.findMemberById(projectId, member.id);
    return this.formatMember(created!);
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

    await projectMemberRepository.removeMember(memberId);

    logger.info(`Member ${memberId} removed from project ${projectId}`);

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
   * Allowed: project member OR workspace admin/owner.
   */
  private async assertCanViewProject(projectId: number, userId: number): Promise<void> {
    const projectMember = await projectMemberRepository.findByProjectAndUser(projectId, userId);
    if (projectMember) return;

    // Fallback: check if workspace admin/owner
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { workspaceId: true },
    });
    if (!project) {
      throw ApiError.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
    }

    const wsMember = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: project.workspaceId,
        deletedAt: null,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });
    if (!wsMember) {
      throw ApiError.forbidden(
        ErrorCode.FORBIDDEN_ACCESS,
        'You are not a member of this project',
      );
    }
  }

  /**
   * Asserts the requester can manage project members (add/update/remove).
   * Allowed: workspace OWNER/ADMIN or project ADMIN.
   */
  private async assertCanManageMembers(
    projectId: number,
    workspaceId: number,
    userId: number,
  ): Promise<void> {
    // Check workspace-level admin
    const wsMember = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId,
        deletedAt: null,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });
    if (wsMember) return;

    // Check project-level ADMIN
    const projectMember = await projectMemberRepository.findByProjectAndUser(projectId, userId);
    if (projectMember && projectMember.role === 'ADMIN') return;

    throw ApiError.forbidden(
      ErrorCode.FORBIDDEN_ACCESS,
      'Only workspace admin or project admin can manage project members',
    );
  }

  private formatMember(member: ProjectMemberWithUser) {
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

export const projectMemberService = new ProjectMemberService();
