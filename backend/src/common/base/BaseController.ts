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
