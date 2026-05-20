import { Request, Response } from 'express';
import { notificationPreferenceService } from './notification-preference.service';
import { BaseController } from '../../common/base/BaseController';
import { AuthenticatedRequest } from '../../types/interfaces';
import { success } from '../../common/utils/apiResponse';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';

export class NotificationPreferenceController extends BaseController {
  constructor() {
    super('NotificationPreferenceController');
  }

  /**
   * GET /notification-preferences
   */
  getPreferences = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const result = await notificationPreferenceService.getPreferences(authReq.user.id);
      res.json(success(result));
    });
  };

  /**
   * PATCH /notification-preferences/:eventType
   * Body: { email: boolean }
   */
  updatePreference = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const { eventType } = req.params;
      const { email } = req.body;

      const result = await notificationPreferenceService.updatePreference(
        authReq.user.id,
        eventType,
        { email },
      );
      res.json(success(result));
    });
  };
}

export const notificationPreferenceController = new NotificationPreferenceController();
