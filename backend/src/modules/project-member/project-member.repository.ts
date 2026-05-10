import { Prisma, ProjectMember, ProjectRole } from '@prisma/client';
import { BaseRepository } from '../../common/base/BaseRepository';
import { prisma } from '../../config';
import { ProjectMemberWithUser, ProjectMemberListOptions } from './project-member.interface';

export class ProjectMemberRepository extends BaseRepository<
  ProjectMember,
  Prisma.ProjectMemberCreateInput,
  Prisma.ProjectMemberUpdateInput
> {
  constructor() {
    super(prisma, prisma.projectMember);
  }

  /**
   * Find all members for a project with pagination and user info.
   */
  async findByProject(
    projectId: number,
    options?: ProjectMemberListOptions,
  ): Promise<{ data: ProjectMemberWithUser[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectMemberWhereInput = { projectId, deletedAt: null };

    const [data, total] = await Promise.all([
      prisma.projectMember.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.projectMember.count({ where }),
    ]);

    return { data: data as ProjectMemberWithUser[], total };
  }

  /**
   * Find a project member by project + user combination.
   */
  async findByProjectAndUser(
    projectId: number,
    userId: number,
  ): Promise<ProjectMember | null> {
    return prisma.projectMember.findFirst({
      where: { projectId, userId, deletedAt: null },
    });
  }

  /**
   * Find a member by id within a specific project (ensures membership belongs to the project).
   */
  async findMemberById(
    projectId: number,
    memberId: number,
  ): Promise<ProjectMemberWithUser | null> {
    return prisma.projectMember.findFirst({
      where: { id: memberId, projectId, deletedAt: null },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    }) as Promise<ProjectMemberWithUser | null>;
  }

  /**
   * Add a member to a project.
   */
  async addMember(
    projectId: number,
    userId: number,
    role: ProjectRole = 'MEMBER',
  ): Promise<ProjectMember> {
    return prisma.projectMember.create({
      data: {
        project: { connect: { id: projectId } },
        user: { connect: { id: userId } },
        role,
      },
    });
  }

  /**
   * Update a member's role.
   */
  async updateRole(memberId: number, role: ProjectRole): Promise<ProjectMember> {
    return prisma.projectMember.update({
      where: { id: memberId },
      data: { role },
    });
  }

  /**
   * Soft-delete a member from a project.
   */
  async removeMember(memberId: number): Promise<ProjectMember> {
    return prisma.projectMember.update({
      where: { id: memberId },
      data: { deletedAt: new Date() },
    });
  }

  protected getAllowedFields(): Set<string> {
    return new Set([
      'id', 'role', 'joinedAt',
      'projectId', 'userId',
      'createdAt', 'updatedAt', 'deletedAt',
    ]);
  }
}

export const projectMemberRepository = new ProjectMemberRepository();
