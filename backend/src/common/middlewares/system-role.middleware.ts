import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/interfaces';
import { ApiError } from '../utils/apiError';
import { ErrorCode } from '../../types/enums';

/**
 * Middleware to require System Owner role.
 * Reads systemRole from JWT payload (already decoded by authMiddleware).
 * Does NOT query DB — relies on JWT data.
 */
export const requireSystemOwner = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  const user = req.user;

  if (!user) {
    next(
      ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required'),
    );
    return;
  }

  if (user.systemRole !== 'OWNER') {
    next(
      ApiError.forbidden(
        ErrorCode.ADMIN_FORBIDDEN,
        'Access denied. System Owner role required.',
      ),
    );
    return;
  }

  next();
};
