# Phân tích chi tiết chức năng, luồng code và OOP

Tài liệu này dùng để giải thích dự án khi bảo vệ: một chức năng bắt đầu từ màn hình FE nào, đi qua hook/API client nào, gọi endpoint nào, backend xử lý qua route/middleware/controller/service/repository ra sao, rồi đọc/ghi model DB nào.

> Lưu ý: số dòng trong tài liệu được lấy theo source code hiện tại. Nếu sau này source thay đổi thì line number có thể lệch, nhưng đường dẫn file và luồng liên kết vẫn là điểm chính để lần theo.

## 1. Cách đọc tài liệu

Mỗi module bên dưới được trình bày theo cùng một kiểu:

- **FE entry**: màn hình, component, hook hoặc API client nơi người dùng thao tác.
- **Endpoint**: route Express thực tế đang chạy.
- **BE OOP flow**: `Controller -> Service -> Repository -> Prisma`.
- **DB model**: bảng/model Prisma được đọc hoặc ghi.
- **Cách giải thích khi thầy hỏi**: câu trả lời ngắn gọn để trình bày được logic.

Ví dụ cách lần code cho chức năng đăng nhập:

```text
Login page
-> frontend/src/pages/Login.tsx:20,86
-> frontend/src/hooks/useAuth.ts:107,110
-> frontend/src/lib/api-client.ts:219,231
-> backend/src/modules/auth/auth.routes.ts:38
-> backend/src/modules/auth/auth.controller.ts:95
-> backend/src/modules/auth/auth.service.ts:89
-> backend/src/modules/auth/auth.repository.ts:10,80
-> backend/prisma/schema.prisma:72,132
```

Quy ước đường dẫn rút gọn:

- `auth.routes.ts`, `auth.controller.ts`, `auth.service.ts`, `auth.repository.ts` nằm trong `backend/src/modules/auth/`.
- `workspace.*`, `project.*`, `task.*` nằm trong các thư mục module tương ứng ở `backend/src/modules/`.
- `comment.*`, `attachment.*`, `notification.*`, `admin.*`, `report.*`, `my-tasks.*`, `project-member.*` cũng nằm trong module backend cùng tên.
- File FE như `Login.tsx` thường nằm trong `frontend/src/pages/`; component như `TaskDetailPanel.tsx` nằm trong `frontend/src/components/...`.

## 2. Kiến trúc tổng quan: không phải MVC thuần

Dự án hiện tại **không phải MVC thuần**. Tên gọi chính xác hơn là:

```text
Frontend: Component-based React architecture
Backend: Modular Monolith + Layered Architecture
Database: MySQL 8 + Prisma ORM
```

Lý do không gọi là MVC thuần:

- Backend không render View server-side.
- React FE đóng vai trò View/UI riêng.
- Backend chỉ cung cấp REST API và realtime event.
- Phần "Model" trong MVC được tách thành `Service`, `Repository` và Prisma model.

Luồng tổng quát:

```text
Người dùng thao tác UI
-> React page/component
-> custom hook TanStack Query
-> API client Axios
-> Express /api/v1 route
-> auth/RBAC/validation middleware
-> Controller
-> Service
-> Repository
-> Prisma Client
-> MySQL
-> Service ghi activity/gửi notification/emit realtime nếu cần
-> Controller trả ApiResponse
-> FE invalidate/refetch cache và render lại
```

Các điểm khởi tạo quan trọng:

| Thành phần | Source |
| --- | --- |
| Express app | `backend/src/index.ts:16` |
| JSON parser, URL encoded parser | `backend/src/index.ts:49`, `backend/src/index.ts:50` |
| Static upload folder | `backend/src/index.ts:53` |
| Mount API `/api/v1` | `backend/src/index.ts:72`, `backend/src/index.ts:73` |
| Mount toàn bộ module route | `backend/src/routes/index.ts:18` đến `backend/src/routes/index.ts:52` |
| Tạo HTTP server và Socket.IO | `backend/src/index.ts:83`, `backend/src/index.ts:84` |
| FE kết nối realtime | `frontend/src/lib/realtime.ts:56`, `frontend/src/components/RealtimeProvider.tsx:98` |
| FE nhận `realtime:event` và invalidate cache | `frontend/src/components/RealtimeProvider.tsx:102`, `frontend/src/components/RealtimeProvider.tsx:111` |

## 3. OOP trong backend

### 3.1. Các lớp nền

| Lớp | Vai trò | Source |
| --- | --- | --- |
| `BaseController` | Cung cấp `asyncHandler`, `handleError` để controller xử lý lỗi thống nhất | `backend/src/common/base/BaseController.ts:10`, `backend/src/common/base/BaseController.ts:31` |
| `BaseService` | Định nghĩa contract CRUD cơ bản cho service con | `backend/src/common/base/BaseService.ts:5`, `backend/src/common/base/BaseService.ts:12` |
| `BaseRepository` | Bọc Prisma delegate, có CRUD, soft delete và pagination helper | `backend/src/common/base/BaseRepository.ts:80`, `backend/src/common/base/BaseRepository.ts:132`, `backend/src/common/base/BaseRepository.ts:157`, `backend/src/common/base/BaseRepository.ts:176` |
| Interface/DTO | Định nghĩa input/output, tránh truyền object tuỳ tiện | `backend/src/types/interfaces.ts:74`, `backend/src/types/interfaces.ts:83`, `backend/src/modules/admin/admin.interface.ts:187`, `backend/src/modules/auth/dto/login.dto.ts:3` |

### 3.2. Các ví dụ OOP thật trong dự án

| Module | Controller | Service | Repository |
| --- | --- | --- | --- |
| Auth | `AuthController` tại `backend/src/modules/auth/auth.controller.ts:15` | `AuthService` tại `backend/src/modules/auth/auth.service.ts:63` | `AuthRepository` tại `backend/src/modules/auth/auth.repository.ts:5` |
| Workspace | `WorkspaceController` tại `backend/src/modules/workspace/workspace.controller.ts:9` | `WorkspaceService` tại `backend/src/modules/workspace/workspace.service.ts:68` | `WorkspaceRepository` tại `backend/src/modules/workspace/workspace.repository.ts:32` |
| Project | `ProjectController` tại `backend/src/modules/project/project.controller.ts:10` | `ProjectService` tại `backend/src/modules/project/project.service.ts:34` | `ProjectRepository` tại `backend/src/modules/project/project.repository.ts:57` |
| Task | `TaskController` tại `backend/src/modules/task/task.controller.ts:14` | `TaskService` tại `backend/src/modules/task/task.service.ts:66` | `TaskRepository` tại `backend/src/modules/task/task.repository.ts:60` |
| Admin/Owner | `AdminController` tại `backend/src/modules/admin/admin.controller.ts:9` | `AdminService implements IAdminService` tại `backend/src/modules/admin/admin.service.ts:25` | `AdminRepository implements IAdminRepository` tại `backend/src/modules/admin/admin.repository.ts:22` |

### 3.3. Dependency Injection thủ công

Dự án không dùng DI container như NestJS. Mỗi module export singleton:

- `authController` tại `backend/src/modules/auth/auth.controller.ts:313`.
- `authService` tại `backend/src/modules/auth/auth.service.ts:644`.
- `authRepository` tại `backend/src/modules/auth/auth.repository.ts:157`.
- `workspaceController` tại `backend/src/modules/workspace/workspace.controller.ts:261`.
- `workspaceService` tại `backend/src/modules/workspace/workspace.service.ts:888`.
- `workspaceRepository` tại `backend/src/modules/workspace/workspace.repository.ts:685`.

Cách hoạt động là: route import controller singleton, controller import service singleton, service import repository singleton. Đây là Dependency Injection thủ công thông qua cơ chế module import/export của TypeScript.

### 3.4. Nguyên lý OOP đang thể hiện

- **Encapsulation**: logic nghiệp vụ nằm trong class service, ví dụ `AuthService.login` tại `backend/src/modules/auth/auth.service.ts:89`, `TaskService.create` tại `backend/src/modules/task/task.service.ts:67`.
- **Separation of Concerns**: controller chỉ đọc `req`, gọi service và trả `res`; repository mới chạm Prisma.
- **Repository Pattern**: query DB tập trung trong repository, ví dụ `TaskRepository.findAllInProject` tại `backend/src/modules/task/task.repository.ts:194`, `NotificationRepository.findGroupedByUserId` tại `backend/src/modules/notification/notification.repository.ts:148`.
- **Service Layer**: service gom luật nghiệp vụ, kiểm tra phụ, log activity, notification và realtime. Ví dụ update status task nằm tại `backend/src/modules/task/task.service.ts:301` đến `backend/src/modules/task/task.service.ts:327`.
- **Interface/DTO**: admin có `IAdminRepository`, `IAdminService` tại `backend/src/modules/admin/admin.interface.ts:187`, `backend/src/modules/admin/admin.interface.ts:206`; auth có DTO validate email/password trong `backend/src/modules/auth/dto/*.ts`.

**Cách giải thích khi thầy hỏi:** Backend của em không phải MVC thuần. Controller chỉ là HTTP adapter, Service chứa business logic, Repository chứa query DB, còn Prisma model là mapping DB. FE React là View riêng. Vì vậy kiến trúc chính xác là Modular Monolith kết hợp Layered Architecture.

## 4. FE common flow

### 4.1. Routing React

| Chức năng | Source |
| --- | --- |
| Public auth routes `/login`, `/register`, `/google/callback` | `frontend/src/App.tsx:150` đến `frontend/src/App.tsx:154` |
| Protected onboarding | `frontend/src/App.tsx:157` đến `frontend/src/App.tsx:160` |
| Workspace/project/task pages | `frontend/src/App.tsx:163` đến `frontend/src/App.tsx:188` |
| Notification và invitations | `frontend/src/App.tsx:191`, `frontend/src/App.tsx:192` |
| Owner/admin console | `frontend/src/App.tsx:197` đến `frontend/src/App.tsx:205` |
| Protected route | `frontend/src/components/ProtectedRoute.tsx:9`, `frontend/src/components/ProtectedRoute.tsx:29` |
| Owner protected route | `frontend/src/components/AdminProtectedRoute.tsx:6` |

### 4.2. Axios API client và refresh token

| Logic | Source |
| --- | --- |
| Base URL mặc định `http://localhost:5000/api/v1` | `frontend/src/lib/api-client.ts:17` |
| Tạo Axios client | `frontend/src/lib/api-client.ts:211` |
| Gắn `Authorization: Bearer token` vào request | `frontend/src/lib/api-client.ts:57`, `frontend/src/lib/api-client.ts:219` |
| Nếu access token hết hạn, gọi `/auth/refresh` | `frontend/src/lib/api-client.ts:184`, `frontend/src/lib/api-client.ts:187` |
| Cập nhật token mới vào Zustand store | `frontend/src/lib/api-client.ts:196`, `frontend/src/lib/api-client.ts:198` |
| Response interceptor retry request cũ | `frontend/src/lib/api-client.ts:231`, `frontend/src/lib/api-client.ts:245`, `frontend/src/lib/api-client.ts:248` |
| Zustand store lưu user/access/refresh token | `frontend/src/stores/authStore.ts:67`, `frontend/src/stores/authStore.ts:75`, `frontend/src/stores/authStore.ts:117`, `frontend/src/stores/authStore.ts:130` |

**Cách giải thích:** FE không gọi `fetch` trực tiếp ở mọi nơi. Các hook gọi `apiClient`; `apiClient` tự gắn JWT, tự refresh access token khi gặp lỗi phiên đăng nhập, sau đó retry request cũ.

## 5. BE route map thực tế

Tất cả route được mount trong `backend/src/routes/index.ts`.

| Prefix | Module route | Source |
| --- | --- | --- |
| `/api/v1/auth` | Auth | `backend/src/routes/index.ts:18` |
| `/api/v1/workspaces` | Workspace | `backend/src/routes/index.ts:21` |
| `/api/v1/workspaces/:workspaceId/projects` | Project | `backend/src/routes/index.ts:24`, `backend/src/modules/project/project.routes.ts:18` |
| `/api/v1/projects/:projectId/tasks` và `/api/v1/tasks/:id` | Task | `backend/src/routes/index.ts:27`, `backend/src/modules/task/task.routes.ts:11` |
| `/api/v1/tasks/:taskId/comments` | Comment | `backend/src/routes/index.ts:30`, `backend/src/modules/comment/comment.routes.ts:14` |
| `/api/v1/tasks/:taskId/attachments` | Attachment | `backend/src/routes/index.ts:33`, `backend/src/modules/attachment/attachment.routes.ts:39` |
| `/api/v1/notifications` | Notification | `backend/src/routes/index.ts:36` |
| `/api/v1/notification-preferences` | Notification preference | `backend/src/routes/index.ts:39` |
| `/api/v1/reports` | Reports | `backend/src/routes/index.ts:42` |
| `/api/v1/projects/:projectId/members` | Project member | `backend/src/routes/index.ts:45` |
| `/api/v1/workspaces/:workspaceId/my-tasks` | My Tasks | `backend/src/routes/index.ts:48` |
| `/api/v1/admin` và `/api/v1/owner` | Admin/Owner console | `backend/src/routes/index.ts:51`, `backend/src/routes/index.ts:52` |

## 6. DB model map

| Model | Vai trò | Source |
| --- | --- | --- |
| `User` | Tài khoản, Google OAuth, system role, trạng thái khoá | `backend/prisma/schema.prisma:72`, `backend/prisma/schema.prisma:81`, `backend/prisma/schema.prisma:82` |
| `RefreshToken`, `ResetToken`, `OtpCode` | Session rotation, reset password, OTP đăng ký | `backend/prisma/schema.prisma:114`, `backend/prisma/schema.prisma:132`, `backend/prisma/schema.prisma:472` |
| `Workspace`, `WorkspaceMember`, `Invitation` | Workspace, role, lời mời workspace | `backend/prisma/schema.prisma:150`, `backend/prisma/schema.prisma:174`, `backend/prisma/schema.prisma:197` |
| `Project`, `ProjectMember` | Project trong workspace, invitation/member project | `backend/prisma/schema.prisma:225`, `backend/prisma/schema.prisma:255` |
| `Task`, `TaskAssignee` | Task chính/subtask, status, priority, nhiều assignee | `backend/prisma/schema.prisma:281`, `backend/prisma/schema.prisma:326` |
| `Comment`, `Attachment`, `ActivityLog` | Trao đổi, file, lịch sử hành động | `backend/prisma/schema.prisma:344`, `backend/prisma/schema.prisma:367`, `backend/prisma/schema.prisma:393` |
| `Notification`, `NotificationPreference` | Thông báo và cấu hình email | `backend/prisma/schema.prisma:417`, `backend/prisma/schema.prisma:451` |
| `SystemSetting`, `AdminAuditLog` | Cấu hình owner và audit log | `backend/prisma/schema.prisma:492`, `backend/prisma/schema.prisma:508` |

Quan hệ quan trọng:

- `User -> WorkspaceMember -> Workspace`: một user thuộc nhiều workspace với role khác nhau.
- `Workspace -> Project -> Task`: workspace chứa project, project chứa task.
- `ProjectMember`: user phải là thành viên project để thao tác task theo project role.
- `TaskAssignee`: hỗ trợ nhiều assignee, trong khi `Task.assigneeId` vẫn giữ legacy single assignee.
- `ActivityLog`: lưu hành động task/comment/attachment để hiển thị timeline và my tasks activity.
- `Notification.groupKey`: gom nhiều notification liên quan vào một nhóm, ví dụ `task:{taskId}`.

## 7. Auth, OAuth, OTP, profile, avatar, onboarding

### 7.1. Login bằng email/password

| Tầng | Source |
| --- | --- |
| FE page đọc form và điều hướng | `frontend/src/pages/Login.tsx:20`, `frontend/src/pages/Login.tsx:86` |
| Hook login mutation | `frontend/src/hooks/useAuth.ts:107`, `frontend/src/hooks/useAuth.ts:110` |
| Endpoint | `POST /api/v1/auth/login` tại `backend/src/modules/auth/auth.routes.ts:38` |
| Validation | `backend/src/modules/auth/auth.routes.ts:40`, `backend/src/common/middlewares/validation.middleware.ts:76` |
| Controller | `backend/src/modules/auth/auth.controller.ts:95` |
| Service | `backend/src/modules/auth/auth.service.ts:89` |
| Repository | `backend/src/modules/auth/auth.repository.ts:10`, `backend/src/modules/auth/auth.repository.ts:80` |
| DB | `User`, `RefreshToken` tại `backend/prisma/schema.prisma:72`, `backend/prisma/schema.prisma:132` |

Luồng xử lý:

1. Login page lấy email/password và gọi `useAuth().login`.
2. `useAuth` post `/auth/login`, nhận `AuthSuccessPayload`, lưu user/accessToken/refreshToken vào Zustand.
3. Route validate email/password trước khi vào controller.
4. Controller lấy body và gọi `authService.login`.
5. Service tìm user bằng email, so sánh password bằng bcrypt, kiểm tra user có bị block không, kiểm tra user đã có workspace chưa để tính `requireOnboarding`.
6. Service tạo auth session: access token 15 phút, refresh token 7 ngày, lưu refresh token vào DB.
7. FE điều hướng: owner vào `/owner`, user chưa onboarding vào `/onboarding/...`, user bình thường vào workspace.

**Cách giải thích:** Login không query DB ở controller. Controller chỉ nhận request. Service so sánh password và tạo JWT. Repository chỉ phụ trách `findByEmail` và `createRefreshToken`.

### 7.2. Refresh token rotation và logout

| Tầng | Source |
| --- | --- |
| FE interceptor tự refresh | `frontend/src/lib/api-client.ts:184`, `frontend/src/lib/api-client.ts:231` |
| Endpoint refresh | `POST /api/v1/auth/refresh` tại `backend/src/modules/auth/auth.routes.ts:44` |
| Controller refresh | `backend/src/modules/auth/auth.controller.ts:136` |
| Service refresh | `backend/src/modules/auth/auth.service.ts:181` |
| Repository refresh token | `backend/src/modules/auth/auth.repository.ts:76`, `backend/src/modules/auth/auth.repository.ts:80`, `backend/src/modules/auth/auth.repository.ts:68` |
| Logout endpoint | `POST /api/v1/auth/logout` tại `backend/src/modules/auth/auth.routes.ts:89` |
| Service logout | `backend/src/modules/auth/auth.service.ts:175` |

Luồng refresh:

1. Khi request bị lỗi phiên đăng nhập, response interceptor gọi `refreshAccessToken`.
2. FE post refresh token cũ lên `/auth/refresh`.
3. Service verify refresh JWT bằng `REFRESH_TOKEN_SECRET`.
4. Repository tìm refresh token trong DB. Nếu không có hoặc hết hạn, service xoá token cũ và báo lỗi.
5. Nếu hợp lệ, service xoá refresh token cũ, tạo access token và refresh token mới, lưu token mới vào DB.
6. FE cập nhật store và retry request ban đầu.

Luồng logout:

1. FE gọi `/auth/logout`.
2. `authMiddleware` gắn `req.user`.
3. Service gọi `deleteAllRefreshTokens(userId)`.
4. FE clear auth store và query cache.

**Cách giải thích:** Đây là refresh token rotation. Mỗi lần refresh thành công thì token cũ bị xoá và token mới được lưu, giảm rủi ro token bị dùng lại.

### 7.3. Register bằng OTP

| Tầng | Source |
| --- | --- |
| Register page gửi OTP, verify OTP, register | `frontend/src/pages/Register.tsx:24`, `frontend/src/pages/Register.tsx:69`, `frontend/src/pages/Register.tsx:129`, `frontend/src/pages/Register.tsx:158` |
| Hook OTP/register | `frontend/src/hooks/useAuth.ts:163`, `frontend/src/hooks/useAuth.ts:174`, `frontend/src/hooks/useAuth.ts:185` |
| Endpoints | `backend/src/modules/auth/auth.routes.ts:60`, `backend/src/modules/auth/auth.routes.ts:68`, `backend/src/modules/auth/auth.routes.ts:77` |
| Controller | `backend/src/modules/auth/auth.controller.ts:252`, `backend/src/modules/auth/auth.controller.ts:260`, `backend/src/modules/auth/auth.controller.ts:268` |
| Service | `backend/src/modules/auth/auth.service.ts:240`, `backend/src/modules/auth/auth.service.ts:260`, `backend/src/modules/auth/auth.service.ts:280` |
| Repository | `backend/src/modules/auth/auth.repository.ts:104`, `backend/src/modules/auth/auth.repository.ts:114`, `backend/src/modules/auth/auth.repository.ts:134`, `backend/src/modules/auth/auth.repository.ts:141` |
| Email | `backend/src/common/utils/email.service.ts:467` |
| DB | `OtpCode`, `User`, `RefreshToken` |

Luồng xử lý:

1. FE gọi `/auth/send-otp` với email.
2. Service kiểm tra email đã tồn tại chưa, tạo mã 6 số, xoá OTP cũ, lưu OTP mới với `expiresAt`, rồi gửi email.
3. FE nhập OTP và gọi `/auth/verify-otp`.
4. Service tìm OTP hợp lệ, giới hạn số lần thử và đánh dấu verified.
5. FE gọi `/auth/register-with-otp`.
6. Service kiểm tra OTP đã verified, hash password, tạo user, xoá OTP, tạo auth session.

**Cách giải thích:** Register được tách thành 3 API để đảm bảo email được xác thực trước khi tạo user. OTP lưu trong bảng `OtpCode`, sau khi register thành công sẽ bị xoá.

### 7.4. Google OAuth

| Tầng | Source |
| --- | --- |
| FE nút Google | `frontend/src/components/auth/GoogleButton.tsx:10` |
| Login/Register gọi Google | `frontend/src/pages/Login.tsx:144`, `frontend/src/pages/Register.tsx:218` |
| Callback page xử lý token và điều hướng | `frontend/src/pages/GoogleCallback.tsx:22`, `frontend/src/pages/GoogleCallback.tsx:110`, `frontend/src/pages/GoogleCallback.tsx:113` |
| Route Google | `backend/src/modules/auth/auth.routes.ts:27`, `backend/src/modules/auth/auth.routes.ts:28` |
| Controller callback | `backend/src/modules/auth/auth.controller.ts:27` |
| Service Google login | `backend/src/modules/auth/auth.service.ts:121` |
| Repository | `backend/src/modules/auth/auth.repository.ts:14`, `backend/src/modules/auth/auth.repository.ts:18` |

Luồng xử lý:

1. FE chuyển browser sang `/auth/google`.
2. Backend redirect sang Google consent.
3. Google callback về backend; controller lấy profile Google và gọi `AuthService.googleLogin`.
4. Service tìm user theo `googleId` hoặc email; nếu email đã tồn tại nhưng chưa link Google thì link `googleId`.
5. Service tạo session và redirect về FE `/google/callback` kèm token và metadata.
6. FE callback lưu token, nếu `systemRole=OWNER` thì vào `/owner`, nếu cần onboarding thì vào onboarding, còn lại về workspace.

**Cách giải thích:** OAuth không gửi password. Backend nhận profile đã xác thực từ Google, map với user nội bộ, sau đó vẫn tạo JWT/refresh token giống login thường.

### 7.5. Forgot/reset password, profile, avatar, change password, onboarding

| Chức năng | FE | Endpoint/BE | DB/logic |
| --- | --- | --- | --- |
| Forgot password | Hook auth nếu UI gọi | `auth.routes.ts:46`, `auth.controller.ts:161`, `auth.service.ts:219` | Tạo `ResetToken` |
| Reset password | Hook/API auth | `auth.routes.ts:52`, `auth.controller.ts:169`, `auth.service.ts:318` | Hash password mới, xoá refresh token để bắt đăng nhập lại |
| Get current user | `useAuth` query `frontend/src/hooks/useAuth.ts:74`, `frontend/src/hooks/useAuth.ts:78` | `auth.routes.ts:91`, `auth.controller.ts:185`, `auth.service.ts:342` | Đọc `User`, tính onboarding |
| Update profile | `ProfileDialog` tại `frontend/src/components/profile/ProfileDialog.tsx:104` | `auth.routes.ts:93`, `auth.controller.ts:197`, `auth.service.ts:370` | Update `User`, emit realtime user event |
| Avatar | `ProfileDialog` tại `frontend/src/components/profile/ProfileDialog.tsx:136`, onboarding tại `frontend/src/pages/OnboardingProfile.tsx:82` | `auth.routes.ts:109`, `auth.controller.ts:290`, `auth.service.ts:500` | Multer nhận file, Cloudinary upload, xoá avatar cũ nếu cần |
| Change password | `ProfileDialog` tại `frontend/src/components/profile/ProfileDialog.tsx:161` | `auth.routes.ts:116`, `auth.controller.ts:209`, `auth.service.ts:397` | So sánh current password, hash new password |
| Complete onboarding | `frontend/src/pages/OnboardingWorkspace.tsx:61`, `frontend/src/pages/OnboardingWorkspace.tsx:122` | `auth.routes.ts:123`, `auth.controller.ts:229`, `auth.service.ts:425` | Tạo/cập nhật workspace slug, update session/onboarding |

Middleware liên quan:

- Các route cần đăng nhập dùng `authMiddleware` tại `backend/src/common/middlewares/auth.middleware.ts:19`.
- `authMiddleware` verify JWT và gắn `req.user` tại `backend/src/common/middlewares/auth.middleware.ts:39` đến `backend/src/common/middlewares/auth.middleware.ts:45`.

## 8. Workspace, member, invitation, archive/restore, search

### 8.1. Workspace CRUD và detail

| Chức năng | FE | Hook/API | Route | Controller/Service/Repository |
| --- | --- | --- | --- | --- |
| List workspace | `Workspaces.tsx:24`, sidebar `AppSidebar.tsx:29` | `useWorkspacesQuery` `frontend/src/hooks/useWorkspaces.ts:36`, API `workspace-api.ts:43` | `GET /workspaces` `workspace.routes.ts:45` | `WorkspaceController.getAll` `workspace.controller.ts:22`, `WorkspaceService.getAllForUser` `workspace.service.ts:147`, `WorkspaceRepository.findAllForUser` `workspace.repository.ts:68` |
| Create workspace | `CreateWorkspacePage.tsx:42`, `CreateWorkspaceDialog.tsx:62` | `useCreateWorkspaceMutation` `useWorkspaces.ts:101`, API `workspace-api.ts:58` | `POST /workspaces` `workspace.routes.ts:39` | `create` `workspace.controller.ts:14`, `createForUser` `workspace.service.ts:73`, `createWithOwner` `workspace.repository.ts:156` |
| Detail workspace | `WorkspaceDashboard.tsx:119`, `WorkspaceMembersSettings.tsx:20` | `useWorkspaceDetailQuery` `useWorkspaces.ts:43`, API `workspace-api.ts:67` | `GET /workspaces/:workspaceId` `workspace.routes.ts:54` | `getById` `workspace.controller.ts:50`, `getWorkspaceDetail` `workspace.service.ts:104`, `findByIdOrSlug` `workspace.repository.ts:60` |
| Update workspace/logo | `WorkspaceGeneralSettings.tsx:85`, `WorkspaceGeneralSettings.tsx:127` | `useUpdateWorkspaceMutation` `useWorkspaces.ts:69`, API `workspace-api.ts:76` | `PATCH /workspaces/:workspaceId` `workspace.routes.ts:66` | `update` `workspace.controller.ts:59`, `update` `workspace.service.ts:156`, `updateSlug` `workspace.repository.ts:677` |
| Archive workspace | `WorkspaceGeneralSettings.tsx:108` | `useDeleteWorkspaceMutation` `useWorkspaces.ts:180`, API `workspace-api.ts:232` | `DELETE /workspaces/:workspaceId` `workspace.routes.ts:73` | `delete` `workspace.controller.ts:67`, `delete` `workspace.service.ts:283`, soft delete qua repository/base |
| Archived/restore | `ArchivedWorkspacesSection.tsx:24`, `ArchivedWorkspacesSection.tsx:28` | `useArchivedWorkspacesQuery` `useWorkspaces.ts:192`, `useRestoreWorkspaceMutation` `useWorkspaces.ts:206` | `GET /archived` `workspace.routes.ts:47`, `POST /:workspaceId/restore` `workspace.routes.ts:49` | `getArchived` `workspace.controller.ts:33`, `restore` `workspace.controller.ts:41`, service `workspace.service.ts:243`, `workspace.service.ts:256` |

Luồng create workspace:

1. FE form gọi mutation.
2. Hook gọi API client, sau đó invalidate query `workspaces`.
3. Route yêu cầu auth và validate body.
4. Service tạo workspace, sinh slug, repository tạo workspace kèm owner/member.
5. Service emit realtime tới user và owners tại `workspace.service.ts:86`, `workspace.service.ts:93`.
6. FE nhận realtime event và refetch nếu cần.

Luồng archive/restore:

1. Delete workspace là soft delete bằng `deletedAt`, không xoá vật lý ngay.
2. Restore chỉ cho admin/owner hợp lệ, service validate thủ công vì middleware thường bỏ qua workspace đã xoá tại `workspace.service.ts:259`.
3. Repository restore bằng cách đặt `deletedAt=null`.

**Cách giải thích:** Workspace có slug, member role và soft delete. Route xử lý role, service xử lý rule, repository thao tác Prisma. Sau thay đổi lớn sẽ emit realtime để các FE khác cập nhật.

### 8.2. Workspace member và invitation

| Chức năng | FE | Route | Service/Repository |
| --- | --- | --- | --- |
| Xem members | `WorkspaceMembersSettings.tsx:24` | `GET /workspaces/:workspaceId/members` `workspace.routes.ts:79` | `getMembers` `workspace.service.ts:314`, repo `workspace.repository.ts:296` |
| Invite member | `InviteMemberDialog.tsx:62`, `InviteMemberDialog.tsx:64` | `POST /workspaces/:workspaceId/members/invite` `workspace.routes.ts:85` | `inviteMember` `workspace.service.ts:324`, repo `findPendingInvitationByEmail` `workspace.repository.ts:506`, `createInvitation` `workspace.repository.ts:523` |
| My invitations | `NotificationBell.tsx:66`, `WorkspaceInvitation.tsx` | `GET /workspaces/invitations/me` `workspace.routes.ts:24` | `getMyInvitations` `workspace.service.ts:520` |
| Public token detail | `WorkspaceInvitationAction.tsx:21` | `GET /workspaces/invitations/:token` `workspace.routes.ts:12` | `getInvitationByToken` `workspace.service.ts:510` |
| Accept invitation | `WorkspaceInvitationAction.tsx:76` | `POST /workspaces/invitations/:token/accept` `workspace.routes.ts:29` | `acceptInvitation` `workspace.service.ts:532` |
| Decline invitation | `WorkspaceInvitationAction.tsx:81` | `POST /workspaces/invitations/:token/decline` `workspace.routes.ts:34` hoặc public `workspace.routes.ts:17` | `declineInvitation` `workspace.service.ts:582`, `declineInvitationByToken` `workspace.service.ts:620` |
| Cancel invitation | `InvitationList.tsx:54`, `MemberTable.tsx:97` | `DELETE /workspaces/:workspaceId/invitations/:invitationId` `workspace.routes.ts:117` | `cancelInvitation` `workspace.service.ts:639` |
| Update member role | `UpdateRoleDialog.tsx:47` | `PATCH /workspaces/:workspaceId/members/:memberId/role` `workspace.routes.ts:98` | `updateMemberRole` `workspace.service.ts:400`, repo `updateMemberRole` `workspace.repository.ts:279` |
| Remove/leave member | `MemberList.tsx:48`, `MemberTable.tsx:85` | `DELETE /members/:memberId` `workspace.routes.ts:105`, `DELETE /leave` `workspace.routes.ts:92` | `removeMember` `workspace.service.ts:434`, `leave` `workspace.service.ts:479` |

Permission:

- Workspace route dùng `authMiddleware` tại `workspace.routes.ts:22`.
- RBAC workspace dùng `requireGuest`, `requireOwner` tại `workspace.routes.ts:54`, `workspace.routes.ts:66`, `workspace.routes.ts:85`.
- Middleware resolve slug/id và attach membership tại `backend/src/common/middlewares/rbac.middleware.ts:31`, `rbac.middleware.ts:49`, `rbac.middleware.ts:66`.

Luồng invite:

1. FE dialog lấy email và role.
2. Route yêu cầu `requireOwner`, nên chỉ OWNER/ADMIN workspace mới invite.
3. Service tìm workspace, tìm user theo email nếu có, chặn invite trùng.
4. Repository tạo `Invitation` với token và status `PENDING`.
5. Service gửi email qua `sendWorkspaceInvitationEmail` tại `workspace.service.ts:856`.
6. Service gọi `notificationEmitter.onInvitationReceived` tại `workspace.service.ts:874` và emit realtime workspace/user.
7. Khi accept, service đổi status invitation, tạo `WorkspaceMember`, emit realtime.

Luồng remove/leave:

1. Service không cho remove/leave nếu member còn active task trong workspace, kiểm tra tại `workspace.service.ts:727`.
2. Remove thành công sẽ soft delete membership, emit realtime tới workspace và user bị remove, đồng thời có notification removed.

**Cách giải thích:** Invitation workspace là entity riêng có token. Accept invitation không chỉ đổi status mà còn tạo membership. Permission thật nằm ở backend qua `requireOwner` và service validation.

### 8.3. Search task trong workspace

| Tầng | Source |
| --- | --- |
| Header search | `frontend/src/components/header/HeaderSearch.tsx:7`, `frontend/src/components/header/HeaderSearch.tsx:22`, `frontend/src/components/header/HeaderSearch.tsx:38` |
| Hook/API | `frontend/src/hooks/useWorkspaces.ts:198`, `frontend/src/lib/workspace-api.ts:276` |
| Route | `GET /workspaces/:workspaceId/tasks/search` tại `backend/src/modules/workspace/workspace.routes.ts:60` |
| Service/Repo | `workspace.service.ts:229`, `task.repository.ts:439` |

Logic: FE debounce query, gọi endpoint search trong workspace. BE validate user có membership workspace, repository search task theo title/description/code trong các project thuộc workspace, FE click kết quả thì navigate đến project overview kèm `task` query param.

## 9. Project và project member

### 9.1. Project CRUD, archive, restore

| Chức năng | FE | Hook/API | Route | BE |
| --- | --- | --- | --- | --- |
| List project | `WorkspaceProjects.tsx:14`, sidebar `ProjectNavigator.tsx:291` | `useProjectsQuery` `frontend/src/hooks/useProjects.ts:11`, API `projects-api.ts:19` | `GET /workspaces/:workspaceId/projects` `project.routes.ts:18` | `ProjectController.getAll` `project.controller.ts:29`, `ProjectService.getAllInWorkspace` `project.service.ts:126` |
| Create project | `CreateProjectPage.tsx:22`, `CreateProjectPage.tsx:36` | `useCreateProjectMutation` `useProjects.ts:18`, API `projects-api.ts:53` | `POST /workspaces/:workspaceId/projects` `project.routes.ts:39` | `ProjectController.create` `project.controller.ts:15`, `ProjectService.create` `project.service.ts:39`, `ProjectRepository.findByWorkspaceAndKey` `project.repository.ts:144` |
| Detail/overview | `ProjectOverview.tsx:31` | `useProjectDetailQuery` `useProject.ts:13`, API `project-api.ts:135` | `GET /workspaces/:workspaceId/projects/:projectId` `project.routes.ts:32` | `getById` `project.controller.ts:46`, service `project.service.ts:92`, repo `project.repository.ts:234` |
| Update | `ProjectSettingsPage.tsx:77`, `ProjectSettingsPage.tsx:84` | `useUpdateProjectMutation` `useProject.ts:26`, API `project-api.ts:149` | `PATCH /.../:projectId` `project.routes.ts:54` | `ProjectController.update` `project.controller.ts:60`, `ProjectService.updateInWorkspace` `project.service.ts:139` |
| Archive | `ProjectOverview.tsx:81`, `ProjectSettingsPage.tsx:95` | `useDeleteProjectMutation` `useProject.ts:45` | `DELETE /.../:projectId` `project.routes.ts:63` | `ProjectService.deleteInWorkspace` `project.service.ts:179`, `ProjectRepository.countActiveTasksInProject` `project.repository.ts:72` |
| Archived/restore | `ArchivedProjectsSection.tsx:28`, `ArchivedProjectsSection.tsx:32` | `useArchivedProjectsQuery` `useProject.ts:63`, `useRestoreProjectMutation` `useProject.ts:70` | `project.routes.ts:25`, `project.routes.ts:47` | `ProjectService.getArchivedProjects` `project.service.ts:256`, `ProjectService.restoreProject` `project.service.ts:212` |

Permission:

- Project route yêu cầu auth tại `project.routes.ts:15`.
- Workspace RBAC: list/detail cần `requireGuest`, create/restore archived cần `requireMember`, update/delete cần `requireProjectAdmin`.
- Project RBAC middleware kiểm tra membership project tại `backend/src/common/middlewares/project-rbac.middleware.ts:25`, `project-rbac.middleware.ts:60`, `project-rbac.middleware.ts:80`.

Luồng create project:

1. FE form có name/key/description, gọi mutation.
2. Route validate `createProject`.
3. Service kiểm tra `key` unique trong workspace.
4. Repository tạo project.
5. Service auto-add creator vào `ProjectMember` với role `ADMIN`, status `ACCEPTED` tại `project.service.ts:60`.
6. Service emit realtime workspace và owner tại `project.service.ts:69`, `project.service.ts:76`.

Luồng archive:

1. Delete project không xoá thật ngay mà set `deletedAt`.
2. Trước khi archive, repository đếm active task để chặn xoá khi còn task chưa hoàn tất nếu rule yêu cầu.
3. Restore chỉ cho workspace admin hoặc project admin, service validate tại `project.service.ts:212` đến `project.service.ts:227`.

**Cách giải thích:** Project nằm trong workspace, nhưng quyền thao tác project còn được kiểm bằng `ProjectMember`. Người tạo project được tự động trở thành project admin.

### 9.2. Project member invitation/RBAC

| Chức năng | FE | Route | BE |
| --- | --- | --- | --- |
| List member | `ProjectMembersPage.tsx:62`, `ProjectMemberList.tsx:59` | `GET /projects/:projectId/members` `project-member.routes.ts:18` | `ProjectMemberController.getMembers` `project-member.controller.ts:17`, `ProjectMemberService.getMembers` `project-member.service.ts:27` |
| Add/invite project member | `InviteProjectMemberDialog.tsx:54`, `InviteProjectMemberDialog.tsx:75` | `POST /projects/:projectId/members` `project-member.routes.ts:24` | `addMember` `project-member.service.ts:46`, repo `project-member.repository.ts:90` |
| My project invitations | `NotificationBell.tsx:66` | `GET /projects/invitations/me` `project-member.routes.ts:12` | `getMyInvitations` `project-member.service.ts:115` |
| Accept/decline | hook `useProjectMembers.ts:89`, `useProjectMembers.ts:114` | `POST /projects/:projectId/members/:memberId/accept` `project-member.routes.ts:44`, decline `project-member.routes.ts:50` | `acceptInvitation` `project-member.service.ts:168`, `declineInvitation` `project-member.service.ts:204` |
| Update role | `ProjectMembersPage.tsx:83`, `ProjectMemberList.tsx:67` | `PATCH /projects/:projectId/members/:memberId/role` `project-member.routes.ts:31` | `updateMemberRole` `project-member.service.ts:244` |
| Remove member | `ProjectMembersPage.tsx:87`, `ProjectMemberList.tsx:71` | `DELETE /projects/:projectId/members/:memberId` `project-member.routes.ts:38` | `removeMember` `project-member.service.ts:287` |

Logic:

1. Project admin chọn user từ workspace member list.
2. Service `assertCanManageMembers` kiểm tra requester là workspace admin hoặc project admin tại `project-member.service.ts:428`.
3. Repository tạo/cập nhật `ProjectMember` status `PENDING`.
4. Service emit realtime `invitation` tới user và project.
5. Khi user accept, service chỉ cho accept invitation của chính user tại `project-member.service.ts:172`, rồi cập nhật status `ACCEPTED`.
6. Khi remove, service không cho remove project admin và không cho remove nếu user còn active task tại `project-member.service.ts:296`, `project-member.service.ts:452`.

## 10. Task lifecycle và các view List/Kanban/Calendar/Gantt/Chart

### 10.1. FE view modes

| View | FE source | Cách gọi data |
| --- | --- | --- |
| List | `frontend/src/pages/ProjectTaskListPage.tsx:48`, `TaskTable.tsx:224` | `useTasksQuery`, update status khi drag/drop |
| Kanban | `frontend/src/components/tasks/KanbanBoard.tsx:59`, `KanbanBoard.tsx:93`, `KanbanBoard.tsx:97` | Task list được group theo status, kéo cột gọi status change |
| Calendar | `frontend/src/components/calendar/CalendarView.tsx:62`, `CalendarView.tsx:125`, `CalendarView.tsx:149`, `CalendarView.tsx:168` | Đọc tasks, quick add theo ngày, drag task đổi `dueDate` |
| Gantt | `frontend/src/components/gantt/GanttView.tsx:87`, `GanttView.tsx:118`, `GanttView.tsx:141` | Đọc tasks và update `startDate/dueDate` khi kéo timeline |
| Charts/overview | `ProjectOverview.tsx:31`, `OverviewCharts.tsx`, `TaskChartsView.tsx` | Lấy detail project và task stats đã format từ backend |

### 10.2. Task endpoints và BE flow

| Chức năng | FE/hook/API | Route | Controller | Service | Repository |
| --- | --- | --- | --- | --- | --- |
| List tasks | `useTasks.ts:30`, `task-api.ts:22` | `GET /projects/:projectId/tasks` `task.routes.ts:11` | `TaskController.getAll` `task.controller.ts:42` | `TaskService.getAllInProject` `task.service.ts:182` | `TaskRepository.findAllInProject` `task.repository.ts:194` |
| Create task | `CreateTaskDialog.tsx:96`, `ProjectTaskListPage.tsx:134`, `task-api.ts:62` | `POST /projects/:projectId/tasks` `task.routes.ts:17` | `TaskController.create` `task.controller.ts:19` | `TaskService.create` `task.service.ts:67` | `TaskRepository.createTask` `task.repository.ts:256`, `replaceAssignees` `task.repository.ts:288` |
| Detail | `TaskDetailPanel.tsx:140`, `useTasks.ts:36` | `GET /tasks/:id` `task.routes.ts:24` | `TaskController.getById` `task.controller.ts:61` | `TaskService.getById` `task.service.ts:450` | `TaskRepository.findByIdWithDetails` `task.repository.ts:130` |
| Update task | `TaskDetailPanel.tsx:187`, `TaskDetailPanel.tsx:243`, `task-api.ts:77` | `PATCH /tasks/:id` `task.routes.ts:30` | `TaskController.update` `task.controller.ts:75` | `TaskService.update` `task.service.ts:220` | `TaskRepository.updateTask` `task.repository.ts:260` |
| Update status | `ProjectTaskListPage.tsx:110`, `KanbanBoard.tsx:93`, `task-api.ts:118` | `PATCH /tasks/:id/status` `task.routes.ts:50` | `TaskController.updateStatus` `task.controller.ts:93` | `TaskService.updateStatus` `task.service.ts:301` | `TaskRepository.updateStatus` `task.repository.ts:267` |
| Assign | `TaskDetailPanel.tsx:254` | `PATCH /tasks/:id/assignee` `task.routes.ts:57` | `TaskController.assign` `task.controller.ts:102` | `TaskService.assign` `task.service.ts:337` | `TaskRepository.replaceAssignees` `task.repository.ts:288` |
| Subtask | `TaskDetailPanel.tsx:315`, `TaskDetailPanel.tsx:327` | `POST /tasks/:id/subtasks` `task.routes.ts:43` | `TaskController.createSubTask` `task.controller.ts:31` | `TaskService.createSubTask` `task.service.ts:147` | `TaskRepository.countSubTasks` `task.repository.ts:433` |
| Time log | API endpoint | `POST /tasks/:id/time-log` `task.routes.ts:64` | `TaskController.logTime` `task.controller.ts:111` | `TaskService.logTime` `task.service.ts:429` | `TaskRepository.logTime` `task.repository.ts:411` |
| Delete task | `TaskDetailPanel.tsx:434`, `ProjectTaskListPage.tsx:99` | `DELETE /tasks/:id` `task.routes.ts:37` | `TaskController.delete` `task.controller.ts:84` | `TaskService.delete` `task.service.ts:392` | `TaskRepository.deleteWithSubTasks` `task.repository.ts:418` |

Permission:

- Task routes dùng `authMiddleware` tại `task.routes.ts:9`.
- List/create theo `:projectId` dùng `requireProjectTaskRole` tại `task.routes.ts:13`, `task.routes.ts:19`.
- Detail/update/delete theo `:id` dùng `requireTaskRole` tại `task.routes.ts:26`, `task.routes.ts:32`, `task.routes.ts:39`.
- Middleware task resolve project/task và role tại `task-rbac.middleware.ts:81`, `task-rbac.middleware.ts:130`.

Luồng create task:

1. FE submit dialog hoặc quick-add, truyền title, status, priority, dueDate, assigneeIds.
2. Route validate body.
3. Service nếu `type=SUB_TASK` thì bắt buộc có `parentId`; nếu task thường mà có `parentId` thì báo lỗi.
4. Service chuẩn hoá `assigneeIds`: nếu có mảng thì dùng mảng, nếu chỉ có `assigneeId` thì đổi thành mảng một phần tử tại `task.service.ts:543`.
5. Service kiểm tra từng assignee có trong project tại `task.service.ts:537`.
6. Repository tạo `Task`, sau đó replace bảng `TaskAssignee` để hỗ trợ nhiều người.
7. Service ghi `ActivityLog` tại `task.service.ts:115`.
8. Service gửi notification cho assignee tại `task.service.ts:130`.
9. Service emit realtime task event tại `task.service.ts:135`.

Luồng update status:

1. FE list/kanban drag-drop gọi update status.
2. Service lấy task cũ, update status mới.
3. Service ghi activity `TASK_STATUS_CHANGE` tại `task.service.ts:308`.
4. Service gọi `notificationEmitter.onTaskStatusChanged` tại `task.service.ts:324`.
5. Service emit realtime tại `task.service.ts:327`, FE invalidate `tasks`, `task`, `project`, `workspace`, `my-tasks`.

Luồng delete:

1. Service chỉ cho delete task khi status là `DONE` hoặc `CANCELLED` tại `task.service.ts:395`.
2. Repository soft delete task và subtasks liên quan.
3. Service emit project event để list/kanban/calendar cập nhật.

**Cách giải thích:** Task là module rõ nhất cho layered architecture: FE chỉ biết hook/API; route kiểm RBAC; service enforce rule subtask/assignee/status/activity; repository mới gọi Prisma. Sau thay đổi, notification và realtime tách riêng để UI cập nhật.

## 11. Comment, mention, attachment, activity log

### 11.1. Comment và mention

| Chức năng | Source |
| --- | --- |
| FE comment trong task detail | `frontend/src/components/tasks/TaskDetailPanel.tsx:337`, `TaskDetailPanel.tsx:404` |
| Hook/API | `frontend/src/hooks/useTasks.ts:142`, `frontend/src/hooks/useTasks.ts:154`, `frontend/src/lib/task-api.ts:133`, `frontend/src/lib/task-api.ts:148` |
| Routes | `comment.routes.ts:14`, `comment.routes.ts:21`, `comment.routes.ts:29`, `comment.routes.ts:37` |
| Controller | `comment.controller.ts:14`, `comment.controller.ts:39`, `comment.controller.ts:51`, `comment.controller.ts:64` |
| Service | `comment.service.ts:45`, `comment.service.ts:83`, `comment.service.ts:102`, `comment.service.ts:137` |
| Repository | `comment.repository.ts:49`, `comment.repository.ts:95`, `comment.repository.ts:99`, `comment.repository.ts:106` |
| DB | `Comment`, `ActivityLog`, `Notification` |

Luồng comment:

1. Task detail panel tạo comment từ textarea.
2. Route yêu cầu `requireTaskRole('MEMBER')` khi create và `requireCommentRole('MEMBER')` khi update/delete.
3. Service tạo comment, lấy lại comment kèm user.
4. Service ghi activity log tại `comment.service.ts:60`, `comment.service.ts:195`.
5. Service gọi `notificationEmitter.onTaskCommented` tại `comment.service.ts:63`.
6. Service emit realtime child event tại `comment.service.ts:64`.
7. Update/delete chỉ cho chủ comment sửa/xoá tại `comment.service.ts:108`, `comment.service.ts:143`.

Luồng mention:

- FE có autocomplete khi gõ `@` trong `TaskDetailPanel.tsx:119`, quản lý state tại `TaskDetailPanel.tsx:156`, lọc member gợi ý tại `TaskDetailPanel.tsx:348` đến `TaskDetailPanel.tsx:365`, và chèn mention vào nội dung comment tại `TaskDetailPanel.tsx:385`.
- Backend comment service truyền content sang notification emitter tại `comment.service.ts:62`, `comment.service.ts:63`.
- Notification emitter parse format mention `@[name](id)` tại `notification-emitter.ts:143` đến `notification-emitter.ts:149`, sau đó gọi `onMention` tại `notification-emitter.ts:155` để tạo notification loại mention.
- Khi giải thích: comment vẫn là text lưu trong `Comment`, nhưng text có token mention. Notification emitter đọc token đó để tạo notification riêng cho user được nhắc đến.

### 11.2. Attachment upload/download/delete

| Chức năng | Source |
| --- | --- |
| FE upload/download/delete | `TaskDetailPanel.tsx:413`, `TaskDetailPanel.tsx:417`, `TaskDetailPanel.tsx:943`, `TaskDetailPanel.tsx:963` |
| Hook/API | `useTasks.ts:166`, `useTasks.ts:178`, `task-api.ts:159`, `task-api.ts:182`, download `project-api.ts:6` |
| Routes | `attachment.routes.ts:39`, `attachment.routes.ts:46`, `attachment.routes.ts:55`, `attachment.routes.ts:62` |
| Multer upload | `attachment.routes.ts:13`, `attachment.routes.ts:49` |
| Controller | `attachment.controller.ts:15`, `attachment.controller.ts:76`, `attachment.controller.ts:92` |
| Service | `attachment.service.ts:52`, `attachment.service.ts:121`, `attachment.service.ts:135`, `attachment.service.ts:174` |
| Repository | `attachment.repository.ts:47`, `attachment.repository.ts:92`, `attachment.repository.ts:96` |
| Cloudinary | `attachment.service.ts:70`, `attachment.service.ts:155`, `backend/src/common/services/cloudinary.service.ts:27` |

Luồng upload:

1. FE chọn file trong task detail, tạo `FormData`.
2. Route upload dùng multer memory storage, giới hạn size.
3. Controller kiểm tra `req.file`.
4. Service upload buffer lên Cloudinary, lấy `secure_url`.
5. Repository tạo `Attachment` với fileName, fileUrl, fileSize, mimeType, taskId, uploadedBy.
6. Service ghi activity `ATTACHMENT_UPLOAD` và emit realtime attachment.

Luồng delete/download:

1. Download route kiểm `requireAttachmentRole('GUEST')`, service trả file path/filename.
2. Delete chỉ cho uploader xoá tại `attachment.service.ts:144`.
3. Nếu file nằm Cloudinary thì xoá qua Cloudinary; nếu local thì resolve local path.
4. Repository soft delete attachment, service ghi activity và emit realtime.

**Cách giải thích:** File không nằm trong DB, DB chỉ lưu metadata và URL. Upload đi qua multer, service đẩy file lên Cloudinary, repository tạo record, activity log ghi lại hành động.

## 12. Notification, preference, email notification và realtime

### 12.1. Notification CRUD/grouping

| Chức năng | FE | Route | BE |
| --- | --- | --- | --- |
| Dropdown grouped notification | `NotificationBell.tsx:61`, `NotificationBell.tsx:62` | `GET /notifications` `notification.routes.ts:20` | `NotificationController.getAll` `notification.controller.ts:18`, `NotificationService.getGroupedForUser` `notification.service.ts:172`, repo `notification.repository.ts:148` |
| Unread count | `useNotifications.ts:73`, `notification-api.ts:65` | `GET /notifications/unread-count` `notification.routes.ts:11` | `getUnreadCount` `notification.controller.ts:63`, service `notification.service.ts:214` |
| Group detail | `NotificationBell.tsx:78`, `useNotifications.ts:90` | `GET /notifications/groups/:groupKey` `notification.routes.ts:14` | `getGroupDetail` `notification.controller.ts:85`, repo `notification.repository.ts:235` |
| Mark single/group/all read | `useNotifications.ts:113`, `useNotifications.ts:127`, `useNotifications.ts:141` | `notification.routes.ts:29`, `notification.routes.ts:17`, `notification.routes.ts:23` | `notification.service.ts:218`, `notification.service.ts:238`, `notification.service.ts:250` |
| Delete/clear | API `notification-api.ts:116`, `notification-api.ts:124` | `notification.routes.ts:32`, `notification.routes.ts:26` | `notification.service.ts:265`, `notification.service.ts:286` |

Luồng xử lý:

1. Notification được tạo bởi service khác qua `notificationEmitter` hoặc `NotificationService.create`.
2. Repository `findGroupedByUserId` dùng raw query để gom theo `groupKey`, lấy notification mới nhất của mỗi nhóm.
3. Mark read/delete là soft update, sau đó service emit realtime tới user để FE refetch count/list.

### 12.2. Notification preference và email

| Thành phần | Source |
| --- | --- |
| FE preference hook/API | `frontend/src/hooks/useNotifications.ts:101`, `frontend/src/hooks/useNotifications.ts:155`, `frontend/src/lib/notification-api.ts:134`, `frontend/src/lib/notification-api.ts:143` |
| Routes | `notification-preference.routes.ts:11`, `notification-preference.routes.ts:14` |
| Controller/Service | `notification-preference.controller.ts:9`, `notification-preference.service.ts:24`, `notification-preference.service.ts:39` |
| Repository defaults | `notification-preference.repository.ts:5`, `notification-preference.repository.ts:49` |
| Email notification | `notification-emitter.ts:423`, `email.service.ts:305` |

Logic:

1. Khi user mở preference, service `ensureDefaults` tạo default event types nếu thiếu.
2. User cập nhật eventType/email/inApp, service lưu preference.
3. Notification emitter kiểm preference trước khi gửi email.
4. Sau update preference, service emit realtime `notification` để FE invalidate preference cache.

### 12.3. Realtime invalidation

| BE emit | FE invalidate |
| --- | --- |
| `realtimeService.emitToUser` `realtime.service.ts:109` | `RealtimeProvider.tsx:19` đến `RealtimeProvider.tsx:30` invalidate notification/invitation |
| `emitToWorkspace` `realtime.service.ts:117` | `RealtimeProvider.tsx:34` đến `RealtimeProvider.tsx:41` invalidate workspace/project/my-tasks |
| `emitToProject` `realtime.service.ts:124` | `RealtimeProvider.tsx:45` đến `RealtimeProvider.tsx:49` invalidate project/task |
| `emitTaskEvent` `realtime.service.ts:151` | `RealtimeProvider.tsx:66` đến `RealtimeProvider.tsx:72` invalidate task/comment/attachment |

**Cách giải thích:** Realtime không đẩy full data lên FE. Backend chỉ emit event có type/id. FE nhận event và invalidate TanStack Query để tự refetch data mới.

## 13. My Tasks và Reports

### 13.1. My Tasks

| Tầng | Source |
| --- | --- |
| FE route | `frontend/src/App.tsx:172` |
| Backend route | `GET /workspaces/:workspaceId/my-tasks` tại `my-tasks.routes.ts:10` |
| Controller | `my-tasks.controller.ts:9`, `my-tasks.controller.ts:16` |
| Service | `my-tasks.service.ts:39`, `my-tasks.service.ts:76`, `my-tasks.service.ts:223` |
| Repository | `my-tasks.repository.ts:46`, `my-tasks.repository.ts:64`, `my-tasks.repository.ts:88`, `my-tasks.repository.ts:133`, `my-tasks.repository.ts:212` |
| DB | `Task`, `TaskAssignee`, `ActivityLog`, `Project` |

Logic:

1. Route yêu cầu auth và workspace role guest/member.
2. Service parse query: tab `inbox/board/list/activity`, due filter, role filter, pagination.
3. Repository tìm task user tạo ra, task user được assign, activity liên quan.
4. Service format response gồm tasks, stats, activities, projects để FE hiện my work dashboard.

### 13.2. Reports

| Chức năng | Route | Controller/Service/Repository |
| --- | --- | --- |
| Workspace stats | `GET /reports/workspace/:workspaceId/stats` `report.routes.ts:12` | `report.controller.ts:14`, `report.service.ts:26`, `report.repository.ts:4` |
| Workload | `GET /reports/workspace/:workspaceId/workload` `report.routes.ts:19` | `report.controller.ts:77`, `report.service.ts:56`, `report.repository.ts:122` |
| Project progress | `GET /reports/project/:projectId/progress` `report.routes.ts:26` | `report.controller.ts:34`, `report.service.ts:31`, `report.repository.ts:41` |
| Burndown | `GET /reports/project/:projectId/burndown` `report.routes.ts:33` | `report.controller.ts:51`, `report.service.ts:36`, `report.repository.ts:77` |

Logic:

1. Routes đều cần auth và `requireOwnerOrMember`.
2. Controller đọc params/query, service gọi repository.
3. Repository dùng Prisma count/groupBy để tính số member, project, task done/overdue, workload theo user, burndown theo thời gian.

**Cách giải thích:** Reports không lưu bảng riêng. Nó tổng hợp dữ liệu từ Workspace/Project/Task/Member bằng query count/groupBy.

## 14. Owner/Admin console, audit logs, maintenance

### 14.1. FE và route

| Chức năng | FE | Hook/API | BE route |
| --- | --- | --- | --- |
| Dashboard stats/trends/activity | `OwnerOverview.tsx`, `AdminDashboard.tsx` | `useAdminStats` `useAdmin.ts:42`, `useAdminTrends` `useAdmin.ts:48`, `useAdminRecentActivity` `useAdmin.ts:54` | `admin.routes.ts:13`, `admin.routes.ts:14`, `admin.routes.ts:15` |
| Users list/detail | `OwnerUsers.tsx:64`, `OwnerUsers.tsx:71` | `useAdminUsers` `useAdmin.ts:64`, `useAdminUserDetail` `useAdmin.ts:70` | `admin.routes.ts:18`, `admin.routes.ts:19` |
| Block/unblock user | `OwnerUsers.tsx:72`, `AdminUsers.tsx:74` | `useUpdateUserStatusMutation` `useAdmin.ts:77`, API `admin-api.ts:59` | `PATCH /owner/users/:userId/status` `admin.routes.ts:20` |
| Update system role | `OwnerUsers.tsx:73`, `AdminUsers.tsx:75` | `useUpdateUserRoleMutation` `useAdmin.ts:90`, API `admin-api.ts:70` | `PATCH /owner/users/:userId/role` `admin.routes.ts:21` |
| Oversight workspace/project | Owner pages | `useOwnerWorkspaces` `useAdmin.ts:107`, `useOwnerProjects` `useAdmin.ts:113` | `admin.routes.ts:24`, `admin.routes.ts:25` |
| Health/maintenance/settings/audit | `OwnerSettings.tsx:347`, `OwnerAuditLog.tsx` | `useOwnerSystemHealth` `useAdmin.ts:119`, cleanup hooks `useAdmin.ts:125`, `useAdmin.ts:137`, audit `useAdmin.ts:175` | `admin.routes.ts:28` đến `admin.routes.ts:37` |

Admin routes:

- Tất cả route admin/owner dùng `authMiddleware` tại `admin.routes.ts:9`.
- Sau đó dùng `requireSystemOwner` tại `admin.routes.ts:10`.
- Middleware đọc `systemRole` từ JWT và chỉ cho `OWNER` tại `backend/src/common/middlewares/system-role.middleware.ts:11`.

### 14.2. Owner user block/role update

| Tầng | Block user | Role update |
| --- | --- | --- |
| Controller | `admin.controller.ts:70` | `admin.controller.ts:88` |
| Service | `admin.service.ts:68` | `admin.service.ts:116` |
| Repository | `admin.repository.ts:293` | `admin.repository.ts:300` |
| Audit log | `admin.service.ts:89`, `admin.repository.ts:631` | `admin.service.ts:138`, `admin.repository.ts:631` |
| Realtime | `admin.service.ts:100`, `admin.service.ts:107` | `admin.service.ts:150`, `admin.service.ts:157` |
| DB | `User.isBlocked`, `User.systemRole`, `AdminAuditLog` |

Luồng block/unblock:

1. Owner click block/unblock trên FE.
2. Hook gọi API, xong invalidate users/stats.
3. BE check JWT và system owner.
4. Service lấy user, chặn các hành động không hợp lệ nếu có, repository update `isBlocked`.
5. Service tạo audit log `USER_BLOCKED/USER_UNBLOCKED`.
6. Service emit realtime tới owners và user bị tác động.

Luồng update role:

1. Owner chọn role mới `OWNER` hoặc `USER`.
2. Service lấy role cũ, repository update `systemRole`.
3. Service ghi audit log với oldRole/newRole.
4. Realtime báo cho owner console và user bị đổi role.

**Cách giải thích:** Owner console là module admin dùng interface rõ hơn. Mọi thao tác nhạy cảm như block user, đổi role, cleanup, update setting đều ghi `AdminAuditLog` và emit realtime.

### 14.3. Maintenance, settings, audit log

| Chức năng | Source |
| --- | --- |
| System health | `admin.service.ts:206`, `admin.repository.ts:440` |
| Cleanup expired refresh tokens | `admin.controller.ts:143`, `admin.service.ts:210`, `admin.repository.ts:547` |
| Cleanup expired OTP codes | `admin.controller.ts:151`, `admin.service.ts:232`, `admin.repository.ts:555` |
| Settings | `admin.controller.ts:163`, `admin.service.ts:258`, `admin.service.ts:262`, `admin.repository.ts:567`, `admin.repository.ts:575` |
| Audit logs | `admin.controller.ts:189`, `admin.service.ts:298`, `admin.repository.ts:594` |

## 15. Middleware, validation và error flow

| Thành phần | Source | Giải thích |
| --- | --- | --- |
| Auth middleware | `auth.middleware.ts:19`, `auth.middleware.ts:39` | Verify JWT, gắn `req.user` |
| Workspace RBAC | `rbac.middleware.ts:17`, `rbac.middleware.ts:49`, `rbac.middleware.ts:69` | Resolve workspace slug/id, tìm membership, so role hierarchy |
| Project RBAC | `project-rbac.middleware.ts:25`, `project-rbac.middleware.ts:60`, `project-rbac.middleware.ts:80` | Kiểm project membership/role |
| Task RBAC | `task-rbac.middleware.ts:81`, `task-rbac.middleware.ts:130` | Kiểm quyền theo projectId hoặc taskId |
| Comment/Attachment RBAC | `comment-rbac.middleware.ts:14`, `attachment-rbac.middleware.ts:14` | Kiểm role trước khi sửa/xoá comment/file |
| Validation | `validation.middleware.ts:14`, `validation.middleware.ts:265`, `validation.middleware.ts:387` | Validate body cho auth/task/comment |
| Error middleware | `error.middleware.ts` | Gom lỗi thành response thống nhất |

**Cách giải thích:** FE có thể ẩn/hiện nút theo role, nhưng bảo vệ thật nằm ở middleware BE. Request phải qua auth, role, validation rồi mới vào controller.

## 16. Các luồng mẫu để học bảo vệ

### 16.1. Login + refresh token

```text
Login.tsx:20,86
-> useAuth.ts:107,110
-> api-client.ts:219,231
-> POST /auth/login auth.routes.ts:38
-> AuthController.login auth.controller.ts:95
-> AuthService.login auth.service.ts:89
-> AuthRepository.findByEmail auth.repository.ts:10
-> AuthService.createAuthSession auth.service.ts:575
-> AuthRepository.createRefreshToken auth.repository.ts:80
-> User/RefreshToken schema.prisma:72,132
```

Nếu access token hết hạn:

```text
api-client.ts:231
-> refreshAccessToken api-client.ts:184
-> POST /auth/refresh auth.routes.ts:44
-> AuthController.refresh auth.controller.ts:136
-> AuthService.refresh auth.service.ts:181
-> AuthRepository.findRefreshToken/deleteRefreshToken/createRefreshToken
```

### 16.2. Invite workspace member

```text
InviteMemberDialog.tsx:62,64
-> useInviteWorkspaceMemberMutation useWorkspaces.ts:112
-> inviteWorkspaceMember workspace-api.ts:113
-> POST /workspaces/:workspaceId/members/invite workspace.routes.ts:85
-> authMiddleware + requireOwner
-> WorkspaceController.inviteMember workspace.controller.ts:101
-> WorkspaceService.inviteMember workspace.service.ts:324
-> WorkspaceRepository.findPendingInvitationByEmail/createInvitation
-> sendWorkspaceInvitationEmail workspace.service.ts:856
-> notificationEmitter.onInvitationReceived workspace.service.ts:874
-> Invitation schema.prisma:197
```

### 16.3. Create task

```text
CreateTaskDialog.tsx:96,110
-> ProjectTaskListPage.tsx:134,135
-> createTask task-api.ts:62
-> POST /projects/:projectId/tasks task.routes.ts:17
-> requireProjectTaskRole('MEMBER')
-> TaskController.create task.controller.ts:19
-> TaskService.create task.service.ts:67
-> normalizeAssigneeIds task.service.ts:543
-> TaskRepository.createTask task.repository.ts:256
-> TaskRepository.replaceAssignees task.repository.ts:288
-> ActivityLog create task.service.ts:115
-> notificationEmitter.onTaskAssigned task.service.ts:130
-> realtimeService.emitTaskEvent task.service.ts:135
-> Task/TaskAssignee/ActivityLog schema.prisma:281,326,393
```

### 16.4. Update task status

```text
TaskTable.tsx:224,235 hoặc KanbanBoard.tsx:59,93
-> ProjectTaskListPage.tsx:110
-> updateTaskStatus task-api.ts:118
-> PATCH /tasks/:id/status task.routes.ts:50
-> requireTaskRole('MEMBER')
-> TaskController.updateStatus task.controller.ts:93
-> TaskService.updateStatus task.service.ts:301
-> TaskRepository.updateStatus task.repository.ts:267
-> ActivityLog task.service.ts:308
-> notificationEmitter.onTaskStatusChanged task.service.ts:324
-> realtimeService.emitTaskEvent task.service.ts:327
```

### 16.5. Owner block user/update role

```text
OwnerUsers.tsx:72,73
-> useUpdateUserStatusMutation/useUpdateUserRoleMutation useAdmin.ts:77,90
-> admin-api.ts:59,70
-> PATCH /owner/users/:userId/status admin.routes.ts:20
-> PATCH /owner/users/:userId/role admin.routes.ts:21
-> authMiddleware admin.routes.ts:9
-> requireSystemOwner admin.routes.ts:10
-> AdminController.updateUserStatus/updateUserRole admin.controller.ts:70,88
-> AdminService.updateUserStatus/updateUserSystemRole admin.service.ts:68,116
-> AdminRepository.updateUserStatus/updateUserSystemRole admin.repository.ts:293,300
-> AdminRepository.createAuditLog admin.repository.ts:631
-> realtimeService.emitToOwners/emitToUser admin.service.ts:100,107,150,157
-> User/AdminAuditLog schema.prisma:72,508
```

## 17. Tóm tắt để trả lời nhanh

- **Mô hình là gì?** Modular Monolith + Layered Architecture, FE component-based React, không phải MVC thuần.
- **OOP nằm ở đâu?** Các class `Controller`, `Service`, `Repository`, base abstract class, interface/DTO. Ví dụ `TaskService` đóng gói logic task.
- **FE gọi BE như thế nào?** Page/component gọi hook TanStack Query, hook gọi API lib, API lib dùng Axios có JWT interceptor.
- **BE xử lý request thế nào?** Route -> middleware auth/RBAC/validation -> controller -> service -> repository -> Prisma.
- **DB quan hệ chính?** User có nhiều workspace qua `WorkspaceMember`; workspace có project; project có task; task có comment/attachment/activity/notification; task có nhiều assignee qua `TaskAssignee`.
- **Realtime làm gì?** Backend emit event nhỏ, FE invalidate TanStack Query và refetch data mới.
- **Tại sao không để controller query DB?** Để tách trách nhiệm: controller làm HTTP, service làm business, repository làm DB. Đây là Repository Pattern + Service Layer.
