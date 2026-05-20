import { Comment, Prisma } from '@prisma/client';
import { commentRepository, CommentWithUser } from './comment.repository';
import { BaseService } from '../../common/base/BaseService';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { logger } from '../../common/utils/logger';
import { PaginationMeta, ListOptions } from '../../types/interfaces';
import { prisma } from '../../config';
import { notificationEmitter } from '../notification/notification-emitter';

export interface CreateCommentInput {
  content: string;
  taskId: number;
  userId: number;
}

export interface UpdateCommentInput {
  content: string;
}

interface CommentResponse {
  id: number;
  content: string;
  taskId: number;
  userId: number;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: number;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

type CommentServiceResponse = CommentResponse | { message: string };

export class CommentService extends BaseService<
  CommentServiceResponse,
  CreateCommentInput,
  UpdateCommentInput
> {
  async create(data: CreateCommentInput): Promise<CommentResponse> {
    const comment = await commentRepository.create({
      content: data.content,
      task: { connect: { id: data.taskId } },
      user: { connect: { id: data.userId } },
    });
    const fullComment = await commentRepository.findByIdWithUser(comment.id);

    if (!fullComment) {
      throw ApiError.notFound(ErrorCode.COMMENT_NOT_FOUND, 'Comment not found');
    }

    logger.info(`Comment created: ${comment.id} on task ${data.taskId}`);

    // Log activity
    await this.logActivity(comment.id, data.taskId, data.userId, 'COMMENT_CREATE');

    // Emit notification (also parses @mentions)
    notificationEmitter.onTaskCommented(data.taskId, data.userId, data.content).catch(() => {});

    return this.formatComment(fullComment);
  }

  async getById(id: number): Promise<CommentResponse> {
    const comment = await commentRepository.findByIdWithUser(id);
    if (!comment) {
      throw ApiError.notFound(ErrorCode.COMMENT_NOT_FOUND, 'Comment not found');
    }

    return this.formatComment(comment);
  }

  async getAllByTask(
    taskId: number,
    options?: { page?: number; limit?: number; cursor?: string },
  ): Promise<{ data: CommentResponse[]; meta: PaginationMeta }> {
    const result = await commentRepository.findByTaskId(taskId, options);
    const limit = options?.limit || 20;
    const lastComment = result.data.at(-1);

    return {
      data: result.data.map((comment) => this.formatComment(comment)),
      meta: {
        ...(lastComment ? { cursor: String(lastComment.id) } : {}),
        limit,
        hasMore: result.total > ((options?.page ? (options.page - 1) * limit : 0) + result.data.length),
        total: result.total,
      },
    };
  }

  async update(id: number, data: UpdateCommentInput, userId?: number): Promise<CommentResponse> {
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

    const updated = await commentRepository.update(id, data);
    const fullComment = await commentRepository.findByIdWithUser(updated.id);

    if (!fullComment) {
      throw ApiError.notFound(ErrorCode.COMMENT_NOT_FOUND, 'Comment not found');
    }

    // Log activity
    if (userId) {
      await this.logActivity(id, comment.taskId, userId, 'COMMENT_UPDATE');
    }

    return this.formatComment(fullComment);
  }

  async delete(id: number, userId: number): Promise<{ message: string }> {
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

    // Log activity
    await this.logActivity(id, comment.taskId, userId, 'COMMENT_DELETE');

    return { message: 'Comment deleted successfully' };
  }

  private formatComment(
    comment: Comment | CommentWithUser,
  ): CommentResponse {
    const user = 'user' in comment ? comment.user : undefined;

    return {
      id: comment.id,
      content: comment.content,
      taskId: comment.taskId,
      userId: comment.userId,
      isEdited: comment.updatedAt.getTime() !== comment.createdAt.getTime(),
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

  getAll(
    _options?: ListOptions,
  ): Promise<{ data: CommentServiceResponse[]; meta?: PaginationMeta }> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  private async logActivity(
    commentId: number,
    taskId: number,
    userId: number,
    action: string,
  ): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          action,
          entityType: 'COMMENT',
          entityId: commentId,
          taskId,
          userId,
          metadata: {
            commentId,
          } as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      logger.error('Failed to log comment activity', err);
    }
  }
}

export const commentService = new CommentService();
