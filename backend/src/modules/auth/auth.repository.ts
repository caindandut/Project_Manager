import { BaseRepository } from '../../common/base/BaseRepository';
import { prisma } from '../../config';
import { User, RefreshToken, Workspace, Prisma } from '@prisma/client';

export class AuthRepository extends BaseRepository<User, Prisma.UserCreateInput, Prisma.UserUpdateInput> {
  constructor() {
    super(prisma, prisma.user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { googleId } });
  }

  async linkGoogleId(userId: number, googleId: string, googleAvatar?: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { 
        googleId,
        ...(googleAvatar ? { googleAvatar } : {}),
      },
    });
  }

  async findByIdWithRefreshTokens(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { refreshTokens: true },
    });
  }

  async findByIdWithResetTokens(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { resetTokens: true },
    });
  }

  async findResetToken(tokenHash: string): Promise<User | null> {
    const resetToken = await prisma.resetToken.findFirst({
      where: { token: tokenHash, expiresAt: { gt: new Date() } },
    });
    if (!resetToken) return null;
    return prisma.user.findUnique({ where: { id: resetToken.userId } });
  }

  async findActiveResetToken(userId: number): Promise<{ expiresAt: Date } | null> {
    return prisma.resetToken.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    }) as Promise<{ expiresAt: Date } | null>;
  }

  async createResetToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    await prisma.resetToken.deleteMany({ where: { userId } });
    await prisma.resetToken.create({
      data: { userId, token, expiresAt },
    });
  }

  async deleteResetToken(userId: number): Promise<void> {
    await prisma.resetToken.deleteMany({ where: { userId } });
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }

  async deleteAllRefreshTokens(userId: number): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { token } });
  }

  async createRefreshToken(userId: number, token: string, expiresAt: Date): Promise<RefreshToken> {
    return prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async hasWorkspaces(userId: number): Promise<boolean> {
    const count = await prisma.workspaceMember.count({
      where: {
        userId,
        deletedAt: null,
      },
    });
    return count > 0;
  }

  // OTP methods
  async createOtpCode(email: string, code: string, type: string, expiresAt: Date): Promise<void> {
    // Delete existing OTPs for this email and type
    await prisma.otpCode.deleteMany({
      where: { email, type },
    });
    await prisma.otpCode.create({
      data: { email, code, type, expiresAt },
    });
  }

  async findValidOtpCode(email: string, code: string, type: string): Promise<{ id: number; attempts: number } | null> {
    return prisma.otpCode.findFirst({
      where: {
        email,
        code,
        type,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, attempts: true },
    });
  }

  async incrementOtpAttempts(id: number): Promise<void> {
    await prisma.otpCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  async verifyOtpCode(id: number): Promise<void> {
    await prisma.otpCode.update({
      where: { id },
      data: { verified: true },
    });
  }

  async deleteOtpCode(email: string, type: string): Promise<void> {
    await prisma.otpCode.deleteMany({
      where: { email, type },
    });
  }

  async getOtpCode(email: string, type: string): Promise<{ code: string; expiresAt: Date } | null> {
    const otp = await prisma.otpCode.findFirst({
      where: { email, type, expiresAt: { gt: new Date() } },
      select: { code: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return otp as { code: string; expiresAt: Date } | null;
  }
}

export const authRepository = new AuthRepository();
