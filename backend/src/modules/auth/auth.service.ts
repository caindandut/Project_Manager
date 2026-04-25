import { hash, compare } from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config';
import { authRepository } from './auth.repository';
import { BaseService } from '../../common/base/BaseService';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { logger } from '../../common/utils/logger';
import { PaginationMeta, ListOptions } from '../../types/interfaces';
import { GoogleUserPayload } from './google-auth.util';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileInput {
  name?: string;
  bio?: string;
  avatar?: string;
}

const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export class AuthService extends BaseService<unknown, RegisterInput, UpdateProfileInput> {
  async register(data: RegisterInput) {
    const existingUser = await authRepository.findByEmail(data.email);
    if (existingUser) {
      throw ApiError.conflict(ErrorCode.USER_EMAIL_EXISTS, 'Email already registered');
    }

    const hashedPassword = await hash(data.password, SALT_ROUNDS);
    const user = await authRepository.create({
      email: data.email,
      password: hashedPassword,
      name: data.name,
    });

    logger.info(`User registered: ${user.email}`);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt,
    };
  }

  async login(data: LoginInput) {
    const user = await authRepository.findByEmail(data.email);
    if (!user) {
      throw ApiError.unauthorized(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid email or password');
    }

    if (user.deletedAt) {
      throw ApiError.forbidden(ErrorCode.USER_DELETED, 'This account has been deactivated');
    }

    if (!user.password) {
      throw ApiError.unauthorized(ErrorCode.AUTH_INVALID_CREDENTIALS, 'This account uses Google sign-in. Please log in with Google.');
    }

    const isValidPassword = await compare(data.password, user.password);
    if (!isValidPassword) {
      throw ApiError.unauthorized(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    logger.info(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
      },
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
    };
  }

  async googleLogin(payload: GoogleUserPayload) {
    let user = await authRepository.findByGoogleId(payload.sub);

    if (!user) {
      user = await authRepository.findByEmail(payload.email);
      if (user) {
        user = await authRepository.linkGoogleId(user.id, payload.sub);
      } else {
        user = await authRepository.create({
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          googleId: payload.sub,
          avatar: payload.picture,
        });

        logger.info(`New user registered via Google OAuth: ${user.email}`);
      }
    } else if (user.deletedAt) {
      throw ApiError.forbidden(ErrorCode.USER_DELETED, 'This account has been deactivated');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    logger.info(`User logged in via Google OAuth: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
      },
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  async logout(userId: number) {
    await authRepository.deleteAllRefreshTokens(userId);
    logger.info(`User logged out: ${userId}`);
    return { message: 'Logged out successfully' };
  }

  async refresh(refreshToken: string) {
    let decoded: JwtPayload;

    try {
      decoded = jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET) as JwtPayload;
    } catch {
      throw ApiError.unauthorized(ErrorCode.AUTH_REFRESH_TOKEN_INVALID, 'Invalid refresh token');
    }

    const storedToken = await authRepository.findRefreshToken(refreshToken);
    if (!storedToken) {
      throw ApiError.unauthorized(ErrorCode.AUTH_REFRESH_TOKEN_INVALID, 'Refresh token not found');
    }

    if (storedToken.expiresAt < new Date()) {
      await authRepository.deleteRefreshToken(refreshToken);
      throw ApiError.unauthorized(ErrorCode.AUTH_REFRESH_TOKEN_EXPIRED, 'Refresh token has expired');
    }

    const user = await authRepository.findById(decoded.userId as number);
    if (!user || user.deletedAt) {
      throw ApiError.unauthorized(ErrorCode.AUTH_USER_DELETED, 'User not found or deactivated');
    }

    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    // Rotate refresh token
    await authRepository.deleteRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepository.createRefreshToken(user.id, newRefreshToken, expiresAt);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    };
  }

  async forgotPassword(email: string) {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      // Always return success to prevent email enumeration
      return { message: 'If an account exists, a reset email has been sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await authRepository.createResetToken(user.id, resetTokenHash, expiresAt);

    logger.info(`Password reset token created for user: ${user.id}`);

    // TODO: Send email with reset link containing the plain token
    // In production: await sendEmail({ to: user.email, template: 'reset-password', vars: { token: resetToken } });

    return { message: 'If an account exists, a reset email has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await authRepository.findResetToken(tokenHash);

    if (!user) {
      throw ApiError.badRequest(ErrorCode.AUTH_RESET_TOKEN_INVALID, 'Invalid reset token');
    }

    const resetTokenData = await authRepository.findActiveResetToken(user.id);
    if (!resetTokenData || resetTokenData.expiresAt < new Date()) {
      throw ApiError.badRequest(ErrorCode.AUTH_RESET_TOKEN_EXPIRED, 'Reset token has expired');
    }

    const hashedPassword = await hash(newPassword, SALT_ROUNDS);
    await authRepository.updatePassword(user.id, hashedPassword);
    await authRepository.deleteResetToken(user.id);

    // Invalidate all refresh tokens (force re-login)
    await authRepository.deleteAllRefreshTokens(user.id);

    logger.info(`Password reset completed for user: ${user.id}`);
    return { message: 'Password reset successfully' };
  }

  async getMe(userId: number) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(userId: number, data: UpdateProfileInput) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    const updated = await authRepository.update(userId, data);

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatar: updated.avatar,
      bio: updated.bio,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async changePassword(userId: number, data: ChangePasswordInput) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    if (!user.password) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'This account uses Google sign-in. Password change is not available.');
    }

    const isValidPassword = await compare(data.currentPassword, user.password);
    if (!isValidPassword) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Current password is incorrect');
    }

    const hashedPassword = await hash(data.newPassword, SALT_ROUNDS);
    await authRepository.updatePassword(userId, hashedPassword);

    logger.info(`Password changed for user: ${userId}`);
    return { message: 'Password changed successfully' };
  }

  private generateAccessToken(user: { id: number; email: string }): string {
    return jwt.sign(
      { userId: user.id, email: user.email },
      config.JWT_SECRET,
      { expiresIn: '15m' as jwt.SignOptions['expiresIn'] },
    );
  }

  private generateRefreshToken(user: { id: number; email: string }): string {
    return jwt.sign(
      { userId: user.id, email: user.email },
      config.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' as jwt.SignOptions['expiresIn'] },
    );
  }

  getById(_id: number): Promise<unknown> {
    return this.getMe(_id);
  }

  getAll(_options?: ListOptions): Promise<{ data: unknown[]; meta?: PaginationMeta }> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  create(data: RegisterInput): Promise<unknown> {
    return this.register(data);
  }

  update(id: number, data: UpdateProfileInput): Promise<unknown> {
    return this.updateProfile(id, data);
  }

  delete(id: number): Promise<unknown> {
    return this.logout(id);
  }
}

export const authService = new AuthService();
