import { Prisma } from '@prisma/client';
import {
  ListOptions,
  FilterOptions,
  SortOptions,
} from '../../types/interfaces';

// ---------------------------------------------------------------------------
// Model field allowlists — prevents field injection in filter/sort builders
// ---------------------------------------------------------------------------
const MODEL_ALLOWED_FIELDS: Record<string, Set<string>> = {
  User: new Set([
    'id', 'email', 'name', 'avatar', 'bio',
    'createdAt', 'updatedAt', 'deletedAt',
  ]),
  RefreshToken: new Set([
    'id', 'token', 'expiresAt',
    'userId', 'createdAt', 'updatedAt',
  ]),
  Workspace: new Set([
    'id', 'name', 'description', 'logo',
    'createdAt', 'updatedAt', 'deletedAt',
  ]),
  WorkspaceMember: new Set([
    'id', 'role', 'joinedAt',
    'userId', 'workspaceId', 'createdAt', 'updatedAt', 'deletedAt',
  ]),
  Project: new Set([
    'id', 'name', 'description', 'key', 'color',
    'workspaceId', 'ownerId',
    'createdAt', 'updatedAt', 'deletedAt',
  ]),
  Task: new Set([
    'id', 'title', 'description', 'type', 'status', 'priority',
    'dueDate', 'estimatedHours', 'loggedHours', 'order',
    'projectId', 'assigneeId', 'parentId',
    'createdAt', 'updatedAt', 'deletedAt',
  ]),
  Comment: new Set([
    'id', 'content',
    'userId', 'taskId',
    'createdAt', 'updatedAt', 'deletedAt',
  ]),
  Attachment: new Set([
    'id', 'fileName', 'fileUrl', 'fileSize', 'mimeType',
    'taskId', 'uploadedById',
    'createdAt', 'updatedAt', 'deletedAt',
  ]),
  ActivityLog: new Set([
    'id', 'action', 'entityType', 'entityId', 'metadata',
    'userId', 'taskId', 'createdAt',
  ]),
  Notification: new Set([
    'id', 'type', 'title', 'message', 'isRead',
    'userId', 'taskId',
    'createdAt', 'updatedAt', 'deletedAt',
  ]),
};

// ---------------------------------------------------------------------------
// BaseRepository
// Accepts the Prisma model delegate directly (e.g. prisma.user) so concrete
// repositories keep their existing `super(prisma, prisma.user)` call unchanged.
// The delegate type is narrowed with `as any` — concrete subclasses that
// reference their own model property remain fully typed.
// ---------------------------------------------------------------------------
export abstract class BaseRepository<
  T extends { id: number },
  CreateInput,
  UpdateInput,
> {
  // The concrete subclass is responsible for typing its own `this.model`.
  // Using `any` here to avoid coupling to a specific delegate type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected readonly model: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(protected readonly prisma: any, delegate: any) {
    this.model = delegate;
  }

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  async findMany(options?: ListOptions): Promise<{ data: T[]; total: number }> {
    const where = this.buildWhereClause(options?.filter);
    const orderBy = this.buildOrderBy(options?.sort);
    const pagination = this.buildPagination(options?.pagination);

    const queryOptions: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderBy?: any;
      skip?: number;
      take?: number;
      cursor?: { id: number };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      include?: any;
    } = {
      where,
      orderBy,
      ...pagination,
    };

    if (options?.include) {
      queryOptions.include = options.include;
    }

    const [data, total] = await Promise.all([
      this.model.findMany(queryOptions),
      this.model.count({ where }),
    ]);

    return { data: data as T[], total };
  }

  async findById(id: number, include?: Record<string, boolean | object>): Promise<T | null> {
    const queryOptions: {
      where: { id: number };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      include?: any;
    } = { where: { id } };

    if (include) {
      queryOptions.include = include;
    }

    const result = await this.model.findUnique(queryOptions);
    return result as T | null;
  }

  async count(filters?: FilterOptions[]): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.model.count({ where });
  }

  // -------------------------------------------------------------------------
  // Write
  // -------------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async create(data: CreateInput): Promise<T> {
    const result = await this.model.create({ data: data as object });
    return result as T;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async update(id: number, data: UpdateInput): Promise<T> {
    const result = await this.model.update({
      where: { id },
      data: data as object,
    });
    return result as T;
  }

  async delete(id: number): Promise<T> {
    const result = await this.model.delete({ where: { id } });
    return result as T;
  }

  async softDelete(id: number): Promise<T> {
    const result = await this.model.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return result as T;
  }

  // -------------------------------------------------------------------------
  // Query builders — field allowlist enforced per model
  // -------------------------------------------------------------------------

  protected buildWhereClause(filters?: FilterOptions[]): Prisma.UserWhereInput {
    if (!filters || filters.length === 0) return {};

    const allowedFields = this.getAllowedFields();
    const where: Record<string, unknown> = {};

    for (const filter of filters) {
      if (!allowedFields.has(filter.field)) continue;

      switch (filter.operator) {
        case 'eq':
          where[filter.field] = filter.value;
          break;
        case 'neq':
          where[filter.field] = { not: filter.value };
          break;
        case 'gt':
          where[filter.field] = { gt: filter.value };
          break;
        case 'gte':
          where[filter.field] = { gte: filter.value };
          break;
        case 'lt':
          where[filter.field] = { lt: filter.value };
          break;
        case 'lte':
          where[filter.field] = { lte: filter.value };
          break;
        case 'contains':
          where[filter.field] = { contains: filter.value };
          break;
        case 'in':
          where[filter.field] = { in: filter.value };
          break;
        case 'nin':
          where[filter.field] = { notIn: filter.value };
          break;
      }
    }

    return where as Prisma.UserWhereInput;
  }

  protected buildOrderBy(
    sort?: SortOptions[],
  ): Prisma.UserOrderByWithRelationInput | Prisma.UserOrderByWithRelationInput[] {
    if (!sort || sort.length === 0) return { createdAt: 'desc' };

    const allowedFields = this.getAllowedFields();
    const result = sort
      .filter(s => allowedFields.has(s.field))
      .map(s => ({ [s.field]: s.direction }));

    return result.length > 0
      ? (result as Prisma.UserOrderByWithRelationInput)
      : { createdAt: 'desc' };
  }

  protected buildPagination(
    pagination?: ListOptions['pagination'],
  ): { skip?: number; take?: number; cursor?: { id: number } } {
    if (!pagination) return {};

    if (pagination.cursor) {
      return {
        cursor: { id: parseInt(pagination.cursor, 10) },
        take: pagination.limit ?? 20,
        skip: 1,
      };
    }

    return {
      skip: pagination.offset ?? ((pagination.page! - 1) * (pagination.limit ?? 20)),
      take: pagination.limit ?? 20,
    };
  }

  /** Override in subclass to restrict fields for a specific model */
  protected getAllowedFields(): Set<string> {
    return new Set();
  }
}
