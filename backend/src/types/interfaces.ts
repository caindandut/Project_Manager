import { Request } from 'express';

export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  cursor?: string;
  hasMore?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorDetail;
  meta?: PaginationMeta;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  workspaceRole?: WorkspaceRole;
  workspaceId?: number;
}

export type WorkspaceRole = 'OWNER' | 'MEMBER' | 'GUEST';

export interface QueryParams {
  page?: number;
  limit?: number;
  cursor?: string;
  offset?: number;
  sort?: string;
  filter?: Record<string, Record<string, string | string[]>>;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  offset?: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'nin';
  value: string | string[];
}

export interface ListOptions {
  pagination?: PaginationOptions;
  sort?: SortOptions[];
  filter?: FilterOptions[];
  include?: Record<string, boolean | object>;
}

export interface RepositoryInterface<T, CreateInput, UpdateInput> {
  findById(id: number, include?: Record<string, boolean | object>): Promise<T | null>;
  findMany(options?: ListOptions): Promise<{ data: T[]; total: number }>;
  create(data: CreateInput): Promise<T>;
  update(id: number, data: UpdateInput): Promise<T>;
  delete(id: number): Promise<T>;
  count(filters?: FilterOptions[]): Promise<number>;
}

export interface ServiceInterface<T, CreateInput, UpdateInput> {
  getById(id: number): Promise<T>;
  getAll(options?: ListOptions): Promise<{ data: T[]; meta?: PaginationMeta }>;
  create(data: CreateInput): Promise<T>;
  update(id: number, data: UpdateInput, ...args: unknown[]): Promise<T>;
  delete(id: number, ...args: unknown[]): Promise<T>;
}
