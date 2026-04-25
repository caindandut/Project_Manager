import { ApiResponse, PaginationMeta } from '../../types/interfaces';

export function success<T>(data: T, meta?: PaginationMeta): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(meta !== undefined ? { meta } : {}),
  };
}

export function paginated<T>(
  data: T[],
  meta: PaginationMeta
): ApiResponse<T[]> {
  return {
    success: true,
    data,
    meta,
  };
}

export function error<T>(
  code: string,
  message: string,
  details?: unknown
): ApiResponse<T> {
  const response: ApiResponse<T> = { success: false };
  response.error = { code, message };
  if (details !== undefined) {
    response.error.details = details;
  }
  return response;
}

export function noContent(): ApiResponse<null> {
  return {
    success: true,
    data: null,
  };
}

export function withMeta<T>(data: T, meta: PaginationMeta): ApiResponse<T> {
  return {
    success: true,
    data,
    meta,
  };
}
