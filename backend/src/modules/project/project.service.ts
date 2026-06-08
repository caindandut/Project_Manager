import { Prisma, Project } from '@prisma/client';
import { projectRepository, ProjectListItem, ProjectWithOwner } from './project.repository';
import { BaseService } from '../../common/base/BaseService';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { logger } from '../../common/utils/logger';
import { PaginationMeta, ListOptions } from '../../types/interfaces';
import { projectMemberRepository } from '../project-member/project-member.repository';
import { prisma } from '../../config';
import { realtimeService } from '../../common/realtime';

export interface CreateProjectInput {
  name: string;
  key: string;
  description?: string;
  color?: string;
  workspaceId: number;
  ownerId: number;
}

export interface UpdateProjectInput {
  name?: string;
  key?: string;
  description?: string;
  color?: string;
}

interface ProjectListOptions {
  page?: number;
  limit?: number;
  sort?: Prisma.ProjectOrderByWithRelationInput[];
}

export class ProjectService extends BaseService<
  unknown,
  CreateProjectInput,
  UpdateProjectInput
> {
  async create(data: CreateProjectInput) {
    const existing = await projectRepository.findByWorkspaceAndKey(
      data.workspaceId,
      data.key,
    );
    if (existing) {
      throw ApiError.conflict(
        ErrorCode.PROJECT_KEY_EXISTS,
        `Project key "${data.key}" already exists in this workspace`,
      );
    }

    const project = await projectRepository.create({
      name: data.name,
      key: data.key,
      description: data.description,
      color: data.color,
      workspace: { connect: { id: data.workspaceId } },
      owner: { connect: { id: data.ownerId } },
    });

    // Auto-add project creator as ADMIN member with ACCEPTED status
    await projectMemberRepository.addMember(project.id, data.ownerId, 'ADMIN', 'ACCEPTED');

    const created = await projectRepository.findByIdWithDetails(project.id, data.workspaceId);
    if (!created) {
      throw ApiError.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
    }

    logger.info(`Project created: ${project.id} in workspace ${data.workspaceId}`);
    realtimeService.emitToWorkspace(data.workspaceId, {
      type: 'project',
      action: 'created',
      entityId: project.id,
      projectId: project.id,
      actorId: data.ownerId,
    });
    realtimeService.emitToOwners({
      type: 'project',
      action: 'created',
      entityId: project.id,
      workspaceId: data.workspaceId,
      projectId: project.id,
      actorId: data.ownerId,
    });

    return {
      ...this.formatProject(created),
      owner: this.formatOwner(created),
      taskCount: 0,
    };
  }

  async getByIdInWorkspace(
    projectId: number,
    workspaceId: number,
    userId: number,
  ) {
    const project = await this.findProjectWithDetailsOrThrow(projectId, workspaceId);

    if (project.ownerId !== userId) {
      const membership = await prisma.projectMember.findFirst({
        where: { projectId, userId, status: 'ACCEPTED', deletedAt: null },
      });
      if (!membership) {
        throw ApiError.forbidden(
          ErrorCode.FORBIDDEN_ACCESS,
          'You are not a member of this project',
        );
      }
    }

    const [stats, recentTasks, recentActivities] = await Promise.all([
      projectRepository.getStats(project.id),
      projectRepository.getRecentTasks(project.id),
      projectRepository.getRecentActivities(project.id),
    ]);

    return {
      ...this.formatProject(project),
      owner: this.formatOwner(project),
      stats,
      recentTasks,
      recentActivities,
    };
  }

  async getAllInWorkspace(
    workspaceId: number,
    userId: number,
    options?: ProjectListOptions,
  ) {
    const result = await projectRepository.findAllInWorkspaceForUser(workspaceId, userId, options);

    return {
      data: result.data.map((project) => this.formatProjectListItem(project)),
      meta: this.buildPaginationMeta(result.total, options?.page, options?.limit),
    };
  }

  async updateInWorkspace(
    projectId: number,
    workspaceId: number,
    data: UpdateProjectInput,
  ) {
    const project = await this.findProjectOrThrow(projectId, workspaceId);

    if (data.key && data.key !== project.key) {
      const existing = await projectRepository.findByWorkspaceAndKey(workspaceId, data.key);
      if (existing) {
        throw ApiError.conflict(
          ErrorCode.PROJECT_KEY_EXISTS,
          `Project key "${data.key}" already exists in this workspace`,
        );
      }
    }

    const updated = await projectRepository.update(project.id, data);
    realtimeService.emitToProject(workspaceId, project.id, {
      type: 'project',
      action: 'updated',
      entityId: project.id,
    });
    realtimeService.emitToOwners({
      type: 'project',
      action: 'updated',
      entityId: project.id,
      workspaceId,
      projectId: project.id,
    });

    return {
      id: updated.id,
      name: updated.name,
      key: updated.key,
      color: updated.color,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteInWorkspace(projectId: number, workspaceId: number) {
    const project = await this.findProjectOrThrow(projectId, workspaceId);

    // Ràng buộc: tất cả task phải là DONE hoặc CANCELLED
    const activeTaskCount = await projectRepository.countActiveTasksInProject(project.id);
    if (activeTaskCount > 0) {
      throw ApiError.conflict(
        ErrorCode.PROJECT_HAS_ACTIVE_TASKS,
        `Không thể xóa dự án vì còn ${activeTaskCount} công việc chưa hoàn thành. Hãy chuyển tất cả công việc sang Hoàn thành hoặc Hủy trước.`,
        { activeTaskCount },
      );
    }

    await projectRepository.softDelete(project.id);

    logger.info(`Project deleted: ${project.id}`);
    realtimeService.emitToWorkspace(workspaceId, {
      type: 'project',
      action: 'deleted',
      entityId: project.id,
      projectId: project.id,
    });
    realtimeService.emitToOwners({
      type: 'project',
      action: 'deleted',
      entityId: project.id,
      workspaceId,
      projectId: project.id,
    });

    return { message: 'Project deleted successfully' };
  }

  async restoreProject(projectId: number, workspaceId: number) {
    const project = await projectRepository.findDeletedByIdInWorkspace(projectId, workspaceId);
    if (!project) {
      throw ApiError.notFound(
        ErrorCode.PROJECT_NOT_FOUND,
        'Dự án không tồn tại hoặc đã hết thời gian lưu trữ 30 ngày.',
      );
    }

    const restored = await projectRepository.restoreProject(project.id);
    logger.info(`Project restored: ${project.id}`);
    realtimeService.emitToWorkspace(workspaceId, {
      type: 'project',
      action: 'created',
      entityId: project.id,
      projectId: project.id,
    });
    realtimeService.emitToOwners({
      type: 'project',
      action: 'created',
      entityId: project.id,
      workspaceId,
      projectId: project.id,
    });

    return {
      id: restored.id,
      name: restored.name,
      key: restored.key,
      message: 'Project restored successfully',
    };
  }

  async getArchivedProjects(workspaceId: number) {
    const projects = await projectRepository.findDeletedProjectsInWorkspace(workspaceId);
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    return projects.map((project) => {
      const deletedAt = project.deletedAt!;
      const expiresAt = new Date(deletedAt.getTime() + thirtyDaysMs);
      const daysRemaining = Math.max(
        0,
        Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      );

      return {
        id: project.id,
        name: project.name,
        key: project.key,
        color: project.color,
        deletedAt,
        expiresAt,
        daysRemaining,
      };
    });
  }

  async cleanupExpiredProjects(): Promise<void> {
    const count = await projectRepository.permanentlyDeleteExpiredProjects();
    if (count > 0) {
      logger.info(`Cleanup: Permanently deleted ${count} expired project(s).`);
    }
  }

  async getById(id: number): Promise<unknown> {
    const project = await projectRepository.findById(id);
    if (!project) {
      throw ApiError.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
    }

    return this.formatProject(project);
  }

  async update(id: number, data: UpdateProjectInput): Promise<unknown> {
    const project = await projectRepository.findById(id);
    if (!project) {
      throw ApiError.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
    }

    const updated = await projectRepository.update(id, data);
    void realtimeService.emitProjectEvent(id, {
      type: 'project',
      action: 'updated',
      entityId: id,
    });

    return this.formatProject(updated);
  }

  async delete(id: number): Promise<unknown> {
    const project = await projectRepository.findById(id);
    if (!project) {
      throw ApiError.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
    }

    await projectRepository.softDelete(id);
    void realtimeService.emitProjectEvent(id, {
      type: 'project',
      action: 'deleted',
      entityId: id,
    });

    return { message: 'Project deleted successfully' };
  }

  getAll(_options?: ListOptions): Promise<{ data: unknown[]; meta?: PaginationMeta }> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  private async findProjectOrThrow(
    projectId: number,
    workspaceId: number,
  ): Promise<Project> {
    const project = await projectRepository.findByIdInWorkspace(projectId, workspaceId);
    if (!project) {
      throw ApiError.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
    }

    return project;
  }

  private async findProjectWithDetailsOrThrow(
    projectId: number,
    workspaceId: number,
  ): Promise<ProjectWithOwner> {
    const project = await projectRepository.findByIdWithDetails(projectId, workspaceId);
    if (!project) {
      throw ApiError.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
    }

    return project;
  }

  private formatProject(project: Project) {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      key: project.key,
      color: project.color,
      workspaceId: project.workspaceId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  private formatProjectListItem(project: ProjectListItem) {
    return {
      id: project.id,
      name: project.name,
      key: project.key,
      color: project.color,
      owner: {
        id: project.owner.id,
        name: project.owner.name,
      },
      taskCount: project._count.tasks,
      completedTaskCount: project.completedTaskCount,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  private formatOwner(project: ProjectWithOwner) {
    return {
      id: project.owner.id,
      name: project.owner.name,
      email: project.owner.email,
      avatar: project.owner.avatar,
    };
  }
}

export const projectService = new ProjectService();
