import { BaseRepository } from '../../common/base/BaseRepository';
import { prisma } from '../../config';
import { Comment, Prisma } from '@prisma/client';

export class CommentRepository extends BaseRepository<
  Comment,
  Prisma.CommentCreateInput,
  Prisma.CommentUpdateInput
> {
  constructor() {
    super(prisma, prisma.comment);
  }

  async findById(id: number): Promise<Comment | null> {
    return prisma.comment.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdWithUser(id: number) {
    return prisma.comment.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  async findByTaskId(
    taskId: number,
    options?: {
      page?: number;
      limit?: number;
      cursor?: string;
    }
  ) {
    const where: any = { taskId, deletedAt: null };
    let skip: number | undefined;
    let take: number | undefined;
    let cursor: { id: number } | undefined;

    if (options?.cursor) {
      cursor = { id: parseInt(options.cursor, 10) };
      take = options.limit || 20;
      skip = 1;
    } else {
      skip = options?.page ? (options.page - 1) * (options.limit || 20) : 0;
      take = options?.limit || 20;
    }

    const [data, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        cursor,
      }),
      prisma.comment.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.CommentCreateInput): Promise<Comment> {
    return prisma.comment.create({ data });
  }

  async update(id: number, data: Prisma.CommentUpdateInput): Promise<Comment> {
    return prisma.comment.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: number): Promise<Comment> {
    return prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async countByTask(taskId: number): Promise<number> {
    return prisma.comment.count({
      where: { taskId, deletedAt: null },
    });
  }
}

export const commentRepository = new CommentRepository();
