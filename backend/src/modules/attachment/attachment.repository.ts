import { BaseRepository } from '../../common/base/BaseRepository';
import { prisma } from '../../config';
import { Attachment, Prisma } from '@prisma/client';

export type AttachmentWithUploader = Prisma.AttachmentGetPayload<{
  include: {
    uploadedBy: {
      select: {
        id: true;
        name: true;
        avatar: true;
      };
    };
  };
}>;

export class AttachmentRepository extends BaseRepository<
  Attachment,
  Prisma.AttachmentCreateInput,
  Prisma.AttachmentUpdateInput
> {
  constructor() {
    super(prisma, prisma.attachment);
  }

  async findById(id: number): Promise<Attachment | null> {
    return prisma.attachment.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdWithUploader(id: number): Promise<AttachmentWithUploader | null> {
    return prisma.attachment.findFirst({
      where: { id, deletedAt: null },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
  }

  async findByTaskId(
    taskId: number,
    options?: {
      page?: number;
      limit?: number;
      cursor?: string;
    },
  ) {
    const where: Prisma.AttachmentWhereInput = { taskId, deletedAt: null };
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
      prisma.attachment.findMany({
        where,
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        cursor,
      }),
      prisma.attachment.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.AttachmentCreateInput): Promise<Attachment> {
    return prisma.attachment.create({ data });
  }

  async softDelete(id: number): Promise<Attachment> {
    return prisma.attachment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async countByTask(taskId: number): Promise<number> {
    return prisma.attachment.count({
      where: { taskId, deletedAt: null },
    });
  }

  async getTotalSizeByTask(taskId: number): Promise<number> {
    const result = await prisma.attachment.aggregate({
      where: { taskId, deletedAt: null },
      _sum: { fileSize: true },
    });
    return result._sum.fileSize || 0;
  }
}

export const attachmentRepository = new AttachmentRepository();
