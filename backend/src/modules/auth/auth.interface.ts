import { RegisterInput, LoginInput, ChangePasswordInput, UpdateProfileInput } from './auth.service';

export interface IAuthRepository {
  findByEmail(email: string): Promise<import('@prisma/client').User | null>;
  findByGoogleId(googleId: string): Promise<import('@prisma/client').User | null>;
  findById(id: number): Promise<import('@prisma/client').User | null>;
  findByIdWithRefreshTokens(id: number): Promise<import('@prisma/client').User | null>;
  findResetToken(token: string): Promise<import('@prisma/client').User | null>;
  findRefreshToken(token: string): Promise<import('@prisma/client').RefreshToken | null>;
  create(data: import('@prisma/client').Prisma.UserCreateInput): Promise<import('@prisma/client').User>;
  update(id: number, data: import('@prisma/client').Prisma.UserUpdateInput): Promise<import('@prisma/client').User>;
  linkGoogleId(id: number, googleId: string): Promise<import('@prisma/client').User>;
  updatePassword(id: number, hashedPassword: string): Promise<import('@prisma/client').User>;
  createRefreshToken(userId: number, token: string, expiresAt: Date): Promise<import('@prisma/client').RefreshToken>;
  createResetToken(userId: number, token: string, expiresAt: Date): Promise<void>;
  deleteRefreshToken(token: string): Promise<void>;
  deleteAllRefreshTokens(userId: number): Promise<void>;
}

export interface IAuthService {
  register(data: RegisterInput): Promise<unknown>;
  login(data: LoginInput): Promise<unknown>;
  googleLogin(payload: import('./google-auth.util').GoogleUserPayload): Promise<unknown>;
  logout(userId: number): Promise<unknown>;
  refresh(refreshToken: string): Promise<unknown>;
  forgotPassword(email: string): Promise<unknown>;
  resetPassword(token: string, newPassword: string): Promise<unknown>;
  getMe(userId: number): Promise<unknown>;
  updateProfile(userId: number, data: UpdateProfileInput): Promise<unknown>;
  changePassword(userId: number, data: ChangePasswordInput): Promise<unknown>;
}

export interface IAuthController {
  register: import('express').RequestHandler;
  login: import('express').RequestHandler;
  googleAuth: import('express').RequestHandler;
  googleCallback: import('express').RequestHandler;
  logout: import('express').RequestHandler;
  refresh: import('express').RequestHandler;
  forgotPassword: import('express').RequestHandler;
  resetPassword: import('express').RequestHandler;
  me: import('express').RequestHandler;
  updateProfile: import('express').RequestHandler;
  changePassword: import('express').RequestHandler;
}

export interface TokenPayload {
  userId: number;
  email: string;
}
