import { commentRepository } from './comment.repository';
import { BaseService } from '../../common/base/BaseService';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { logger } from '../../common/utils/logger';
import { PaginationMeta, ListOptions } from '../../types/interfaces';

export interface CreateCommentInput {
  content: string;
  taskId: number;
  userId: number;
}

export interface UpdateCommentInput {
  content: string;
}

export class CommentService extends BaseService<
  unknown,
  CreateCommentInput,
  UpdateCommentInput
> {
  async create(data: CreateCommentInput) {
    const comment = await commentRepository.create({
      content: data.content,
      task: { connect: { id: data.taskId } },
      user: { connect: { id: data.userId } },
    } as any);

    logger.info(`Comment created: ${comment.id} on task ${data.taskId}`);

    return this.formatComment(comment);
  }

  async getById(id: number) {
    const comment = await commentRepository.findByIdWithUser(id);
    if (!comment) {
      throw ApiError.notFound(ErrorCode.COMMENT_NOT_FOUND, 'Comment not found');
    }

    return this.formatComment(comment, comment.user);
  }

  async getAllByTask(
    taskId: number,
    options?: { page?: number; limit?: number; cursor?: string },
  ) {
    const result = await commentRepository.findByTaskId(taskId, options);

    return {
      data: result.data.map((c: any) => this.formatComment(c, c.user)),
      meta: {
        ...(options?.cursor ? { cursor: options.cursor } : {}),
        limit: options?.limit || 20,
        hasMore: result.data.length === (options?.limit || 20),
        total: result.total,
      },
    };
  }

  async update(id: number, data: UpdateCommentInput, userId?: number) {
    const comment = await commentRepository.findById(id);
    if (!comment) {
      throw ApiError.notFound(ErrorCode.COMMENT_NOT_FOUND, 'Comment not found');
    }

    if (comment.userId !== userId) {
      throw ApiError.forbidden(
        ErrorCode.FORBIDDEN_ACCESS,
        'You can only edit your own comments',
      );
    }

    const updated = await commentRepository.update(id, data as any);
    const fullComment = await commentRepository.findByIdWithUser(updated.id);

    return this.formatComment(updated, fullComment?.user);
  }

  async delete(id: number, userId: number) {
    const comment = await commentRepository.findById(id);
    if (!comment) {
      throw ApiError.notFound(ErrorCode.COMMENT_NOT_FOUND, 'Comment not found');
    }

    if (comment.userId !== userId) {
      throw ApiError.forbidden(
        ErrorCode.FORBIDDEN_ACCESS,
        'You can only delete your own comments',
      );
    }

    await commentRepository.softDelete(id);
    logger.info(`Comment deleted: ${id}`);

    return { message: 'Comment deleted successfully' };
  }

  private formatComment(comment: any, user?: any) {
    return {
      id: comment.id,
      content: comment.content,
      taskId: comment.taskId,
      userId: comment.userId,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
          }
        : undefined,
    };
  }

  getAll(_options?: ListOptions): Promise<{ data: unknown[]; meta?: PaginationMeta }> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }
}

export const commentService = new CommentService();
