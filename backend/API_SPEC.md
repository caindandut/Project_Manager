# PM Tool (Jira Mini) - REST API Specification

**Version:** 1.0  
**Base URL:** `/api/v1`  
**Content-Type:** `application/json`

---

## Table of Contents

1. [API Conventions](#1-api-conventions)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Auth Module](#3-auth-module)
4. [Workspace Module](#4-workspace-module)
5. [Project Module](#5-project-module)
6. [Task Module](#6-task-module)
7. [Comment Module](#7-comment-module)
8. [Attachment Module](#8-attachment-module)
9. [Notification Module](#9-notification-module)
10. [Report Module](#10-report-module)
11. [Error Codes Reference](#11-error-codes-reference)
12. [Example Requests/Responses](#12-example-requestsresponses)

---

## 1. API Conventions

### 1.1 Base URL Structure

```
/api/v1/{resource}
```

### 1.2 Response Format

All responses follow this structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    cursor?: string;
    hasMore?: boolean;
  };
}
```

**Success Response (2xx):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Paginated Response:**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Cursor-based Paginated Response:**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "cursor": "eyJpZCI6MTAsImNyZWF0ZWRBdCI6IjIwMjQtMDEtMTRUMTI6MDA6MDAuMDAwWiJ9",
    "limit": 20,
    "hasMore": true
  }
}
```

**Error Response (4xx/5xx):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### 1.3 Resource Hierarchy

```
/api/v1/workspaces/:workspaceId/projects/:projectId/tasks/:taskId/comments
/api/v1/workspaces/:workspaceId/members
/api/v1/tasks/:taskId/comments
/api/v1/tasks/:taskId/attachments
```

### 1.4 HTTP Methods

| Method | Purpose |
|--------|---------|
| `GET` | Retrieve resources |
| `POST` | Create new resource |
| `PUT` | Full update (replace resource) |
| `PATCH` | Partial update (modify fields) |
| `DELETE` | Remove resource (soft delete by default) |

### 1.5 Pagination

**Cursor-based** (for large lists: tasks, comments, notifications):
```
GET /api/v1/tasks?cursor=xxx&limit=20
```

**Offset-based** (for small lists <100 items: projects, workspaces):
```
GET /api/v1/workspaces?page=1&limit=20
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (1-indexed) |
| `limit` | integer | Items per page (default: 20, max: 100) |
| `cursor` | string | Opaque cursor for pagination |
| `offset` | integer | Number of items to skip (offset-based) |

### 1.6 Filtering

Query string format with operators:

```
GET /api/v1/tasks?filter[status][eq]=TODO&filter[priority][gte]=MEDIUM
```

**Supported Operators:**

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `filter[status][eq]=TODO` |
| `neq` | Not equals | `filter[status][neq]=DONE` |
| `gt` | Greater than | `filter[priority][gt]=LOW` |
| `gte` | Greater than or equal | `filter[priority][gte]=MEDIUM` |
| `lt` | Less than | `filter[dueDate][lt]=2024-02-01` |
| `lte` | Less than or equal | `filter[estimatedHours][lte]=8` |
| `contains` | Partial match | `filter[title][contains]=bug` |
| `in` | In array | `filter[status][in]=TODO,IN_PROGRESS` |
| `nin` | Not in array | `filter[status][nin]=DONE` |

### 1.7 Sorting

```
GET /api/v1/tasks?sort=createdAt:desc&sort=priority:asc
```

Format: `?sort={field}:{direction}`

Directions: `asc` (ascending), `desc` (descending)

### 1.8 Date Format

All dates in ISO 8601 format: `2024-01-15T12:00:00.000Z`

### 1.9 UUID vs Integer IDs

Use **integer IDs** for all resources (matches Prisma schema with `@id @default(autoincrement())`).

---

## 2. Authentication & Authorization

### 2.1 Authentication Flow

**JWT Access Token** (15 minutes expiry):
- Sent via `Authorization: Bearer <token>` header
- Contains: `userId`, `email`, `workspaceRoles`

**Refresh Token** (7 days expiry):
- Stored in httpOnly cookie `refreshToken`
- Uses rotation strategy (new refresh token on each refresh)

### 2.2 Middleware Stack

```
Request → Rate Limiter → Auth Middleware → RBAC Middleware → Controller
```

### 2.3 Auth Middleware

Validates JWT and attaches user to request:

```typescript
interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
  };
}
```

### 2.4 RBAC Middleware

Checks user role in target workspace:

**Workspace Roles:**

| Role | Description | Capabilities |
|------|-------------|--------------|
| `OWNER` | Workspace owner | Full access, manage members, delete workspace |
| `MEMBER` | Workspace member | Create projects, tasks; manage own tasks |
| `GUEST` | Guest user | Read-only access to assigned content |

**Role Hierarchy:** OWNER > MEMBER > GUEST

### 2.5 Public Endpoints (No Auth Required)

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/register` | User registration |
| `POST /api/v1/auth/login` | User login |
| `POST /api/v1/auth/forgot-password` | Request password reset |
| `POST /api/v1/auth/reset-password` | Reset password with token |
| `POST /api/v1/auth/refresh` | Refresh access token |
| `GET /api/v1/health` | Health check |

---

## 3. Auth Module

### 3.1 Endpoints Overview

| Method | Endpoint | Description | Auth | RBAC | Pagination |
|--------|----------|-------------|------|------|------------|
| POST | `/auth/register` | Register new user | No | - | - |
| POST | `/auth/login` | User login | No | - | - |
| POST | `/auth/logout` | User logout | Yes | - | - |
| POST | `/auth/refresh` | Refresh tokens | No | - | - |
| POST | `/auth/forgot-password` | Request password reset | No | - | - |
| POST | `/auth/reset-password` | Reset with token | No | - | - |
| GET | `/auth/me` | Get current user | Yes | - | - |
| POST | `/auth/change-password` | Change password | Yes | - | - |
| PATCH | `/auth/me` | Update profile | Yes | - | - |

---

### 3.2 Register User

**POST** `/api/v1/auth/register`

**Description:** Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Validation:**
- `email`: Required, valid email format, unique
- `password`: Required, min 8 chars, must contain uppercase, lowercase, number
- `name`: Required, 2-100 characters

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": null,
    "bio": null,
    "createdAt": "2024-01-15T12:00:00.000Z"
  }
}
```

**Errors:**
- `VALIDATION_ERROR` (400)
- `EMAIL_ALREADY_EXISTS` (409)

---

### 3.3 Login

**POST** `/api/v1/auth/login`

**Description:** Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "avatar": "https://...",
      "bio": "Developer"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

**Set-Cookie:**
```
refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/
```

**Errors:**
- `INVALID_CREDENTIALS` (401)
- `USER_DELETED` (403)

---

### 3.4 Logout

**POST** `/api/v1/auth/logout`

**Description:** Invalidate refresh token (logout user).

**Auth:** Yes

**Request Body:** None

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

**Set-Cookie:**
```
refreshToken=; HttpOnly; Secure; Max-Age=0; Path=/
```

---

### 3.5 Refresh Token

**POST** `/api/v1/auth/refresh`

**Description:** Get new access token using refresh token.

**Auth:** No (uses httpOnly cookie)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

**Errors:**
- `REFRESH_TOKEN_EXPIRED` (401)
- `REFRESH_TOKEN_INVALID` (401)

---

### 3.6 Forgot Password

**POST** `/api/v1/auth/forgot-password`

**Description:** Send password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "If an account exists, a reset email has been sent"
  }
}
```

---

### 3.7 Reset Password

**POST** `/api/v1/auth/reset-password`

**Description:** Reset password using token from email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully"
  }
}
```

**Errors:**
- `RESET_TOKEN_EXPIRED` (400)
- `RESET_TOKEN_INVALID` (400)

---

### 3.8 Get Current User

**GET** `/api/v1/auth/me`

**Description:** Get authenticated user's profile.

**Auth:** Yes

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "bio": "Developer",
    "createdAt": "2024-01-15T12:00:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

---

### 3.9 Update Profile

**PATCH** `/api/v1/auth/me`

**Description:** Update current user's profile.

**Auth:** Yes

**Request Body:**
```json
{
  "name": "John Updated",
  "bio": "Senior Developer",
  "avatar": "https://..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Updated",
    "avatar": "https://...",
    "bio": "Senior Developer",
    "updatedAt": "2024-01-16T10:00:00.000Z"
  }
}
```

---

### 3.10 Change Password

**POST** `/api/v1/auth/change-password`

**Description:** Change password while logged in.

**Auth:** Yes

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

**Errors:**
- `INVALID_CURRENT_PASSWORD` (400)

---

## 4. Workspace Module

### 4.1 Endpoints Overview

| Method | Endpoint | Description | Auth | RBAC | Pagination |
|--------|----------|-------------|------|------|------------|
| POST | `/workspaces` | Create workspace | Yes | - | - |
| GET | `/workspaces` | List user's workspaces | Yes | - | Offset |
| GET | `/workspaces/:workspaceId` | Get workspace detail | Yes | GUEST | - |
| PATCH | `/workspaces/:workspaceId` | Update workspace | Yes | OWNER | - |
| DELETE | `/workspaces/:workspaceId` | Delete workspace | Yes | OWNER | - |
| GET | `/workspaces/:workspaceId/members` | List members | Yes | GUEST | Offset |
| POST | `/workspaces/:workspaceId/members` | Invite member | Yes | OWNER | - |
| PATCH | `/workspaces/:workspaceId/members/:memberId` | Update member role | Yes | OWNER | - |
| DELETE | `/workspaces/:workspaceId/members/:memberId` | Remove member | Yes | OWNER/MEMBER (self) | - |
| DELETE | `/workspaces/:workspaceId/members/me` | Leave workspace | Yes | MEMBER/GUEST | - |

### 4.2 Resource URL Pattern

```
/api/v1/workspaces/:workspaceId/...
```

### 4.3 Create Workspace

**POST** `/api/v1/workspaces`

**Description:** Create a new workspace. Creator becomes OWNER.

**Auth:** Yes

**Request Body:**
```json
{
  "name": "Acme Corp",
  "description": "Main workspace for Acme team"
}
```

**Validation:**
- `name`: Required, 2-100 characters
- `description`: Optional, max 500 characters

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Acme Corp",
    "description": "Main workspace for Acme team",
    "logo": null,
    "createdAt": "2024-01-15T12:00:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

---

### 4.4 List Workspaces

**GET** `/api/v1/workspaces`

**Description:** List all workspaces the current user is a member of.

**Auth:** Yes

**Pagination:** Offset-based (max 100 items)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page |
| `sort` | string | `createdAt:desc` | Sort order |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Acme Corp",
      "description": "Main workspace",
      "logo": null,
      "role": "OWNER",
      "memberCount": 5,
      "projectCount": 3,
      "createdAt": "2024-01-15T12:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

---

### 4.5 Get Workspace Detail

**GET** `/api/v1/workspaces/:workspaceId`

**Description:** Get workspace details with member and project counts.

**Auth:** Yes

**RBAC:** GUEST (any member can view)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Acme Corp",
    "description": "Main workspace",
    "logo": "https://...",
    "role": "MEMBER",
    "stats": {
      "memberCount": 5,
      "projectCount": 3,
      "taskCount": 42
    },
    "createdAt": "2024-01-15T12:00:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

**Errors:**
- `WORKSPACE_NOT_FOUND` (404)
- `ACCESS_DENIED` (403)

---

### 4.6 Update Workspace

**PATCH** `/api/v1/workspaces/:workspaceId`

**Description:** Update workspace details.

**Auth:** Yes

**RBAC:** OWNER only

**Request Body:**
```json
{
  "name": "Acme Inc",
  "description": "Updated description",
  "logo": "https://..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Acme Inc",
    "description": "Updated description",
    "logo": "https://...",
    "updatedAt": "2024-01-16T10:00:00.000Z"
  }
}
```

---

### 4.7 Delete Workspace

**DELETE** `/api/v1/workspaces/:workspaceId`

**Description:** Permanently delete workspace and all related data.

**Auth:** Yes

**RBAC:** OWNER only

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Workspace deleted successfully"
  }
}
```

---

### 4.8 List Workspace Members

**GET** `/api/v1/workspaces/:workspaceId/members`

**Description:** List all members of a workspace.

**Auth:** Yes

**RBAC:** GUEST

**Pagination:** Offset-based

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 50 | Items per page |
| `role` | string | - | Filter by role |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "avatar": "https://..."
      },
      "role": "OWNER",
      "joinedAt": "2024-01-15T12:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### 4.9 Invite Member

**POST** `/api/v1/workspaces/:workspaceId/members`

**Description:** Add a new member to workspace.

**Auth:** Yes

**RBAC:** OWNER only

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "role": "MEMBER"
}
```

**Validation:**
- `email`: Required, valid email, existing user or send invite
- `role`: Required, one of `MEMBER`, `GUEST`

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 6,
    "user": {
      "id": 5,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "avatar": null
    },
    "role": "MEMBER",
    "joinedAt": "2024-01-16T10:00:00.000Z"
  }
}
```

**Errors:**
- `USER_NOT_FOUND` (404) - if email not registered
- `ALREADY_MEMBER` (409) - if user already in workspace
- `CANNOT_INVITE_AS_OWNER` (400)

---

### 4.10 Update Member Role

**PATCH** `/api/v1/workspaces/:workspaceId/members/:memberId`

**Description:** Change a member's role in workspace.

**Auth:** Yes

**RBAC:** OWNER only (cannot change own role)

**Request Body:**
```json
{
  "role": "GUEST"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 6,
    "role": "GUEST",
    "updatedAt": "2024-01-16T10:00:00.000Z"
  }
}
```

**Errors:**
- `CANNOT_CHANGE_OWNER_ROLE` (400)
- `CANNOT_CHANGE_OWNER_ROLE` (400)

---

### 4.11 Remove Member

**DELETE** `/api/v1/workspaces/:workspaceId/members/:memberId`

**Description:** Remove a member from workspace.

**Auth:** Yes

**RBAC:**
- OWNER: can remove any member except themselves
- MEMBER/GUEST: cannot remove others

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Member removed successfully"
  }
}
```

**Errors:**
- `CANNOT_REMOVE_OWNER` (400)
- `CANNOT_REMOVE_SELF` (400)

---

### 4.12 Leave Workspace

**DELETE** `/api/v1/workspaces/:workspaceId/members/me`

**Description:** Current user leaves workspace.

**Auth:** Yes

**RBAC:** MEMBER, GUEST (OWNER cannot leave, must transfer or delete)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Left workspace successfully"
  }
}
```

**Errors:**
- `OWNER_CANNOT_LEAVE` (400)

---

## 5. Project Module

### 5.1 Endpoints Overview

| Method | Endpoint | Description | Auth | RBAC | Pagination |
|--------|----------|-------------|------|------|------------|
| POST | `/workspaces/:workspaceId/projects` | Create project | Yes | MEMBER | - |
| GET | `/workspaces/:workspaceId/projects` | List projects | Yes | GUEST | Offset |
| GET | `/workspaces/:workspaceId/projects/:projectId` | Get project | Yes | GUEST | - |
| PATCH | `/workspaces/:workspaceId/projects/:projectId` | Update project | Yes | MEMBER | - |
| DELETE | `/workspaces/:workspaceId/projects/:projectId` | Delete project | Yes | OWNER | - |

### 5.2 Resource URL Pattern

```
/api/v1/workspaces/:workspaceId/projects/:projectId/...
```

### 5.3 Create Project

**POST** `/api/v1/workspaces/:workspaceId/projects`

**Description:** Create a new project in workspace.

**Auth:** Yes

**RBAC:** MEMBER

**Request Body:**
```json
{
  "name": "Backend API",
  "description": "Backend API development",
  "key": "API",
  "color": "#FF5733"
}
```

**Validation:**
- `name`: Required, 2-100 characters
- `key`: Required, 2-10 uppercase letters, unique within workspace
- `description`: Optional, max 500 characters
- `color`: Optional, hex color code

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Backend API",
    "description": "Backend API development",
    "key": "API",
    "color": "#FF5733",
    "workspaceId": 1,
    "owner": {
      "id": 1,
      "name": "John Doe",
      "avatar": "https://..."
    },
    "taskCount": 0,
    "createdAt": "2024-01-15T12:00:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

**Errors:**
- `PROJECT_KEY_EXISTS` (409)
- `INVALID_PROJECT_KEY` (400)

---

### 5.4 List Projects

**GET** `/api/v1/workspaces/:workspaceId/projects`

**Description:** List all projects in workspace.

**Auth:** Yes

**RBAC:** GUEST

**Pagination:** Offset-based

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page |
| `sort` | string | `createdAt:desc` | Sort order |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Backend API",
      "key": "API",
      "color": "#FF5733",
      "owner": {
        "id": 1,
        "name": "John Doe"
      },
      "taskCount": 15,
      "completedTaskCount": 8,
      "createdAt": "2024-01-15T12:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

---

### 5.5 Get Project Detail

**GET** `/api/v1/workspaces/:workspaceId/projects/:projectId`

**Description:** Get detailed project information.

**Auth:** Yes

**RBAC:** GUEST

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Backend API",
    "description": "Backend API development",
    "key": "API",
    "color": "#FF5733",
    "workspaceId": 1,
    "owner": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": "https://..."
    },
    "stats": {
      "totalTasks": 15,
      "todoTasks": 3,
      "inProgressTasks": 4,
      "reviewTasks": 2,
      "doneTasks": 6,
      "subtaskCount": 10
    },
    "recentTasks": [
      {
        "id": 5,
        "title": "Implement auth",
        "status": "IN_PROGRESS",
        "priority": "HIGH"
      }
    ],
    "createdAt": "2024-01-15T12:00:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

---

### 5.6 Update Project

**PATCH** `/api/v1/workspaces/:workspaceId/projects/:projectId`

**Description:** Update project details.

**Auth:** Yes

**RBAC:** MEMBER (owner can update all, others can only update description)

**Request Body:**
```json
{
  "name": "Backend API v2",
  "description": "Updated description",
  "key": "API2",
  "color": "#3498DB"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Backend API v2",
    "key": "API2",
    "color": "#3498DB",
    "updatedAt": "2024-01-16T10:00:00.000Z"
  }
}
```

---

### 5.7 Delete Project

**DELETE** `/api/v1/workspaces/:workspaceId/projects/:projectId`

**Description:** Soft delete project and all related data.

**Auth:** Yes

**RBAC:** OWNER

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Project deleted successfully"
  }
}
```

---

## 6. Task Module

### 6.1 Endpoints Overview

| Method | Endpoint | Description | Auth | RBAC | Pagination |
|--------|----------|-------------|------|------|------------|
| POST | `/projects/:projectId/tasks` | Create task | Yes | MEMBER | - |
| POST | `/tasks/:taskId/subtasks` | Create subtask | Yes | MEMBER | - |
| GET | `/projects/:projectId/tasks` | List project tasks | Yes | GUEST | Cursor |
| GET | `/tasks/:taskId` | Get task detail | Yes | GUEST | - |
| PATCH | `/tasks/:taskId` | Update task | Yes | MEMBER | - |
| DELETE | `/tasks/:taskId` | Delete task | Yes | MEMBER | - |
| PATCH | `/tasks/:taskId/status` | Quick status change | Yes | MEMBER | - |
| PATCH | `/tasks/:taskId/assignee` | Assign task | Yes | MEMBER | - |
| POST | `/tasks/:taskId/time-log` | Log time | Yes | MEMBER | - |

### 6.2 Resource URL Pattern

```
/api/v1/projects/:projectId/tasks
/api/v1/tasks/:taskId
/api/v1/tasks/:taskId/subtasks
/api/v1/tasks/:taskId/comments
/api/v1/tasks/:taskId/attachments
```

### 6.3 Create Task

**POST** `/api/v1/projects/:projectId/tasks`

**Description:** Create a new task (type=TASK) in project.

**Auth:** Yes

**RBAC:** MEMBER

**Request Body:**
```json
{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication with refresh tokens",
  "priority": "HIGH",
  "dueDate": "2024-02-15T00:00:00.000Z",
  "estimatedHours": 8,
  "assigneeId": 2
}
```

**Validation:**
- `title`: Required, 1-255 characters
- `description`: Optional, max 5000 characters
- `priority`: Optional, one of `LOWEST`, `LOW`, `MEDIUM`, `HIGH`, `HIGHEST` (default: MEDIUM)
- `dueDate`: Optional, ISO 8601 date
- `estimatedHours`: Optional, positive number
- `assigneeId`: Optional, valid user ID in workspace

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication",
    "type": "TASK",
    "status": "TODO",
    "priority": "HIGH",
    "dueDate": "2024-02-15T00:00:00.000Z",
    "estimatedHours": 8,
    "loggedHours": 0,
    "order": 0,
    "projectId": 1,
    "assignee": {
      "id": 2,
      "name": "Jane Smith",
      "avatar": "https://..."
    },
    "subTaskCount": 0,
    "commentCount": 0,
    "createdAt": "2024-01-15T12:00:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

---

### 6.4 Create Subtask

**POST** `/api/v1/tasks/:taskId/subtasks`

**Description:** Create a subtask (type=SUB_TASK) under parent task.

**Auth:** Yes

**RBAC:** MEMBER

**Request Body:**
```json
{
  "title": "Design database schema",
  "description": "Create tables for users and refresh tokens",
  "priority": "MEDIUM",
  "assigneeId": 3
}
```

**Validation:** Same as Create Task

**Behavior:**
- Auto-sets `type` to `SUB_TASK`
- Auto-sets `parentId` to `:taskId`
- Inherits `projectId` from parent task
- Maximum nesting depth: 1 level (subtasks cannot have subtasks)

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "title": "Design database schema",
    "type": "SUB_TASK",
    "status": "TODO",
    "priority": "MEDIUM",
    "parentId": 1,
    "projectId": 1,
    "assignee": {
      "id": 3,
      "name": "Bob Wilson"
    },
    "createdAt": "2024-01-15T12:00:00.000Z"
  }
}
```

---

### 6.5 List Project Tasks

**GET** `/api/v1/projects/:projectId/tasks`

**Description:** List all tasks in a project with filtering, sorting, and pagination.

**Auth:** Yes

**RBAC:** GUEST

**Pagination:** Cursor-based

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cursor` | string | - | Pagination cursor |
| `limit` | integer | 20 | Items per page (max 100) |
| `status` | string | - | Filter by status |
| `priority` | string | - | Filter by priority |
| `assigneeId` | integer | - | Filter by assignee |
| `type` | string | - | Filter by type (TASK/SUB_TASK) |
| `hasSubtasks` | boolean | - | Filter tasks with/without subtasks |
| `sort` | string | `order:asc,createdAt:desc` | Sort order |

**Filter Examples:**
```
?filter[status][eq]=TODO
?filter[priority][gte]=HIGH
?filter[assigneeId][in]=1,2,3
?filter[title][contains]=auth
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Implement user authentication",
      "type": "TASK",
      "status": "TODO",
      "priority": "HIGH",
      "dueDate": "2024-02-15T00:00:00.000Z",
      "assignee": {
        "id": 2,
        "name": "Jane Smith",
        "avatar": null
      },
      "subTaskCount": 3,
      "commentCount": 5,
      "order": 0
    }
  ],
  "meta": {
    "cursor": "eyJpZCI6MSwia2V5IjoiQVBJIn0=",
    "limit": 20,
    "hasMore": true
  }
}
```

**Grouped Response (optional view):**
```
GET /api/v1/projects/:projectId/tasks?view=grouped
```

```json
{
  "success": true,
  "data": {
    "TODO": [
      { "id": 1, "title": "Task 1", "order": 0 },
      { "id": 2, "title": "Task 2", "order": 1 }
    ],
    "IN_PROGRESS": [...],
    "REVIEW": [...],
    "DONE": [...]
  },
  "meta": {
    "total": 25,
    "counts": {
      "TODO": 5,
      "IN_PROGRESS": 8,
      "REVIEW": 3,
      "DONE": 9
    }
  }
}
```

---

### 6.6 Get Task Detail

**GET** `/api/v1/tasks/:taskId`

**Description:** Get detailed task with subtasks, comments, attachments, and activity.

**Auth:** Yes

**RBAC:** GUEST

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `includeSubTasks` | boolean | true | Include subtasks |
| `includeComments` | boolean | true | Include recent comments |
| `includeAttachments` | boolean | true | Include attachments |
| `includeActivity` | boolean | false | Include activity log |
| `commentLimit` | integer | 5 | Number of comments to include |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication with refresh tokens",
    "type": "TASK",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "dueDate": "2024-02-15T00:00:00.000Z",
    "estimatedHours": 8,
    "loggedHours": 3.5,
    "order": 0,
    "projectId": 1,
    "project": {
      "id": 1,
      "name": "Backend API",
      "key": "API"
    },
    "assignee": {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "avatar": "https://..."
    },
    "parent": null,
    "subTasks": [
      {
        "id": 2,
        "title": "Design database schema",
        "status": "DONE",
        "priority": "MEDIUM"
      }
    ],
    "comments": [
      {
        "id": 1,
        "content": "Started working on this",
        "user": {
          "id": 2,
          "name": "Jane Smith",
          "avatar": null
        },
        "createdAt": "2024-01-15T14:00:00.000Z"
      }
    ],
    "attachments": [
      {
        "id": 1,
        "fileName": "design.png",
        "fileUrl": "https://...",
        "fileSize": 102400,
        "mimeType": "image/png",
        "uploadedBy": {
          "id": 2,
          "name": "Jane Smith"
        },
        "createdAt": "2024-01-15T15:00:00.000Z"
      }
    ],
    "createdAt": "2024-01-15T12:00:00.000Z",
    "updatedAt": "2024-01-15T16:00:00.000Z"
  }
}
```

---

### 6.7 Update Task

**PATCH** `/api/v1/tasks/:taskId`

**Description:** Update task fields (partial update).

**Auth:** Yes

**RBAC:** MEMBER (assignee or owner can update all, others can only update status)

**Request Body:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "IN_PROGRESS",
  "priority": "HIGHEST",
  "dueDate": "2024-02-20T00:00:00.000Z",
  "estimatedHours": 16,
  "assigneeId": 3,
  "order": 5
}
```

**Validation:**
- All fields optional
- `status`: must be valid TaskStatus
- `priority`: must be valid TaskPriority
- `dueDate`: must be valid ISO 8601 date
- `estimatedHours`: must be positive number
- `assigneeId`: must be valid user in workspace or null

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Updated title",
    "status": "IN_PROGRESS",
    "priority": "HIGHEST",
    "dueDate": "2024-02-20T00:00:00.000Z",
    "updatedAt": "2024-01-16T10:00:00.000Z"
  }
}
```

---

### 6.8 Delete Task

**DELETE** `/api/v1/tasks/:taskId`

**Description:** Soft delete task and cascade delete subtasks.

**Auth:** Yes

**RBAC:** MEMBER (owner of task or project owner can delete)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Task deleted successfully",
    "deletedSubTaskCount": 3
  }
}
```

---

### 6.9 Quick Status Change

**PATCH** `/api/v1/tasks/:taskId/status`

**Description:** Quick endpoint to change only task status.

**Auth:** Yes

**RBAC:** MEMBER

**Request Body:**
```json
{
  "status": "DONE"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "DONE",
    "updatedAt": "2024-01-16T10:00:00.000Z"
  }
}
```

---

### 6.10 Assign Task

**PATCH** `/api/v1/tasks/:taskId/assignee`

**Description:** Assign or unassign a user to task.

**Auth:** Yes

**RBAC:** MEMBER

**Request Body:**
```json
{
  "assigneeId": 3
}
```

Set `assigneeId` to `null` to unassign.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "assignee": {
      "id": 3,
      "name": "Bob Wilson",
      "avatar": null
    },
    "updatedAt": "2024-01-16T10:00:00.000Z"
  }
}
```

---

### 6.11 Log Time

**POST** `/api/v1/tasks/:taskId/time-log`

**Description:** Log hours worked on task.

**Auth:** Yes

**RBAC:** MEMBER

**Request Body:**
```json
{
  "hours": 2.5,
  "note": "Implemented JWT middleware"
}
```

**Validation:**
- `hours`: Required, positive number
- `note`: Optional, max 500 characters

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "loggedHours": 6,
    "estimatedHours": 8,
    "progressPercentage": 75
  }
}
```

---

## 7. Comment Module

### 7.1 Endpoints Overview

| Method | Endpoint | Description | Auth | RBAC | Pagination |
|--------|----------|-------------|------|------|------------|
| GET | `/tasks/:taskId/comments` | List comments | Yes | GUEST | Cursor |
| POST | `/tasks/:taskId/comments` | Create comment | Yes | GUEST | - |
| PATCH | `/comments/:commentId` | Update comment | Yes | Comment owner | - |
| DELETE | `/comments/:commentId` | Delete comment | Yes | Comment owner | - |

### 7.2 List Comments

**GET** `/api/v1/tasks/:taskId/comments`

**Description:** List all comments on a task.

**Auth:** Yes

**RBAC:** GUEST

**Pagination:** Cursor-based

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cursor` | string | - | Pagination cursor |
| `limit` | integer | 20 | Items per page |
| `sort` | string | `createdAt:asc` | Sort order |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "content": "Started working on this task",
      "user": {
        "id": 2,
        "name": "Jane Smith",
        "avatar": "https://..."
      },
      "isEdited": false,
      "createdAt": "2024-01-15T14:00:00.000Z",
      "updatedAt": "2024-01-15T14:00:00.000Z"
    }
  ],
  "meta": {
    "cursor": "eyJpZCI6MSwia2F0IjoiMjAyNC0wMS0xNVQxNDowMDowMC4wMDBaIn0=",
    "limit": 20,
    "hasMore": false
  }
}
```

---

### 7.3 Create Comment

**POST** `/api/v1/tasks/:taskId/comments`

**Description:** Add a comment to a task.

**Auth:** Yes

**RBAC:** GUEST (any workspace member can comment)

**Request Body:**
```json
{
  "content": "This is my comment on the task"
}
```

**Validation:**
- `content`: Required, 1-5000 characters

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "content": "This is my comment on the task",
    "user": {
      "id": 1,
      "name": "John Doe",
      "avatar": "https://..."
    },
    "isEdited": false,
    "createdAt": "2024-01-16T10:00:00.000Z"
  }
}
```

---

### 7.4 Update Comment

**PATCH** `/api/v1/comments/:commentId`

**Description:** Update comment content (owner only).

**Auth:** Yes

**RBAC:** Comment owner

**Request Body:**
```json
{
  "content": "Updated comment content"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "content": "Updated comment content",
    "isEdited": true,
    "updatedAt": "2024-01-16T11:00:00.000Z"
  }
}
```

---

### 7.5 Delete Comment

**DELETE** `/api/v1/comments/:commentId`

**Description:** Soft delete a comment (owner only).

**Auth:** Yes

**RBAC:** Comment owner

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Comment deleted successfully"
  }
}
```

---

## 8. Attachment Module

### 8.1 Endpoints Overview

| Method | Endpoint | Description | Auth | RBAC | Pagination |
|--------|----------|-------------|------|------|------------|
| GET | `/tasks/:taskId/attachments` | List attachments | Yes | GUEST | Offset |
| POST | `/tasks/:taskId/attachments` | Upload attachment | Yes | GUEST | - |
| GET | `/attachments/:attachmentId` | Download attachment | Yes | GUEST | - |
| DELETE | `/attachments/:attachmentId` | Delete attachment | Yes | Upload owner | - |

### 8.2 Upload Encoding

Request uses `multipart/form-data` for file uploads.

**Max file size:** 10MB

**Allowed types:** Images, PDFs, Documents, Archives

---

### 8.3 List Attachments

**GET** `/api/v1/tasks/:taskId/attachments`

**Description:** List all attachments on a task.

**Auth:** Yes

**RBAC:** GUEST

**Pagination:** Offset-based

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "fileName": "design-mockup.png",
      "fileUrl": "https://storage.example.com/attachments/...",
      "fileSize": 102400,
      "mimeType": "image/png",
      "uploadedBy": {
        "id": 2,
        "name": "Jane Smith"
      },
      "createdAt": "2024-01-15T15:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

---

### 8.4 Upload Attachment

**POST** `/api/v1/tasks/:taskId/attachments`

**Description:** Upload a file attachment to a task.

**Auth:** Yes

**RBAC:** GUEST

**Request:** `multipart/form-data`
```
file: <binary file data>
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "fileName": "screenshot.png",
    "fileUrl": "https://storage.example.com/attachments/...",
    "fileSize": 204800,
    "mimeType": "image/png",
    "uploadedBy": {
      "id": 1,
      "name": "John Doe"
    },
    "createdAt": "2024-01-16T10:00:00.000Z"
  }
}
```

**Errors:**
- `FILE_TOO_LARGE` (413)
- `INVALID_FILE_TYPE` (400)

---

### 8.5 Download Attachment

**GET** `/api/v1/attachments/:attachmentId`

**Description:** Get attachment details or redirect to download URL.

**Auth:** Yes

**RBAC:** GUEST

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `download` | boolean | false | If true, returns download URL |

**Response (200 OK) - without download param:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "fileName": "design-mockup.png",
    "fileUrl": "https://storage.example.com/attachments/...",
    "fileSize": 102400,
    "mimeType": "image/png",
    "createdAt": "2024-01-15T15:00:00.000Z"
  }
}
```

**Response (302 Redirect) - with download=true:**
Redirects to signed download URL with file.

---

### 8.6 Delete Attachment

**DELETE** `/api/v1/attachments/:attachmentId`

**Description:** Delete an attachment (uploader or task assignee/project owner).

**Auth:** Yes

**RBAC:** Upload owner, task assignee, or project owner

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Attachment deleted successfully"
  }
}
```

---

## 9. Notification Module

### 9.1 Endpoints Overview

| Method | Endpoint | Description | Auth | Pagination |
|--------|----------|-------------|------|------------|
| GET | `/notifications` | List user notifications | Yes | Cursor |
| PATCH | `/notifications/:notificationId` | Mark as read | Yes | - |
| PATCH | `/notifications` | Mark all as read | Yes | - |
| DELETE | `/notifications/:notificationId` | Delete notification | Yes | - |
| DELETE | `/notifications` | Clear all notifications | Yes | - |

### 9.2 Notification Types

| Type | Description |
|------|-------------|
| `TASK_ASSIGNED` | Task assigned to user |
| `TASK_UNASSIGNED` | Task unassigned from user |
| `TASK_STATUS_CHANGED` | Task status changed |
| `TASK_COMMENTED` | New comment on user's task |
| `TASK_MENTIONED` | User mentioned in comment |
| `PROJECT_INVITE` | Invited to project |
| `WORKSPACE_INVITE` | Invited to workspace |

---

### 9.3 List Notifications

**GET** `/api/v1/notifications`

**Description:** List all notifications for current user.

**Auth:** Yes

**Pagination:** Cursor-based

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cursor` | string | - | Pagination cursor |
| `limit` | integer | 20 | Items per page |
| `isRead` | boolean | - | Filter by read status |
| `type` | string | - | Filter by notification type |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "type": "TASK_ASSIGNED",
      "title": "Task assigned to you",
      "message": "You have been assigned to 'Implement auth'",
      "isRead": false,
      "task": {
        "id": 1,
        "title": "Implement auth",
        "key": "API-1"
      },
      "createdAt": "2024-01-16T10:00:00.000Z"
    }
  ],
  "meta": {
    "cursor": "eyJpZCI6MTAsImNyZWF0ZWRBdCI6IjIwMjQtMDEtMTZUMTA6MDA6MDAuMDAwWiJ9",
    "limit": 20,
    "hasMore": true,
    "unreadCount": 5
  }
}
```

---

### 9.4 Mark Notification as Read

**PATCH** `/api/v1/notifications/:notificationId`

**Description:** Mark a single notification as read.

**Auth:** Yes

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "isRead": true,
    "updatedAt": "2024-01-16T11:00:00.000Z"
  }
}
```

---

### 9.5 Mark All as Read

**PATCH** `/api/v1/notifications`

**Description:** Mark all notifications as read.

**Auth:** Yes

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | - | Only mark notifications of this type |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "updatedCount": 5
  }
}
```

---

### 9.6 Delete Notification

**DELETE** `/api/v1/notifications/:notificationId`

**Description:** Soft delete a notification.

**Auth:** Yes

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Notification deleted"
  }
}
```

---

### 9.7 Clear All Notifications

**DELETE** `/api/v1/notifications`

**Description:** Soft delete all notifications for current user.

**Auth:** Yes

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | - | Only delete notifications of this type |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "deletedCount": 15
  }
}
```

---

## 10. Report Module

### 10.1 Endpoints Overview

| Method | Endpoint | Description | Auth | RBAC |
|--------|----------|-------------|------|------|
| GET | `/workspaces/:workspaceId/reports/stats` | Workspace statistics | Yes | MEMBER |
| GET | `/projects/:projectId/reports/progress` | Project progress | Yes | GUEST |
| GET | `/projects/:projectId/reports/burndown` | Burndown chart data | Yes | MEMBER |
| GET | `/users/me/reports/workload` | User workload | Yes | - |

---

### 10.2 Workspace Statistics

**GET** `/api/v1/workspaces/:workspaceId/reports/stats`

**Description:** Get workspace-level statistics.

**Auth:** Yes

**RBAC:** MEMBER

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `startDate` | string | 30 days ago | Start of date range |
| `endDate` | string | today | End of date range |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalProjects": 5,
      "totalTasks": 120,
      "completedTasks": 80,
      "activeMembers": 12
    },
    "taskByStatus": {
      "TODO": 20,
      "IN_PROGRESS": 15,
      "REVIEW": 5,
      "DONE": 80
    },
    "taskByPriority": {
      "LOWEST": 10,
      "LOW": 25,
      "MEDIUM": 50,
      "HIGH": 30,
      "HIGHEST": 5
    },
    "tasksCreatedTrend": [
      { "date": "2024-01-01", "count": 5 },
      { "date": "2024-01-02", "count": 8 }
    ],
    "tasksCompletedTrend": [
      { "date": "2024-01-01", "count": 3 },
      { "date": "2024-01-02", "count": 6 }
    ],
    "topContributors": [
      { "userId": 1, "name": "John", "completedTasks": 25 },
      { "userId": 2, "name": "Jane", "completedTasks": 20 }
    ]
  }
}
```

---

### 10.3 Project Progress

**GET** `/api/v1/projects/:projectId/reports/progress`

**Description:** Get detailed project progress report.

**Auth:** Yes

**RBAC:** GUEST

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": 1,
      "name": "Backend API",
      "key": "API"
    },
    "overall": {
      "totalTasks": 50,
      "completedTasks": 35,
      "completionPercentage": 70,
      "totalEstimatedHours": 200,
      "totalLoggedHours": 150,
      "progressPercentage": 75
    },
    "byStatus": [
      { "status": "TODO", "count": 5, "percentage": 10 },
      { "status": "IN_PROGRESS", "count": 10, "percentage": 20 },
      { "status": "REVIEW", "count": 0, "percentage": 0 },
      { "status": "DONE", "count": 35, "percentage": 70 }
    ],
    "byPriority": [
      { "priority": "HIGHEST", "count": 5, "completed": 3 },
      { "priority": "HIGH", "count": 15, "completed": 10 }
    ],
    "velocity": {
      "thisWeek": 10,
      "lastWeek": 8,
      "changePercentage": 25
    },
    "overdueTasks": [
      {
        "id": 15,
        "title": "Overdue task",
        "dueDate": "2024-01-10T00:00:00.000Z",
        "status": "IN_PROGRESS"
      }
    ]
  }
}
```

---

### 10.4 Burndown Chart Data

**GET** `/api/v1/projects/:projectId/reports/burndown`

**Description:** Get burndown chart data for project.

**Auth:** Yes

**RBAC:** MEMBER

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `startDate` | string | project creation date | Start of sprint |
| `endDate` | string | today or project due date | End of sprint |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sprint": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-14",
      "totalScope": 50
    },
    "idealBurndown": [
      { "date": "2024-01-01", "remaining": 50 },
      { "date": "2024-01-02", "remaining": 46.4 },
      { "date": "2024-01-03", "remaining": 42.8 }
    ],
    "actualBurndown": [
      { "date": "2024-01-01", "remaining": 50, "completed": 0 },
      { "date": "2024-01-02", "remaining": 48, "completed": 2 },
      { "date": "2024-01-03", "remaining": 44, "completed": 6 }
    ],
    "dailyCompleted": [
      { "date": "2024-01-02", "count": 2 },
      { "date": "2024-01-03", "count": 4 }
    ]
  }
}
```

---

### 10.5 User Workload Report

**GET** `/api/v1/users/me/reports/workload`

**Description:** Get current user's workload across workspaces.

**Auth:** Yes

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "assignedTasks": 15,
      "pendingReview": 2,
      "completedThisWeek": 5,
      "overdueTasks": 1
    },
    "byWorkspace": [
      {
        "workspaceId": 1,
        "workspaceName": "Acme Corp",
        "assignedTasks": 10,
        "tasksByStatus": {
          "TODO": 3,
          "IN_PROGRESS": 5,
          "REVIEW": 1,
          "DONE": 1
        }
      }
    ],
    "byProject": [
      {
        "projectId": 1,
        "projectName": "Backend API",
        "key": "API",
        "assignedTasks": 8,
        "totalLoggedHours": 40,
        "upcomingDeadlines": [
          {
            "taskId": 5,
            "title": "Implement auth",
            "dueDate": "2024-01-20T00:00:00.000Z",
            "daysRemaining": 4
          }
        ]
      }
    ],
    "weeklyCapacity": {
      "availableHours": 40,
      "loggedHours": 32,
      "utilizationPercentage": 80
    }
  }
}
```

---

## 11. Error Codes Reference

### 11.1 HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 204 | No Content - Success with no response body |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Not authenticated |
| 403 | Forbidden - Not authorized |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 413 | Payload Too Large - File too big |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

### 11.2 Application Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `REFRESH_TOKEN_EXPIRED` | 401 | Refresh token expired |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh token tampered |
| `ACCESS_DENIED` | 403 | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | 404 | Resource not found |
| `WORKSPACE_NOT_FOUND` | 404 | Workspace doesn't exist |
| `PROJECT_NOT_FOUND` | 404 | Project doesn't exist |
| `TASK_NOT_FOUND` | 404 | Task doesn't exist |
| `USER_NOT_FOUND` | 404 | User doesn't exist |
| `EMAIL_ALREADY_EXISTS` | 409 | Email already registered |
| `PROJECT_KEY_EXISTS` | 409 | Project key already exists |
| `ALREADY_MEMBER` | 409 | User already in workspace |
| `FILE_TOO_LARGE` | 413 | Attachment exceeds limit |
| `INVALID_FILE_TYPE` | 400 | File type not allowed |
| `CANNOT_DELETE_OWNER` | 400 | Cannot delete workspace owner |
| `CANNOT_CHANGE_OWNER_ROLE` | 400 | Cannot change owner role |
| `OWNER_CANNOT_LEAVE` | 400 | Owner must transfer or delete |
| `MAX_SUBTASK_DEPTH` | 400 | Subtask nesting limit reached |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

---

## 12. Example Requests/Responses

### 12.1 Login and Create Task Flow

**1. Login**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "SecurePass123!"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "john@example.com",
      "name": "John Doe"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**2. Create Task**
```bash
curl -X POST http://localhost:3000/api/v1/projects/1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication",
    "priority": "HIGH",
    "dueDate": "2024-02-15T00:00:00.000Z",
    "estimatedHours": 8
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Implement user authentication",
    "type": "TASK",
    "status": "TODO",
    "priority": "HIGH",
    "dueDate": "2024-02-15T00:00:00.000Z",
    "estimatedHours": 8,
    "loggedHours": 0,
    "projectId": 1,
    "createdAt": "2024-01-15T12:00:00.000Z"
  }
}
```

**3. Create Subtask**
```bash
curl -X POST http://localhost:3000/api/v1/tasks/1/subtasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "title": "Design database schema",
    "description": "Create tables for auth",
    "priority": "MEDIUM"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "title": "Design database schema",
    "type": "SUB_TASK",
    "status": "TODO",
    "priority": "MEDIUM",
    "parentId": 1,
    "projectId": 1
  }
}
```

**4. Add Comment**
```bash
curl -X POST http://localhost:3000/api/v1/tasks/1/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{"content": "Starting implementation today"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "content": "Starting implementation today",
    "user": {
      "id": 1,
      "name": "John Doe"
    },
    "isEdited": false,
    "createdAt": "2024-01-15T14:00:00.000Z"
  }
}
```

**5. Get Task Detail**
```bash
curl -X GET "http://localhost:3000/api/v1/tasks/1?includeSubTasks=true&includeComments=true" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Implement user authentication",
    "type": "TASK",
    "status": "TODO",
    "priority": "HIGH",
    "subTasks": [
      {
        "id": 2,
        "title": "Design database schema",
        "status": "TODO",
        "priority": "MEDIUM"
      }
    ],
    "comments": [
      {
        "id": 1,
        "content": "Starting implementation today",
        "user": {"id": 1, "name": "John Doe"}
      }
    ]
  }
}
```

---

### 12.2 Filtering and Pagination Example

**List tasks with complex filters:**
```bash
curl -X GET "http://localhost:3000/api/v1/projects/1/tasks?filter[status][eq]=TODO&filter[priority][gte]=MEDIUM&filter[assigneeId][in]=1,2&sort=priority:desc&sort=createdAt:asc&limit=10" \
  -H "Authorization: Bearer ..."
```

**Paginate with cursor:**
```bash
curl -X GET "http://localhost:3000/api/v1/projects/1/tasks?cursor=eyJpZCI6MTAsImNyZWF0ZWRBdCI6IjIwMjQtMDEtMTRUMTI6MDA6MDAuMDAwWiJ9&limit=10" \
  -H "Authorization: Bearer ..."
```

---

### 12.3 Error Response Example

**Validation Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ]
  }
}
```

**Access Denied:**
```json
{
  "success": false,
  "error": {
    "code": "ACCESS_DENIED",
    "message": "You do not have permission to perform this action"
  }
}
```

**Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task with ID 999 not found"
  }
}
```

---

## Appendix A: Data Transfer Objects (DTOs)

### A.1 Common DTOs

```typescript
// Pagination DTO
interface PaginationDto {
  page?: number;
  limit?: number;
  cursor?: string;
}

// Sort DTO
interface SortDto {
  sort?: string; // "field:asc,field:desc"
}

// Filter DTO
interface FilterDto {
  filter?: Record<string, Record<string, unknown>>;
}

// Cursor Pagination Response
interface CursorMeta {
  cursor?: string;
  limit: number;
  hasMore: boolean;
}

// Offset Pagination Response
interface OffsetMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

---

## Appendix B: Webhook Events

For future implementation, consider these webhook events:

| Event | Trigger |
|-------|---------|
| `task.created` | New task created |
| `task.updated` | Task updated |
| `task.deleted` | Task deleted |
| `task.status_changed` | Task status changed |
| `comment.created` | New comment |
| `member.invited` | Member invited |
| `member.removed` | Member removed |

---

*Document Version: 1.0*  
*Last Updated: 2024-01-15*
