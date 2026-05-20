import { hash, compare } from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { config } from '../../config';
import { prisma } from '../../config';
import { authRepository } from './auth.repository';
import { workspaceRepository } from '../workspace/workspace.repository';
import { workspaceService } from '../workspace/workspace.service';
import { BaseService } from '../../common/base/BaseService';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { logger } from '../../common/utils/logger';
import { PaginationMeta, ListOptions } from '../../types/interfaces';
import { GoogleUserPayload } from './google-auth.util';
import { sendOTPEmail } from '../../common/utils/email.service';

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

export interface AvatarFile {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_TYPE_REGISTRATION = 'REGISTRATION';

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

    await workspaceRepository.acceptPendingInvitationsForUser(user);

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

    if (user.isBlocked) {
      throw ApiError.forbidden(ErrorCode.FORBIDDEN_ACCESS, 'Your account has been blocked. Please contact the administrator.');
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
        systemRole: user.systemRole,
        googleId: user.googleId,
        googleAvatar: user.googleAvatar,
        hasPassword: user.password !== null,
      },
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
    };
  }

  async googleLogin(payload: GoogleUserPayload, currentUserId?: number) {
    let user;

    if (currentUserId) {
      user = await authRepository.findById(currentUserId);
      if (!user) {
        throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found');
      }

      const existingGoogleUser = await authRepository.findByGoogleId(payload.sub);
      if (existingGoogleUser && existingGoogleUser.id !== currentUserId) {
        throw ApiError.conflict(ErrorCode.VALIDATION_ERROR, 'Tài khoản Google này đã được liên kết với một người dùng khác');
      }

      if (!user.googleId) {
        user = await authRepository.linkGoogleId(currentUserId, payload.sub, payload.picture);
      }
    } else {
      user = await authRepository.findByGoogleId(payload.sub);

      if (!user) {
        user = await authRepository.findByEmail(payload.email);
        if (user) {
          user = await authRepository.linkGoogleId(user.id, payload.sub, payload.picture);
        } else {
          user = await authRepository.create({
            email: payload.email,
            name: payload.name || payload.email.split('@')[0],
            googleId: payload.sub,
            avatar: payload.picture,
            googleAvatar: payload.picture,
          });

          await workspaceRepository.acceptPendingInvitationsForUser(user);

          logger.info(`New user registered via Google OAuth: ${user.email}`);
        }
      }
    }

    if (user.deletedAt) {
      throw ApiError.forbidden(ErrorCode.USER_DELETED, 'This account has been deactivated');
    } else if (user.isBlocked) {
      throw ApiError.forbidden(ErrorCode.FORBIDDEN_ACCESS, 'Your account has been blocked. Please contact the administrator.');
    }

    // Check if user has any workspaces
    const hasWorkspaces = await authRepository.hasWorkspaces(user.id);

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
        systemRole: user.systemRole,
        googleId: user.googleId,
        googleAvatar: user.googleAvatar,
        hasPassword: user.password !== null,
      },
      accessToken,
      refreshToken,
      expiresIn: 900,
      requireOnboarding: !hasWorkspaces,
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

  async sendOtp(email: string) {
    // Check if user already exists
    const existingUser = await authRepository.findByEmail(email);
    if (existingUser) {
      throw ApiError.conflict(ErrorCode.USER_EMAIL_EXISTS, 'Email already registered');
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await authRepository.createOtpCode(email, code, OTP_TYPE_REGISTRATION, expiresAt);

    await sendOTPEmail(email, code);

    logger.info(`OTP sent to ${email}`);

    return { message: 'OTP sent successfully', expiresIn: OTP_EXPIRY_MS / 1000 };
  }

  async verifyOtp(email: string, code: string) {
    const otpRecord = await authRepository.findValidOtpCode(email, code, OTP_TYPE_REGISTRATION);

    if (!otpRecord) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid or expired OTP');
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      await authRepository.deleteOtpCode(email, OTP_TYPE_REGISTRATION);
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Too many attempts. Please request a new OTP');
    }

    await authRepository.incrementOtpAttempts(otpRecord.id);
    await authRepository.verifyOtpCode(otpRecord.id);

    logger.info(`OTP verified for ${email}`);

    return { message: 'OTP verified successfully', email };
  }

  async registerWithOtp(data: { email: string; name: string; password: string }) {
    // Verify OTP was used
    const otpRecord = await authRepository.getOtpCode(data.email, OTP_TYPE_REGISTRATION);
    if (!otpRecord || !await this.isOtpVerified(data.email)) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Please verify your email first');
    }

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

    await workspaceRepository.acceptPendingInvitationsForUser(user);

    // Clean up OTP
    await authRepository.deleteOtpCode(data.email, OTP_TYPE_REGISTRATION);

    logger.info(`User registered with OTP: ${user.email}`);

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepository.createRefreshToken(user.id, refreshToken, expiresAt);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        googleId: user.googleId,
        googleAvatar: user.googleAvatar,
        hasPassword: user.password !== null,
      },
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  private async isOtpVerified(email: string): Promise<boolean> {
    const otp = await prisma.otpCode.findFirst({
      where: { email, type: OTP_TYPE_REGISTRATION, verified: true },
    });
    return !!otp;
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
      systemRole: user.systemRole,
      googleId: user.googleId,
      googleAvatar: user.googleAvatar,
      hasPassword: user.password !== null,
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
      googleId: updated.googleId,
      googleAvatar: updated.googleAvatar,
      hasPassword: updated.password !== null,
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

  async completeOnboarding(userId: number, data: {
    name?: string;
    password?: string;
    workspaceName: string;
    workspaceSlug: string;
  }) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    // 1. Update user profile
    const updateData: UpdateProfileInput = {};
    if (data.name) {
      updateData.name = data.name;
    }

    if (data.password) {
      const hashedPassword = await hash(data.password, SALT_ROUNDS);
      await authRepository.updatePassword(userId, hashedPassword);
    }

    if (Object.keys(updateData).length > 0) {
      await authRepository.update(userId, updateData);
    }

    // 2. Normalize and validate slug
    const normalizedSlug = this.normalizeSlug(data.workspaceSlug);

    if (normalizedSlug.length < 1) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Tên URL không hợp lệ');
    }

    // Check slug uniqueness
    const isTaken = await workspaceRepository.isSlugTaken(normalizedSlug);
    if (isTaken) {
      throw ApiError.conflict(
        ErrorCode.VALIDATION_ERROR,
        'Tên không gian làm việc đã được sử dụng. Vui lòng chọn tên khác.',
      );
    }

    // 3. Create workspace with a temporary slug first
    const workspace = await workspaceService.createForUser(
      { name: data.workspaceName },
      userId,
    );

    // 4. Update workspace with the validated slug
    await workspaceRepository.updateSlug(workspace.id, normalizedSlug);

    // 5. Generate new tokens
    const updatedUser = await authRepository.findById(userId);
    const accessToken = this.generateAccessToken(updatedUser!);
    const refreshToken = this.generateRefreshToken(updatedUser!);

    // 6. Create refresh token record
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepository.createRefreshToken(userId, refreshToken, expiresAt);

    logger.info(`User ${userId} completed onboarding with workspace ${workspace.id}`);

    return {
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        name: updatedUser!.name,
        avatar: updatedUser!.avatar,
        bio: updatedUser!.bio,
        googleId: updatedUser!.googleId,
        googleAvatar: updatedUser!.googleAvatar,
        hasPassword: updatedUser!.password !== null,
      },
      accessToken,
      refreshToken,
      expiresIn: 900,
      workspace: {
        ...workspace,
        slug: normalizedSlug,
      },
    };
  }

  async uploadAvatar(
    userId: number,
    file: AvatarFile
  ): Promise<{ avatar: string }> {
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw ApiError.badRequest(
        ErrorCode.VALIDATION_ERROR,
        'Only JPEG, PNG, GIF, and WebP images are allowed'
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw ApiError.badRequest(
        ErrorCode.VALIDATION_ERROR,
        'Image size must be less than 5MB'
      );
    }

    const user = await authRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    // Delete old avatar if it's a local file
    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(process.cwd(), user.avatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Create avatars directory if it doesn't exist
    const avatarsDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const filename = `avatar-${userId}-${Date.now()}${ext}`;
    const filePath = path.join(avatarsDir, filename);
    const avatarUrl = `/uploads/avatars/${filename}`;

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Update user avatar in database
    await authRepository.update(userId, { avatar: avatarUrl });

    logger.info(`Avatar uploaded for user ${userId}: ${avatarUrl}`);

    return { avatar: avatarUrl };
  }

  private normalizeSlug(text: string): string {
    // Lowercase
    let slug = text.toLowerCase();
    // Remove accents/diacritics
    slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Replace spaces with hyphens
    slug = slug.replace(/\s+/g, '-');
    // Remove special characters (keep only alphanumeric and hyphens)
    slug = slug.replace(/[^a-z0-9-]/g, '');
    // Remove consecutive hyphens
    slug = slug.replace(/-+/g, '-');
    // Trim hyphens from start/end
    slug = slug.replace(/^-+|-+$/g, '');
    return slug;
  }

  private generateAccessToken(user: { id: number; email: string; systemRole?: string }): string {
    return jwt.sign(
      { userId: user.id, email: user.email, systemRole: user.systemRole || 'USER' },
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
