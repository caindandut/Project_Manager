import { Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { logger } from '../../common/utils/logger';
import { authService } from './auth.service';
import { BaseController } from '../../common/base/BaseController';
import { AuthenticatedRequest } from '../../types/interfaces';
import { success } from '../../common/utils/apiResponse';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { config } from '../../config';
import { getGoogleAuthUrl, verifyIdToken } from './google-auth.util';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { RegisterWithOtpDto } from './dto/register-with-otp.dto';

export class AuthController extends BaseController {
  constructor() {
    super('AuthController');
  }

  // ─── Google OAuth ──────────────────────────────────────────────────────────

  googleAuth = (_req: Request, res: Response): void => {
    const url = getGoogleAuthUrl();
    res.redirect(url);
  };

  googleCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, id_token } = req.query;

      let payload;
      if (typeof id_token === 'string' && id_token) {
        payload = await verifyIdToken(id_token);
      } else if (typeof code === 'string' && code) {
        const { OAuth2Client } = await import('google-auth-library');
        const oauth2Client = new OAuth2Client({
          clientId: config.GOOGLE_CLIENT_ID,
          clientSecret: config.GOOGLE_CLIENT_SECRET,
          redirectUri: config.GOOGLE_CALLBACK_URL,
        });
        const { tokens } = await oauth2Client.getToken(code);
        if (!tokens.id_token) {
          throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Google did not return an ID token');
        }
        payload = await verifyIdToken(tokens.id_token);
      } else {
        throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Missing code or id_token parameter');
      }

      let currentUserId: number | undefined;
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        try {
          const decoded = jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET) as JwtPayload;
          currentUserId = decoded.userId;
        } catch (err) {
          // Ignore invalid refresh token
        }
      }

      const result = await authService.googleLogin(payload, currentUserId);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      const frontendUrl = new URL('/google/callback', config.CLIENT_URL);
      frontendUrl.searchParams.set('accessToken', result.accessToken);
      frontendUrl.searchParams.set('requireOnboarding', String(result.requireOnboarding));
      frontendUrl.searchParams.set('user', JSON.stringify(result.user));
      res.redirect(frontendUrl.toString());
    } catch (error: any) {
      logger.error(`Google OAuth Callback error: ${error.message || error}`);
      const frontendUrl = new URL('/google/callback', config.CLIENT_URL);
      const errorMessage = error.message || 'Đăng nhập Google thất bại';
      frontendUrl.searchParams.set('error', errorMessage);
      res.redirect(frontendUrl.toString());
    }
  };

  // ─── Credentials ──────────────────────────────────────────────────────────

  register = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const result = await authService.register(req.body);
      res.status(201).json(success(result));
    });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const result = await authService.login(req.body);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      res.json(success({
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      }));
    });
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const result = await authService.logout(authReq.user.id);

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      res.json(success(result));
    });
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        throw ApiError.unauthorized(ErrorCode.AUTH_REFRESH_TOKEN_INVALID, 'Refresh token required');
      }

      const result = await authService.refresh(refreshToken);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      res.json(success({
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      }));
    });
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      res.json(success(result));
    });
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password);

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      res.json(success(result));
    });
  };

  me = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const result = await authService.getMe(authReq.user.id);
      res.json(success(result));
    });
  };

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const result = await authService.updateProfile(authReq.user.id, req.body);
      res.json(success(result));
    });
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const result = await authService.changePassword(authReq.user.id, req.body);

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      res.json(success(result));
    });
  };

  completeOnboarding = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const result = await authService.completeOnboarding(authReq.user.id, req.body);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      res.json(success(result));
    });
  };

  // ─── OTP Auth ────────────────────────────────────────────────────────────────

  sendOtp = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const dto = req.body as SendOtpDto;
      const result = await authService.sendOtp(dto.email);
      res.json(success(result));
    });
  };

  verifyOtp = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const dto = req.body as VerifyOtpDto;
      const result = await authService.verifyOtp(dto.email, dto.code);
      res.json(success(result));
    });
  };

  registerWithOtp = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const dto = req.body as RegisterWithOtpDto;
      const result = await authService.registerWithOtp(dto);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      res.status(201).json(success({
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      }));
    });
  };

  uploadAvatar = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      if (!req.file) {
        throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'No file uploaded');
      }

      const result = await authService.uploadAvatar(authReq.user.id, {
        originalname: req.file.originalname,
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      res.json(success(result));
    });
  };
}

export const authController = new AuthController();
