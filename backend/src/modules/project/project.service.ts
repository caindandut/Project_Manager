import { Prisma, Project } from '@prisma/client';
import { projectRepository, ProjectListItem, ProjectWithOwner } from './project.repository';
import { BaseService } from '../../common/base/BaseService';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { logger } from '../../common/utils/logger';
import { PaginationMeta, ListOptions, WorkspaceRole } from '../../types/interfaces';
import { projectMemberRepository } from '../project-member/project-member.repository';
import { prisma } from '../../config';

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

    // Auto-add project creator as ADMIN member
    await projectMemberRepository.addMember(project.id, data.ownerId, 'ADMIN');

    const created = await projectRepository.findByIdWithDetails(project.id, data.workspaceId);
    if (!created) {
      throw ApiError.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
    }

    logger.info(`Project created: ${project.id} in workspace ${data.workspaceId}`);
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
    workspaceRole: WorkspaceRole,
  ) {
    const project = await this.findProjectWithDetailsOrThrow(projectId, workspaceId);

    // RBAC: workspace OWNER/ADMIN can see any project;
    // others must be a ProjectMember
    if (workspaceRole !== 'OWNER' && workspaceRole !== 'ADMIN') {
      const membership = await prisma.projectMember.findFirst({
        where: { projectId, userId, deletedAt: null },
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
    workspaceRole: WorkspaceRole,
    options?: ProjectListOptions,
  ) {
    // Workspace OWNER/ADMIN see all projects; MEMBER/GUEST see only their projects
    const result =
      workspaceRole === 'OWNER' || workspaceRole === 'ADMIN'
        ? await projectRepository.findAllInWorkspace(workspaceId, options)
        : await projectRepository.findAllInWorkspaceForUser(workspaceId, userId, options);

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
    await projectRepository.softDelete(project.id);

    logger.info(`Project deleted: ${project.id}`);
    return { message: 'Project deleted successfully' };
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
    return this.formatProject(updated);
  }

  async delete(id: number): Promise<unknown> {
    const project = await projectRepository.findById(id);
    if (!project) {
      throw ApiError.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
    }

    await projectRepository.softDelete(id);
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
