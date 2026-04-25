import { ListOptions, PaginationMeta } from '../../types/interfaces';
import { ApiError } from '../utils/apiError';
import { ErrorCode } from '../../types/enums';

export abstract class BaseService<
  T,
  CreateInput,
  UpdateInput
> {
  abstract getById(id: number): Promise<T>;
  abstract getAll(options?: ListOptions): Promise<{ data: T[]; meta?: PaginationMeta }>;
  abstract create(data: CreateInput): Promise<T>;
  abstract update(id: number, data: UpdateInput, ...args: unknown[]): Promise<T>;
  abstract delete(id: number, ...args: unknown[]): Promise<T>;

  protected async findOrThrow(
    getter: () => Promise<T | null>,
    errorCode: ErrorCode,
    errorMessage: string
  ): Promise<T> {
    const result = await getter();
    if (!result) {
      throw ApiError.notFound(errorCode, errorMessage);
    }
    return result;
  }

  protected buildPaginationMeta(
    total: number,
    page?: number,
    limit?: number
  ): PaginationMeta {
    if (page !== undefined && limit !== undefined) {
      return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    }
    return { total };
  }
}
