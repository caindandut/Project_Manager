import { projectRepository } from './project.repository';
import { BaseService } from '../../common/base/BaseService';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { logger } from '../../common/utils/logger';
import { PaginationMeta, ListOptions } from '../../types/interfaces';

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

    logger.info(
      `Project created: ${project.id} in workspace ${data.workspaceId}`,
    );

    return this.formatProject(project);
  }

  async getById(id: number) {
    const project = await projectRepository.findByIdWithDetails(id);
    if (!project) {
      throw ApiError.notFound(
        ErrorCode.PROJECT_NOT_FOUND,
        'Project not found',
      );
    }

    return {
      ...this.formatProject(project),
      workspace: {
        id: project.workspace.id,
        name: project.workspace.name,
      },
      owner: {
        id: project.owner.id,
        name: project.owner.name,
        email: project.owner.email,
        avatar: project.owner.avatar,
      },
      taskCount: (project as any)._count?.tasks || 0,
    };
  }

  async getAllInWorkspace(
    workspaceId: number,
    options?: { page?: number; limit?: number },
  ) {
    const result = await projectRepository.findAllInWorkspace(
      workspaceId,
      options,
    );

    return {
        data: result.data.map((p: any) => ({
        ...this.formatProject(p),
        taskCount: (p as any)._count?.tasks || 0,
      })),
      meta: this.buildPaginationMeta(
        result.total,
        options?.page,
        options?.limit,
      ),
    };
  }

  async update(id: number, data: UpdateProjectInput) {
    const project = await projectRepository.findById(id);
    if (!project) {
      throw ApiError.notFound(
        ErrorCode.PROJECT_NOT_FOUND,
        'Project not found',
      );
    }

    if (data.key && data.key !== project.key) {
      const existing = await projectRepository.findByWorkspaceAndKey(
        project.workspaceId,
        data.key,
      );
      if (existing) {
        throw ApiError.conflict(
          ErrorCode.PROJECT_KEY_EXISTS,
          `Project key "${data.key}" already exists in this workspace`,
        );
      }
    }

    const updated = await projectRepository.update(id, data as any);
    return this.formatProject(updated);
  }

  async delete(id: number) {
    const project = await projectRepository.findById(id);
    if (!project) {
      throw ApiError.notFound(
        ErrorCode.PROJECT_NOT_FOUND,
        'Project not found',
      );
    }

    await projectRepository.softDelete(id);
    logger.info(`Project deleted: ${id}`);

    return { message: 'Project deleted successfully' };
  }

  private formatProject(project: any) {
    return {
      id: project.id,
      name: project.name,
      key: project.key,
      description: project.description,
      color: project.color,
      workspaceId: project.workspaceId,
      ownerId: project.ownerId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  // Base interface stubs
  getAll(_options?: ListOptions): Promise<{ data: unknown[]; meta?: PaginationMeta }> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }
}

export const projectService = new ProjectService();
