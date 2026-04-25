import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { error as apiErrorResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { config } from '../../config';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export const errorMiddleware = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(`[Error] ${req.method} ${req.path}:`, {
    message: err.message,
    code: err.code,
    stack: config.NODE_ENV === 'development' ? err.stack : undefined,
  });

  if (err instanceof ApiError) {
    res.status(err.statusCode).json(apiErrorResponse(
      err.code,
      err.message,
      err.details,
    ));
    return;
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as AppError & { code?: string };
    switch (prismaError.code) {
      case 'P2002':
        res.status(409).json(apiErrorResponse(
          'DUPLICATE_ENTRY',
          'A record with this value already exists',
        ));
        return;
      case 'P2025':
        res.status(404).json(apiErrorResponse(
          'RECORD_NOT_FOUND',
          'The requested record was not found',
        ));
        return;
    }
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json(apiErrorResponse(
      'VALIDATION_ERROR',
      err.message,
      err.details,
    ));
    return;
  }

  // Default error response
  res.status(500).json(apiErrorResponse(
    'INTERNAL_ERROR',
    config.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
  ));
};

export const notFoundMiddleware = (req: Request, res: Response): void => {
  res.status(404).json(apiErrorResponse(
    'NOT_FOUND',
    `Route ${req.method} ${req.path} not found`,
  ));
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
