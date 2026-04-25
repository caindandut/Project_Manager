import { BaseRepository } from '../../common/base/BaseRepository';
import { prisma } from '../../config';
import { Project, Prisma } from '@prisma/client';

export class ProjectRepository extends BaseRepository<
  Project,
  Prisma.ProjectCreateInput,
  Prisma.ProjectUpdateInput
> {
  constructor() {
    super(prisma, prisma.project);
  }

  async findById(id: number): Promise<Project | null> {
    return prisma.project.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByWorkspaceAndKey(
    workspaceId: number,
    key: string
  ): Promise<Project | null> {
    return prisma.project.findFirst({
      where: { workspaceId, key, deletedAt: null },
    });
  }

  async findAllInWorkspace(
    workspaceId: number,
    options?: {
      page?: number;
      limit?: number;
      sort?: { field: string; direction: 'asc' | 'desc' }[];
    }
  ) {
    const skip = options?.page ? (options.page - 1) * (options.limit || 20) : 0;
    const take = options?.limit || 20;

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where: { workspaceId, deletedAt: null },
        include: {
          owner: true,
          _count: {
            select: { tasks: { where: { deletedAt: null } } },
          },
        },
        orderBy: (options?.sort as any) || [{ createdAt: 'desc' }],
        skip,
        take,
      }),
      prisma.project.count({
        where: { workspaceId, deletedAt: null },
      }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.ProjectCreateInput): Promise<Project> {
    return prisma.project.create({ data });
  }

  async update(id: number, data: Prisma.ProjectUpdateInput): Promise<Project> {
    return prisma.project.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: number): Promise<Project> {
    return prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findByIdWithDetails(id: number) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        workspace: true,
        owner: true,
        _count: {
          select: { tasks: { where: { deletedAt: null } } },
        },
      },
    });
  }
}

export const projectRepository = new ProjectRepository();
