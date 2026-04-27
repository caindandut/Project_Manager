export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  CURSOR_LIMIT: 20,
} as const;

export const TASK_SUBTASK_LIMIT = 100;

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
] as const;

export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  ARCHIVE: 50 * 1024 * 1024, // 50MB
} as const;

export const TOKEN_EXPIRY = {
  ACCESS: '15m',
  REFRESH: '7d',
  PASSWORD_RESET: '1h',
} as const;

export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  AUTH_MAX_REQUESTS: 10,
} as const;

export const WORKSPACE_ROLES_HIERARCHY = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  GUEST: 1,
} as const;

export const ALLOWED_SORT_FIELDS = {
  USER: ['createdAt', 'name', 'email'],
  WORKSPACE: ['createdAt', 'name'],
  PROJECT: ['createdAt', 'name', 'key'],
  TASK: ['createdAt', 'updatedAt', 'dueDate', 'priority', 'status', 'order'],
  COMMENT: ['createdAt', 'updatedAt'],
  ATTACHMENT: ['createdAt', 'fileName', 'fileSize'],
  NOTIFICATION: ['createdAt', 'isRead'],
  ACTIVITY_LOG: ['createdAt'],
} as const;

export const ROLE_PERMISSIONS = {
  OWNER: ['*'],
  ADMIN: [
    'workspace:read',
    'workspace:update',
    'project:create',
    'project:read',
    'project:update',
    'project:delete',
    'task:create',
    'task:read',
    'task:update',
    'task:delete',
    'comment:create',
    'comment:read',
    'comment:update',
    'comment:delete',
    'attachment:create',
    'attachment:read',
    'attachment:delete',
    'member:read',
    'member:invite',
    'member:update',
    'member:remove',
  ],
  MEMBER: [
    'workspace:read',
    'workspace:update',
    'project:create',
    'project:read',
    'project:update',
    'project:delete',
    'task:create',
    'task:read',
    'task:update',
    'task:delete',
    'comment:create',
    'comment:read',
    'comment:update',
    'comment:delete',
    'attachment:create',
    'attachment:read',
    'attachment:delete',
    'member:read',
  ],
  GUEST: [
    'workspace:read',
    'project:read',
    'task:read',
    'comment:read',
    'attachment:read',
    'member:read',
  ],
} as const;
