import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { ErrorCode } from '../../types/enums';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  userId?: number;
}

export abstract class BaseController {
  protected readonly resourceName: string;

  constructor(resourceName: string) {
    this.resourceName = resourceName;
  }

  protected async tryCatch<T>(
    res: Response,
    fn: () => Promise<T>
  ): Promise<void> {
    try {
      const result = await fn();
      if (!res.headersSent) {
        res.json({ success: true, data: result });
      }
    } catch (error) {
      this.handleError(res, error);
    }
  }

  protected handleError(res: Response, error: unknown): void {
    logger.error(`[${this.resourceName}] Error:`, error);

    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
      return;
    }

    // Check for Prisma Client Known Request Errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'PrismaClientKnownRequestError') {
      const prismaError = error as { code?: string; message?: string };
      switch (prismaError.code) {
        case 'P2002':
          res.status(409).json({
            success: false,
            error: {
              code: 'DUPLICATE_ENTRY',
              message: 'A record with this value already exists',
            },
          });
          return;
        case 'P2025':
          res.status(404).json({
            success: false,
            error: {
              code: 'RECORD_NOT_FOUND',
              message: 'The requested record was not found',
            },
          });
          return;
      }
    }

    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }

  protected getIdFromParams(req: Request): number {
    const id = parseInt(req.params.id || req.params.taskId || req.params.workspaceId || '0', 10);
    if (isNaN(id) || id <= 0) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid ID parameter');
    }
    return id;
  }

  protected getUserId(req: Request): number | undefined {
    if ('user' in req && req.user && typeof (req.user as { id?: number }).id === 'number') {
      return (req.user as { id: number }).id;
    }
    return undefined;
  }
}
