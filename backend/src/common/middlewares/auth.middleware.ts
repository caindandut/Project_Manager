import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { AuthenticatedRequest } from '../../types/interfaces';
import { ApiError } from '../utils/apiError';
import { ErrorCode } from '../../types/enums';

export interface JwtPayload {
  userId: number;
  email: string;
  iat: number;
  exp: number;
}

// Matches /api/v1/auth/refresh regardless of mount prefix
const REFRESH_TOKEN_PATH_REGEX = /^\/api\/v1\/auth\/refresh$/;

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const refreshToken = req.cookies?.refreshToken;

    if (!authHeader && !refreshToken) {
      throw ApiError.unauthorized(
        ErrorCode.AUTH_TOKEN_INVALID,
        'Authentication required',
      );
    }

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
        req.user = {
          id: decoded.userId,
          email: decoded.email,
        };
        next();
        return;
      } catch (jwtError) {
        if (jwtError instanceof jwt.TokenExpiredError) {
          throw ApiError.unauthorized(
            ErrorCode.AUTH_TOKEN_EXPIRED,
            'Access token has expired',
          );
        }
        throw ApiError.unauthorized(
          ErrorCode.AUTH_TOKEN_INVALID,
          'Invalid access token',
        );
      }
    }

    if (REFRESH_TOKEN_PATH_REGEX.test(req.path) && refreshToken) {
      next();
      return;
    }

    throw ApiError.unauthorized(
      ErrorCode.AUTH_TOKEN_INVALID,
      'Invalid authentication credentials',
    );
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
        req.user = {
          id: decoded.userId,
          email: decoded.email,
        };
      } catch {
        // Ignore invalid tokens for optional auth
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
