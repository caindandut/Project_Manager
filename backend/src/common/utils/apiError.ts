import { HTTP_STATUS } from '../../config/constants';
import { ErrorCode } from '../../types/enums';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
  }

  static badRequest(code: ErrorCode, message: string, details?: unknown): ApiError {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, code, message, details);
  }

  static unauthorized(code: ErrorCode, message: string): ApiError {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, code, message);
  }

  static forbidden(code: ErrorCode, message: string): ApiError {
    return new ApiError(HTTP_STATUS.FORBIDDEN, code, message);
  }

  static notFound(code: ErrorCode, message: string): ApiError {
    return new ApiError(HTTP_STATUS.NOT_FOUND, code, message);
  }

  static conflict(code: ErrorCode, message: string): ApiError {
    return new ApiError(HTTP_STATUS.CONFLICT, code, message);
  }

  static internal(message: string): ApiError {
    return new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ErrorCode.INTERNAL_ERROR,
      message
    );
  }
}
