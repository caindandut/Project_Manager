import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Prisma, Workspace, WorkspaceMember } from '@prisma/client';
import {
  workspaceRepository,
  WorkspaceInvitationWithDetails,
  WorkspaceListItem,
  WorkspaceMemberWithUser,
} from './workspace.repository';
import { BaseService } from '../../common/base/BaseService';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode, InvitationStatus, WorkspaceRole } from '../../types/enums';
import { logger } from '../../common/utils/logger';
import { PaginationMeta, ListOptions } from '../../types/interfaces';
import { config, prisma } from '../../config';
import { sendWorkspaceInvitationEmail } from '../../common/utils/email.service';
import { notificationEmitter } from '../notification/notification-emitter';
import { realtimeService } from '../../common/realtime';
import { taskRepository } from '../task/task.repository';

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  logo?: string;
  teamSize?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  logo?: string;
  teamSize?: string;
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
  slug: string;
  description: string | null;
  logo: string | null;
  teamSize: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

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
        teamSize: data.teamSize,
      },
      userId,
    );

    logger.info(`Workspace created: ${workspace.id} by user ${userId}`);
    realtimeService.emitToUser(userId, {
      type: 'workspace',
      action: 'created',
      entityId: workspace.id,
      workspaceId: workspace.id,
      actorId: userId,
    });
    realtimeService.emitToOwners({
      type: 'workspace',
      action: 'created',
      entityId: workspace.id,
      workspaceId: workspace.id,
      actorId: userId,
    });

    return this.formatWorkspace(workspace);
  }

  async getWorkspaceDetail(workspaceId: string | number, userId: number) {
    const workspace = await this.findWorkspaceOrThrow(workspaceId);
    const [member, stats, recentTasks, recentActivities] = await Promise.all([
      workspaceRepository.findMemberByUserId(workspace.id, userId),
      workspaceRepository.getStats(workspace.id, userId),
      workspaceRepository.getRecentTasks(workspace.id, userId),
      workspaceRepository.getRecentActivities(workspace.id, userId),
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
      recentTasks: recentTasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        updatedAt: task.updatedAt,
        createdAt: task.createdAt,
        project: task.project,
        assignee: task.assignee,
        assignees: task.assignees.map((assignee) => assignee.user),
      })),
      recentActivities: recentActivities.map((activity) => ({
        id: activity.id,
        action: activity.action,
        entityType: activity.entityType,
        entityId: activity.entityId,
        metadata: activity.metadata,
        createdAt: activity.createdAt,
        user: activity.user,
        task: activity.task,
      })),
    };
  }

  async getAllForUser(userId: number, options?: WorkspaceListOptions) {
    const result = await workspaceRepository.findAllForUser(userId, options);

    return {
      data: result.data.map((workspace) => this.formatWorkspaceListItem(workspace)),
      meta: this.buildPaginationMeta(result.total, options?.page, options?.limit),
    };
  }

  async update(id: string | number, data: UpdateWorkspaceInput) {
    const workspace = await this.findWorkspaceOrThrow(id);
    const updateData: Prisma.WorkspaceUpdateInput = { ...data };

    if (data.name && data.name !== workspace.name) {
      let baseSlug = workspaceRepository.generateSlug(data.name);
      let slug = baseSlug;
      let counter = 1;
      while (await workspaceRepository.isSlugTaken(slug, workspace.id)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      updateData.slug = slug;
    }

    // Process base64 logo image and save to disk
    if (data.logo && data.logo.startsWith('data:image/')) {
      try {
        const matches = data.logo.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          let ext = '.png';
          if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') ext = '.jpg';
          else if (mimeType === 'image/gif') ext = '.gif';
          else if (mimeType === 'image/webp') ext = '.webp';
          
          // Clean up old logo
          if (workspace.logo && workspace.logo.startsWith('/uploads/logos/')) {
            const oldPath = path.join(process.cwd(), workspace.logo);
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          }

          // Create logos folder
          const logosDir = path.join(process.cwd(), 'uploads', 'logos');
          if (!fs.existsSync(logosDir)) {
            fs.mkdirSync(logosDir, { recursive: true });
          }

          const filename = `logo-${workspace.id}-${Date.now()}${ext}`;
          const filePath = path.join(logosDir, filename);
          fs.writeFileSync(filePath, buffer);

          updateData.logo = `/uploads/logos/${filename}`;
        }
      } catch (err) {
        logger.error(`Failed to upload workspace logo: ${err}`);
      }
    }

    const updated = await workspaceRepository.update(workspace.id, updateData);
    realtimeService.emitToWorkspace(workspace.id, {
      type: 'workspace',
      action: 'updated',
      entityId: workspace.id,
    });
    realtimeService.emitToOwners({
      type: 'workspace',
      action: 'updated',
      entityId: workspace.id,
      workspaceId: workspace.id,
    });

    return {
      ...this.formatWorkspace(updated),
      updatedAt: updated.updatedAt,
    };
  }

  async delete(id: string | number) {
    const workspace = await this.findWorkspaceOrThrow(id);

    // Ràng buộc: tất cả task trong workspace phải là DONE hoặc CANCELLED
    const activeTaskCount = await workspaceRepository.countActiveTasksInWorkspace(workspace.id);
    if (activeTaskCount > 0) {
      throw ApiError.conflict(
        ErrorCode.WORKSPACE_HAS_ACTIVE_TASKS,
        `Không thể xóa không gian làm việc vì còn ${activeTaskCount} công việc chưa hoàn thành. Hãy chuyển tất cả công việc sang Hoàn thành hoặc Hủy trước.`,
        { activeTaskCount },
      );
    }

    await workspaceRepository.softDelete(workspace.id);

    logger.info(`Workspace deleted: ${workspace.id}`);
    realtimeService.emitToWorkspace(workspace.id, {
      type: 'workspace',
      action: 'deleted',
      entityId: workspace.id,
    });
    realtimeService.emitToOwners({
      type: 'workspace',
      action: 'deleted',
      entityId: workspace.id,
      workspaceId: workspace.id,
    });

    return { message: 'Workspace deleted successfully' };
  }

  async getMembers(id: string | number, options?: WorkspaceMemberListOptions) {
    const workspace = await this.findWorkspaceOrThrow(id);
    const result = await workspaceRepository.getMembers(workspace.id, options);

    return {
      data: result.data.map((member) => this.formatMember(member)),
      meta: this.buildPaginationMeta(result.total, options?.page, options?.limit),
    };
  }

  async inviteMember(id: string | number, data: InviteMemberInput, inviterId: number) {
    const workspace = await this.findWorkspaceOrThrow(id);

    const email = data.email.trim().toLowerCase();
    const role = data.role || WorkspaceRole.MEMBER;
    if (role === WorkspaceRole.OWNER) {
      throw ApiError.badRequest(
        ErrorCode.VALIDATION_ERROR,
        'Cannot invite a member as OWNER',
      );
    }

    const [user, inviter] = await Promise.all([
      workspaceRepository.findUserByEmail(email),
      prisma.user.findUnique({ where: { id: inviterId } }),
    ]);

    if (!inviter) {
      throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'Inviter not found');
    }

    const existingMember = user
      ? await workspaceRepository.findMemberByUserId(workspace.id, user.id)
      : null;
    if (existingMember) {
      throw ApiError.conflict(
        ErrorCode.MEMBER_ALREADY_EXISTS,
        'User is already a member of this workspace',
      );
    }

    const existingInvitation = await workspaceRepository.findPendingInvitationByEmail(workspace.id, email);
    if (existingInvitation) {
      throw ApiError.conflict(
        ErrorCode.VALIDATION_ERROR,
        'A pending invitation already exists for this email',
      );
    }

    const invitation = await workspaceRepository.createInvitation({
      workspaceId: workspace.id,
      invitedById: inviterId,
      email,
      role: role as WorkspaceRole.ADMIN | WorkspaceRole.MEMBER | WorkspaceRole.GUEST,
      token: crypto.randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + INVITATION_EXPIRY_MS),
    });

    logger.info(`Invitation ${invitation.id} sent to ${email} for workspace ${workspace.id} as ${role}`);
    realtimeService.emitToWorkspace(workspace.id, {
      type: 'invitation',
      action: 'created',
      entityId: invitation.id,
      actorId: inviterId,
      userId: user?.id,
    });
    if (user) {
      realtimeService.emitToUser(user.id, {
        type: 'invitation',
        action: 'created',
        entityId: invitation.id,
        workspaceId: workspace.id,
        actorId: inviterId,
        userId: user.id,
      });
    }

    this.dispatchInvitationSideEffects({
      invitationId: invitation.id,
      email,
      workspaceName: workspace.name,
      inviterName: inviter.name || inviter.email,
      inviterId,
      inviteeUserId: user?.id,
      role,
      token: invitation.token,
      isExistingUser: Boolean(user),
    });

    return this.formatInvitation(invitation);
  }

  async updateMemberRole(
    id: string | number,
    memberId: number,
    data: UpdateMemberRoleInput,
    requesterId: number,
  ) {
    const workspace = await this.findWorkspaceOrThrow(id);
    const member = await this.findMemberOrThrow(workspace.id, memberId);

    if (data.role === WorkspaceRole.OWNER) {
      throw ApiError.badRequest(
        ErrorCode.MEMBER_CANNOT_CHANGE_OWNER_ROLE,
        'Cannot assign OWNER role from this endpoint',
      );
    }

    if (member.userId === requesterId) {
      throw ApiError.badRequest(
        ErrorCode.MEMBER_CANNOT_CHANGE_OWNER_ROLE,
        'Cannot change your own role',
      );
    }

    const updated = await workspaceRepository.updateMemberRole(member.id, data.role);
    realtimeService.emitToWorkspace(workspace.id, {
      type: 'workspace',
      action: 'updated',
      entityId: member.id,
      actorId: requesterId,
      userId: member.userId,
    });

    return {
      id: updated.id,
      role: updated.role,
      updatedAt: updated.updatedAt,
    };
  }

  async removeMember(id: string | number, memberId: number, requesterId: number) {
    const workspace = await this.findWorkspaceOrThrow(id);
    const member = await this.findMemberOrThrow(workspace.id, memberId);

    if (member.userId === requesterId) {
      throw ApiError.badRequest(
        ErrorCode.MEMBER_CANNOT_REMOVE_SELF,
        'Cannot remove yourself from workspace',
      );
    }

    await this.assertMemberHasNoActiveWorkspaceTasks(member.userId, workspace.id);

    await workspaceRepository.removeMemberById(member.id);
    logger.info(`Member ${member.id} removed from workspace ${workspace.id}`);
    realtimeService.emitToWorkspace(workspace.id, {
      type: 'workspace',
      action: 'deleted',
      entityId: member.id,
      actorId: requesterId,
      userId: member.userId,
    });
    realtimeService.emitToUser(member.userId, {
      type: 'workspace',
      action: 'deleted',
      entityId: member.id,
      workspaceId: workspace.id,
      actorId: requesterId,
      userId: member.userId,
    });

    const requester = await prisma.user.findUnique({ where: { id: requesterId } });
    if (requester) {
      const { notificationEmitter } = await import('../notification/notification-emitter');
      void notificationEmitter.onRemovedFromWorkspace(
        workspace.name,
        requester.name || requester.email,
        member.userId,
        requesterId,
      );
    }

    return { message: 'Member removed successfully' };
  }

  async leave(id: string | number, userId: number) {
    const workspace = await this.findWorkspaceOrThrow(id);
    const member = await workspaceRepository.findMemberByUserId(workspace.id, userId);
    if (!member) {
      throw ApiError.notFound(ErrorCode.MEMBER_NOT_FOUND, 'Member not found');
    }

    await this.assertMemberHasNoActiveWorkspaceTasks(userId, workspace.id);

    await workspaceRepository.removeMemberById(member.id);
    logger.info(`User ${userId} left workspace ${workspace.id}`);
    realtimeService.emitToWorkspace(workspace.id, {
      type: 'workspace',
      action: 'deleted',
      entityId: member.id,
      actorId: userId,
      userId,
    });

    return { message: 'Left workspace successfully' };
  }

  async getPendingInvitations(id: string | number) {
    const workspace = await this.findWorkspaceOrThrow(id);
    const invitations = await workspaceRepository.findInvitations(workspace.id);

    return {
      data: invitations.map((inv) => this.formatInvitation(inv)),
    };
  }

  async getInvitationByToken(token: string) {
    const invitation = await this.findInvitationByTokenOrThrow(token);
    const existingUser = await workspaceRepository.findUserByEmail(this.normalizeEmail(invitation.email));

    return {
      ...this.formatInvitation(invitation),
      isExistingUser: Boolean(existingUser),
    };
  }

  async getMyInvitations(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    const invitations = await workspaceRepository.findInvitationsByEmail(this.normalizeEmail(user.email));
    return {
      data: invitations.map((inv) => this.formatInvitation(inv)),
    };
  }

  async acceptInvitation(token: string, userId: number) {
    const invitation = await this.findInvitationByTokenOrThrow(token);
    this.assertInvitationCanBeAnswered(invitation);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    if (!this.emailsMatch(user.email, invitation.email)) {
      throw ApiError.forbidden(ErrorCode.FORBIDDEN_ACCESS, 'This invitation belongs to another email');
    }

    const existingMember = await workspaceRepository.findMemberByUserId(invitation.workspaceId, user.id);
    if (!existingMember) {
      await workspaceRepository.addMember(
        invitation.workspaceId,
        user.id,
        invitation.role as WorkspaceRole.ADMIN | WorkspaceRole.MEMBER | WorkspaceRole.GUEST,
      );
    }

    const updated = await workspaceRepository.updateInvitationStatus(
      invitation.id,
      InvitationStatus.ACCEPTED,
    );

    logger.info(`Invitation ${invitation.id} accepted by ${invitation.email}`);
    realtimeService.emitToWorkspace(invitation.workspaceId, {
      type: 'invitation',
      action: 'accepted',
      entityId: invitation.id,
      actorId: user.id,
      userId: user.id,
    });
    realtimeService.emitToUser(user.id, {
      type: 'invitation',
      action: 'accepted',
      entityId: invitation.id,
      workspaceId: invitation.workspaceId,
      actorId: user.id,
      userId: user.id,
    });

    return {
      ...this.formatInvitation({ ...invitation, ...updated }),
      workspace: invitation.workspace,
    };
  }

  async declineInvitation(token: string, userId: number) {
    const invitation = await this.findInvitationByTokenOrThrow(token);
    this.assertInvitationCanBeAnswered(invitation);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    if (!this.emailsMatch(user.email, invitation.email)) {
      throw ApiError.forbidden(ErrorCode.FORBIDDEN_ACCESS, 'This invitation belongs to another email');
    }

    const updated = await workspaceRepository.updateInvitationStatus(
      invitation.id,
      InvitationStatus.DECLINED,
    );

    logger.info(`Invitation ${invitation.id} declined by ${invitation.email}`);
    realtimeService.emitToWorkspace(invitation.workspaceId, {
      type: 'invitation',
      action: 'declined',
      entityId: invitation.id,
      actorId: user.id,
      userId: user.id,
    });
    realtimeService.emitToUser(user.id, {
      type: 'invitation',
      action: 'declined',
      entityId: invitation.id,
      workspaceId: invitation.workspaceId,
      actorId: user.id,
      userId: user.id,
    });

    return this.formatInvitation({ ...invitation, ...updated });
  }

  async declineInvitationByToken(token: string) {
    const invitation = await this.findInvitationByTokenOrThrow(token);
    this.assertInvitationCanBeAnswered(invitation);

    const updated = await workspaceRepository.updateInvitationStatus(
      invitation.id,
      InvitationStatus.DECLINED,
    );

    logger.info(`Invitation ${invitation.id} declined by public token`);
    realtimeService.emitToWorkspace(invitation.workspaceId, {
      type: 'invitation',
      action: 'declined',
      entityId: invitation.id,
    });

    return this.formatInvitation({ ...invitation, ...updated });
  }

  async cancelInvitation(id: string | number, invitationId: number, userId: number) {
    const workspace = await this.findWorkspaceOrThrow(id);
    const member = await workspaceRepository.findMemberByUserId(workspace.id, userId);
    if (!member || member.role !== WorkspaceRole.ADMIN) {
      throw ApiError.forbidden(ErrorCode.FORBIDDEN_ACCESS, 'Only workspace admin can cancel invitations');
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, workspaceId: workspace.id, status: 'PENDING', deletedAt: null },
    });

    if (!invitation) {
      throw ApiError.notFound(ErrorCode.INVITATION_NOT_FOUND, 'Invitation not found');
    }

    await workspaceRepository.cancelInvitation(invitationId);
    logger.info(`Invitation ${invitationId} cancelled by user ${userId}`);
    realtimeService.emitToWorkspace(workspace.id, {
      type: 'invitation',
      action: 'cancelled',
      entityId: invitationId,
      actorId: userId,
    });

    return { message: 'Invitation cancelled successfully' };
  }

  async getById(id: string | number): Promise<unknown> {
    const workspace = await this.findWorkspaceOrThrow(id);
    return this.formatWorkspace(workspace);
  }

  getAll(_options?: ListOptions): Promise<{ data: unknown[]; meta?: PaginationMeta }> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  create(_data: CreateWorkspaceInput): Promise<unknown> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  private async findWorkspaceOrThrow(workspaceId: string | number): Promise<Workspace> {
    const isNumeric = /^\d+$/.test(String(workspaceId));
    const workspace = isNumeric
      ? await workspaceRepository.findById(Number(workspaceId))
      : await workspaceRepository.findBySlug(String(workspaceId));
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

  private async findInvitationByTokenOrThrow(token: string): Promise<WorkspaceInvitationWithDetails> {
    const invitation = await workspaceRepository.findInvitationByToken(token);
    if (!invitation) {
      throw ApiError.notFound(ErrorCode.INVITATION_NOT_FOUND, 'Invitation not found');
    }

    return invitation;
  }

  private assertInvitationCanBeAnswered(invitation: WorkspaceInvitationWithDetails): void {
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw ApiError.badRequest(ErrorCode.INVITATION_ALREADY_ACCEPTED, 'Invitation already accepted');
    }

    if (invitation.status === InvitationStatus.DECLINED) {
      throw ApiError.badRequest(ErrorCode.INVITATION_ALREADY_DECLINED, 'Invitation already declined');
    }

    if (invitation.expiresAt < new Date()) {
      void workspaceRepository.updateInvitationStatus(invitation.id, InvitationStatus.EXPIRED);
      throw ApiError.badRequest(ErrorCode.INVITATION_EXPIRED, 'Invitation has expired');
    }
  }

  private async assertMemberHasNoActiveWorkspaceTasks(userId: number, workspaceId: number): Promise<void> {
    const summary = await taskRepository.findActiveAssignedTaskSummary(userId, {
      workspaceId,
      limit: 5,
    });

    if (summary.activeTaskCount > 0) {
      throw ApiError.conflict(
        ErrorCode.MEMBER_HAS_ACTIVE_TASKS,
        'Cannot remove this workspace member because they still have active tasks in this workspace.',
        summary,
      );
    }
  }

  private formatWorkspace(workspace: Workspace): FormattedWorkspace {
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      logo: workspace.logo,
      teamSize: workspace.teamSize,
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

  private formatInvitation(inv: WorkspaceInvitationWithDetails) {
    return {
      id: inv.id,
      token: inv.token,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      workspace: inv.workspace
        ? {
            id: inv.workspace.id,
            name: inv.workspace.name,
            slug: inv.workspace.slug,
          }
        : undefined,
      invitedBy: {
        id: inv.invitedBy.id,
        name: inv.invitedBy.name,
        email: inv.invitedBy.email,
        avatar: inv.invitedBy.avatar,
      },
      invitedAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    };
  }

  private buildInvitationActionUrl(token: string, action: 'accept' | 'decline'): string {
    return new URL(`/invitations/workspace/${token}/${action}`, config.CLIENT_URL).toString();
  }

  private buildRegisterUrl(token: string, email: string): string {
    const url = new URL('/register', config.CLIENT_URL);
    url.searchParams.set('invitation', token);
    url.searchParams.set('email', email);
    return url.toString();
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private emailsMatch(firstEmail: string, secondEmail: string): boolean {
    const normalizedFirstEmail = this.normalizeEmail(firstEmail);
    const normalizedSecondEmail = this.normalizeEmail(secondEmail);
    if (normalizedFirstEmail === normalizedSecondEmail) {
      return true;
    }

    const firstGmailDotlessEmail = this.getGmailDotlessEmail(normalizedFirstEmail);
    const secondGmailDotlessEmail = this.getGmailDotlessEmail(normalizedSecondEmail);
    return Boolean(firstGmailDotlessEmail && firstGmailDotlessEmail === secondGmailDotlessEmail);
  }

  private getGmailDotlessEmail(email: string): string | null {
    const normalizedEmail = this.normalizeEmail(email);
    const [localPart, domain] = normalizedEmail.split('@');
    if (!localPart || !domain || (domain !== 'gmail.com' && domain !== 'googlemail.com')) {
      return null;
    }

    return `${localPart.replace(/\./g, '')}@gmail.com`;
  }

  private dispatchInvitationSideEffects(options: {
    invitationId: number;
    email: string;
    workspaceName: string;
    inviterName: string;
    inviterId: number;
    inviteeUserId?: number;
    role: WorkspaceRole;
    token: string;
    isExistingUser: boolean;
  }): void {
    const acceptUrl = this.buildInvitationActionUrl(options.token, 'accept');
    const declineUrl = this.buildInvitationActionUrl(options.token, 'decline');
    const registerUrl = this.buildRegisterUrl(options.token, options.email);

    setImmediate(() => {
      sendWorkspaceInvitationEmail({
        to: options.email,
        workspaceName: options.workspaceName,
        inviterName: options.inviterName,
        role: options.role,
        acceptUrl,
        declineUrl,
        registerUrl,
        isExistingUser: options.isExistingUser,
      }).catch((err) => {
        logger.error(
          `Failed to send invitation email to ${options.email}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });

      if (options.inviteeUserId) {
        notificationEmitter.onInvitationReceived(
          options.invitationId,
          options.workspaceName,
          options.inviterName,
          options.inviteeUserId,
          options.inviterId,
        ).catch((err) => {
          logger.error(`Failed to emit invitation notification for ${options.email}`, err);
        });
      }
    });
  }
}

export const workspaceService = new WorkspaceService();
