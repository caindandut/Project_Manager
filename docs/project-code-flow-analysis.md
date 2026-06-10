# Phân tích chi tiết chức năng, luồng code và OOP

Tài liệu này dùng để giải thích chi tiết dự án khi bảo vệ đồ án: một chức năng bắt đầu từ màn hình Frontend (FE) nào, đi qua hook/API client nào, gọi endpoint nào ở Backend (BE), và BE xử lý qua các tầng Middleware/Controller/Service/Repository ra sao trước khi đọc/ghi vào Database (DB).

> **Lưu ý:** Các đường dẫn file và số dòng (`file.ts:line`) được giữ lại trong ngoặc đơn để bạn có thể mở source code và kiểm chứng chính xác luồng chạy.

---

## 1. Kiến trúc tổng quan: Modular Monolith + Layered Architecture

Dự án hiện tại **không phải mô hình MVC thuần**. Kiến trúc chính xác hơn của hệ thống là:

- **Frontend:** Component-based React architecture (React 19 + Vite + Zustand + TanStack Query).
- **Backend:** Modular Monolith + Layered Architecture (Node.js + Express + TypeScript).
- **Database:** MySQL 8 + Prisma ORM.

**Lý do không gọi là MVC thuần:**
- Backend không đóng vai trò render View (như trả về HTML).
- React (FE) đảm nhận toàn bộ vai trò View (UI).
- Mọi giao tiếp giữa FE và BE đều thông qua **REST API** trả về JSON và các sự kiện **Realtime (Socket.IO)**.
- Phần "Model" ở Backend được chia nhỏ thành 3 tầng riêng biệt để thể hiện tính hướng đối tượng (OOP): **Service**, **Repository**, và **Prisma Client**.

### Luồng xử lý tổng quát từ Client tới Database
1. **Người dùng thao tác trên UI** (Ví dụ: bấm nút Lưu).
2. **React Component** gọi một custom hook của TanStack Query (ví dụ: `useMutation`).
3. **Hook** gọi hàm trong `api-client` (thư viện Axios). Interceptor của Axios tự động gắn token JWT vào Header `Authorization`.
4. Request bay đến **Express Endpoint** (`/api/v1/...`).
5. **Middleware** chạy đầu tiên: kiểm tra người dùng đã đăng nhập chưa (`authMiddleware`), có quyền thao tác không (`rbacMiddleware`), dữ liệu gửi lên có đúng định dạng không (`validationMiddleware`).
6. **Controller** nhận request hợp lệ, lấy tham số từ `req.body` hoặc `req.params`, gọi hàm tương ứng trong **Service**.
7. **Service** chứa logic nghiệp vụ (kiểm tra điều kiện, gửi email, tạo thông báo). Sau khi kiểm tra xong, Service gọi **Repository**.
8. **Repository** đảm nhận việc tương tác với cơ sở dữ liệu qua **Prisma Client** (Tạo câu query SQL gửi xuống MySQL).
9. Nếu ghi thành công, **Service** sẽ kích hoạt `realtimeService` để báo cho các User khác biết (cập nhật UI trực tiếp) hoặc ghi nhận `ActivityLog`.
10. **Controller** lấy kết quả từ Service và trả về `ApiResponse` (JSON) cho FE.
11. **FE** nhận JSON, TanStack Query invalidate cache cũ, tự động lấy dữ liệu mới và render lại UI.

---

## 2. Áp dụng OOP (Hướng đối tượng) trong Backend

Backend được tổ chức rất chặt chẽ theo các nguyên lý OOP để mã nguồn dễ bảo trì và mở rộng.

### 2.1. Dependency Injection Thủ công (Singleton Pattern)
Dự án không dùng DI Container như NestJS, mà áp dụng **Manual Dependency Injection** thông qua cơ chế module của TypeScript. 
Ví dụ: Ở cuối file `auth.service.ts`, ta khởi tạo `export const authService = new AuthService()`. Sau đó `AuthController` sẽ import object này vào để dùng. Việc này đảm bảo toàn hệ thống chỉ có 1 thực thể (Singleton) của mỗi Service/Repository.

### 2.2. Các Design Pattern và Nguyên lý OOP thể hiện:
1. **Tính đóng gói (Encapsulation):** Mọi logic nghiệp vụ phức tạp đều được "giấu" trong các phương thức của class `Service` (ví dụ: `AuthService.login`). Controller không biết DB trông như thế nào, nó chỉ biết gọi `Service.login`.
2. **Tính kế thừa (Inheritance):** Các class kế thừa từ các lớp trừu tượng cơ bản (`BaseController`, `BaseService`, `BaseRepository`) để dùng lại các hàm chuẩn bị sẵn như phân trang, soft delete, hay hứng lỗi.
3. **Separation of Concerns (Phân tách trách nhiệm):**
   - **Controller:** Adapter giao tiếp HTTP. Chỉ đọc `req` và trả `res`.
   - **Service:** Tầng nghiệp vụ. Kiểm tra luật lệ, ném lỗi nghiệp vụ, gọi các service khác (như gửi email, emit realtime).
   - **Repository:** Tầng Data Access. Là nơi duy nhất chứa logic gọi Prisma ORM. 
4. **Sử dụng Interface:** Để định nghĩa đầu vào/đầu ra chuẩn (DTO) giữa các hàm, tránh truyền object JS tuỳ tiện. (Ví dụ: `IAdminService`, `IAdminRepository`).

---

## 3. Các cơ chế dùng chung quan trọng ở Frontend (FE)

### 3.1. Cơ chế API Client và Refresh Token Rotation
Mỗi khi FE gọi API, không bao giờ dùng `fetch()` trực tiếp, mà gọi thông qua một instance của Axios (`frontend/src/lib/api-client.ts`).
- **Tự động gắn Token:** Khi gửi Request, Axios interceptor lấy `accessToken` từ bộ nhớ (Zustand) và gắn vào Header.
- **Refresh Token Rotation (Tự động gia hạn):** 
  - Nếu BE trả về lỗi `401 Unauthorized` (do access token hết hạn), Axios interceptor chặn lỗi này lại.
  - Interceptor lấy `refreshToken` gửi lên API `/auth/refresh` ngầm.
  - Nếu BE xác thực `refreshToken` hợp lệ, BE trả về 1 cặp token mới tinh. 
  - Token cũ trong DB bị xóa (để chống bị đánh cắp dùng lại - rotation).
  - FE lưu token mới vào Zustand store, và **tự động retry** (gửi lại) cái request ban đầu vừa bị lỗi 401. Người dùng không hề hay biết phiên đăng nhập vừa được làm mới.

### 3.2. Quản lý trạng thái và Cache (Zustand & TanStack Query)
- **Zustand (`authStore.ts`):** Quản lý State toàn cục như thông tin người dùng đang đăng nhập, danh sách Workspace hiện tại.
- **TanStack Query (React Query):** Lưu trữ kết quả API. Khi cần tải lại danh sách Task, FE không gọi API thủ công mà chỉ cần gọi `queryClient.invalidateQueries('tasks')`. React Query sẽ tự động gọi lại API ngầm và cập nhật UI mượt mà.

---

## 4. Bản đồ các Model trong Database (Prisma Schema)

Dự án dùng MySQL 8. Các bảng quan trọng có liên kết với nhau:

1. **User (Người dùng):** Quản lý đăng nhập, trạng thái khóa, OAuth Google, Role hệ thống (Owner/User).
2. **Workspace (Không gian làm việc) & WorkspaceMember:** 
   - Một User có thể thuộc nhiều Workspace với các Role khác nhau (Admin, Member, Guest). Đây là quan hệ nhiều-nhiều lưu ở `WorkspaceMember`.
3. **Project (Dự án) & ProjectMember:** 
   - Một Workspace có nhiều Project. Chỉ những người trong Workspace mới được mời vào Project. Quyền ở Project (Admin, Member) là độc lập với quyền Workspace.
4. **Task (Công việc) & TaskAssignee:**
   - Một Project có nhiều Task. Task có Thẻ (Todo, Done), Độ ưu tiên, Ngày đến hạn. Một Task có thể gán cho **nhiều Assignee** (thông qua bảng `TaskAssignee`).
5. **ActivityLog (Lịch sử hoạt động) & Notification (Thông báo):**
   - Khi có người sửa task, comment, xoá file... DB lưu lại `ActivityLog` để hiển thị trên "Activity Timeline". 
   - Đồng thời lưu vào bảng `Notification` để đẩy thông báo đến chuông của người dùng.

---
## 5. Chi tiết Luồng Authentication & Đăng nhập (Auth Flow)

### 5.1. Luồng Đăng nhập (Login) bằng Email & Password
1. **Frontend:** Tại trang `Login.tsx`, người dùng nhập Email và Password rồi bấm Submit. Form gọi hook `useAuth().login`.
2. **Gọi API:** Hook gửi một POST request chứa JSON (email, password) đến Endpoint `/api/v1/auth/login`.
3. **Middleware:** 
   - Đầu tiên đi qua `validationMiddleware` để kiểm tra định dạng email và độ dài password. Nếu sai định dạng, chặn luôn không cho đi tiếp.
4. **Controller (`auth.controller.ts`):** Nhận request, không xử lý DB gì cả mà đẩy `email` và `password` sang cho `AuthService`.
5. **Service (`auth.service.ts`):** 
   - Gọi `AuthRepository.findByEmail` để lấy thông tin User từ DB. Nếu không tìm thấy -> báo lỗi.
   - Dùng hàm `bcrypt.compare()` để so sánh password người dùng nhập với password đã băm (hash) lưu trong DB. Nếu sai -> báo lỗi.
   - Nếu đúng, kiểm tra tài khoản có bị block không. Nếu có -> báo lỗi.
   - Kiểm tra xem User này đã khởi tạo (Onboarding) xong Workspace chưa.
   - Ký tạo 2 chuỗi JWT: `accessToken` (sống 15 phút) và `refreshToken` (sống 7 ngày). 
   - Gửi `refreshToken` cho Repository để lưu vào DB bảng `RefreshToken`.
6. **Trả kết quả:** Service trả data về cho Controller. Controller bọc lại thành chuẩn JSON `ApiResponse` gửi về FE.
7. **Frontend xử lý sau Login:** 
   - Lưu 2 Token vào Zustand store.
   - Điều hướng: Nếu User chưa Onboarding -> văng ra trang `/onboarding`. Nếu User là Owner -> văng vào `/owner`. Nếu User bình thường -> văng vào Dashboard Workspace.

### 5.2. Luồng Đăng ký (Register) bằng OTP qua Email
Đăng ký không tạo tài khoản ngay lập tức mà chia làm 3 bước API tách biệt để tránh tạo tài khoản rác:
1. **Bước 1: Gửi mã OTP (`/auth/send-otp`)**
   - Người dùng nhập Email muốn đăng ký.
   - Service kiểm tra Email này chưa tồn tại trong DB, sau đó sinh ngẫu nhiên mã 6 số. Xóa mã OTP cũ (nếu có), lưu mã mới vào bảng `OtpCode` với thời hạn (VD: 5 phút).
   - Cuối cùng, Service gọi `email.service.ts` dùng thư viện Nodemailer gửi email chứa mã OTP.
2. **Bước 2: Xác minh OTP (`/auth/verify-otp`)**
   - Người dùng điền 6 số. BE tìm trong DB mã OTP này.
   - Nếu mã đúng và chưa hết hạn, BE cập nhật trạng thái OTP trong DB thành `verified=true`.
3. **Bước 3: Hoàn tất Đăng ký (`/auth/register-with-otp`)**
   - FE gửi lại Email, Password và Mã OTP đã xác minh lên.
   - Service kiểm tra lại xem mã OTP đó đã thực sự `verified` chưa.
   - Nếu hợp lệ, Service dùng `bcrypt.hash()` để băm password.
   - Gọi Repository lưu User mới vào DB. 
   - Xóa dòng OTP đó khỏi DB (để không bị dùng lại).
   - Tạo Access/Refresh Token và đăng nhập luôn cho người dùng.

### 5.3. Luồng Đăng nhập bằng Google OAuth
Luồng OAuth này là Server-Side Flow (Backend lấy profile trực tiếp từ Google, an toàn hơn).
1. **Bấm nút ở FE:** Người dùng bấm "Login with Google", FE dùng lệnh `window.location.assign` đá người dùng sang trang `/api/v1/auth/google`.
2. **BE Redirect:** Backend nhận được yêu cầu, liền đá trình duyệt sang trang đăng nhập thật của Google.
3. **Google Callback:** Sau khi người dùng đồng ý, Google tự động đá trình duyệt quay lại địa chỉ `/api/v1/auth/google/callback` của Backend, kèm theo một đoạn `code`.
4. **Service Xử lý:**
   - Backend lấy `code` đó gọi thầm cho Google để đổi lấy thông tin Profile (Email, Tên, Ảnh đại diện).
   - Kiểm tra xem Email này đã có trong DB chưa.
   - *Đã có nhưng đăng ký bằng mật khẩu:* Update DB, liên kết luôn `googleId` vào tài khoản cũ để họ có thể đăng nhập bằng Google lần sau.
   - *Chưa có:* Tạo User mới hoàn toàn, đánh dấu hệ thống là `systemRole=USER`.
   - Sinh Access/Refresh Token như đăng nhập thường.
5. **Trả về FE:** Controller không trả JSON, mà dùng `res.redirect` đá trình duyệt về lại trang `/google/callback` của Frontend, kèm theo Token dán trên URL hoặc Cookie. Frontend bóc Token ra lưu vào Store và hoàn tất quá trình.

### 5.4. Các luồng Auth phụ
- **Quên mật khẩu:** Giống OTP, FE gửi Email -> BE sinh token lưu vào bảng `ResetToken` -> Gửi Email link reset -> FE bấm link điền Pass mới -> BE Hash pass mới lưu DB và **xóa toàn bộ Session/Refresh Token cũ** để ép người dùng phải đăng nhập lại trên các thiết bị khác.
- **Đổi Avatar:** Người dùng tải ảnh lên. Route gọi Middleware `multer` để parse file. Service đẩy file ảnh lên mây `Cloudinary`, lấy URL ảnh trả về. Xóa file ảnh cũ trên Cloudinary để tiết kiệm dung lượng, rồi lưu URL ảnh mới vào DB.
- **Lấy thông tin User (Get Me):** FE có hook `useAuth` chạy lúc mở web, gọi API `/auth/me`. Cần gắn Token vào header. Middleware kiểm tra Token, nếu đúng bóc ra `userId` gắn vào `req.user`. Controller gọi Service lấy chi tiết User từ DB trả về.
---
## 6. Chi tiết Luồng Workspace (Không gian làm việc) và Project (Dự án)

Một đặc điểm rất quan trọng của hệ thống này là **Người dùng không tự nhiên có quyền làm mọi thứ**. Tất cả quyền hạn được gói trong Workspace và Project.

### 6.1. Quản lý Workspace (Tạo, Sửa, Xóa mềm)
1. **Tạo Workspace:** 
   - FE gọi API POST `/workspaces` với tham số Tên Workspace.
   - Middleware `authMiddleware` xác nhận người dùng đã đăng nhập.
   - **Service:** Tạo một đường dẫn rút gọn (slug) duy nhất cho Workspace từ tên.
   - **Repository:** Chạy Transaction (đảm bảo hoặc là ghi hết hoặc lỗi hết) để lưu bảng `Workspace`, đồng thời tạo một bản ghi ở bảng `WorkspaceMember` chỉ định người vừa tạo làm **OWNER** của Workspace đó.
   - **Service Emit Realtime:** Phát tín hiệu socket để FE lập tức biết có workspace mới.
2. **Cập nhật và Xem chi tiết Workspace:**
   - Middleware `rbacMiddleware.requireGuest` (Guest trở lên) chặn các route này. Nó tìm tham số `workspaceId` từ URL, bóc `req.user.id`, rồi check xem User có nằm trong `WorkspaceMember` không. Nếu không, trả về `403 Forbidden`.
3. **Xóa (Archive) & Khôi phục Workspace:**
   - Đây là cơ chế **Soft Delete (Xóa mềm)**. Khi User (phải là Owner/Admin) bấm xóa, Service không thực thi lệnh `DELETE` trong SQL. Thay vào đó, Repository gán trường `deletedAt = NOW()`.
   - Lợi ích: Dữ liệu không mất đi. Nếu User bấm "Khôi phục", Repository chỉ cần set `deletedAt = null` là mọi thứ (Project, Task bên trong) sẽ hiện lại y như cũ. Middleware tự động loại bỏ các workspace đã bị soft delete khi truy vấn thông thường.

### 6.2. Lời mời (Invitation) thành viên vào Workspace
Không thể gán thẳng người khác vào Workspace, phải qua quy trình gửi Lời Mời.
1. **Gửi lời mời:**
   - Người gửi ở FE điền Email và chọn Quyền (Admin, Member, Guest).
   - Middleware kiểm tra người gửi có quyền `OWNER` hoặc `ADMIN` không.
   - **Service:** Sinh một chuỗi Token bảo mật dài, lưu vào bảng `Invitation` với trạng thái `PENDING`.
   - Gọi thư viện Email gửi Token này (dưới dạng link mời) đến hộp thư của người nhận. Đồng thời kích hoạt Realtime để quả chuông thông báo trên FE người nhận hiện số "1".
2. **Xử lý lời mời (Accept/Decline):**
   - FE người nhận mở quả chuông, bấm "Chấp nhận". Gọi API `POST /invitations/:token/accept`.
   - **Service:** Dò trong DB xem Token còn hạn và còn `PENDING` không.
   - Nếu hợp lệ, Service đánh dấu thư mời là `ACCEPTED`. 
   - Sau đó tạo một bản ghi mới trong bảng `WorkspaceMember` cho người này với Role tương ứng. Phát realtime để FE Load lại danh sách Member.
   - *(Lưu ý: Nếu thành viên bấm rời (Leave) khỏi Workspace, Service sẽ bắt lỗi chặn lại nếu thành viên đó đang ôm Task chưa làm xong).*

### 6.3. Luồng Quản lý Project (Dự án) và Phân quyền Project
Project nằm bên trong Workspace. Nhưng quyền của Project độc lập một phần với Workspace.
1. **Tạo Project:**
   - Tương tự tạo Workspace, nhưng lúc tạo Project, hệ thống sẽ tự sinh `Project Key` (ví dụ: `PRO-1`, `PRO-2`...). 
   - Người tạo Project được gán quyền `ADMIN` của Project đó trong bảng `ProjectMember`.
2. **Project RBAC (Role-Based Access Control):**
   - Trong `project.routes.ts`, có thêm các middleware như `requireProjectAdmin`, `requireProjectMember`.
   - Ví dụ: Một người là `MEMBER` của Workspace (không có quyền xóa Workspace), nhưng họ lại được chỉ định làm `ADMIN` của Project A. Khi đó, middleware `requireProjectAdmin` sẽ check bảng `ProjectMember` và cho phép họ xóa Project A. 
3. **Archive Project:**
   - Hoạt động bằng Soft Delete y hệt Workspace. Nhưng trước khi xóa, Service sẽ gọi Repository kiểm đếm số lượng Task có trạng thái `In Progress` hoặc `Todo`. Hệ thống chặn không cho xóa Project nếu Project đó vẫn còn task dang dở.
---
## 7. Chi tiết Luồng Task Lifecycle (Vòng đời Công việc)

Task (Công việc) là trung tâm của ứng dụng, nơi thể hiện kiến trúc Layered Architecture rõ ràng nhất.

### 7.1. Giao diện (FE) hiển thị đa dạng (List, Kanban, Calendar, Gantt)
- Tất cả các view này bản chất đều chia sẻ chung một nguồn dữ liệu (hook `useTasksQuery`). Backend chỉ trả về 1 mảng JSON chứa các Task. Việc biến nó thành dạng Bảng (List), dạng Cột kéo thả (Kanban), hay Biểu đồ thời gian (Gantt) hoàn toàn do Logic ở Frontend xử lý bằng cách nhóm (group) và lọc (filter) mảng dữ liệu này.

### 7.2. Luồng tạo Task mới và Assignee
1. **Frontend:** Người dùng mở popup "Create Task", điền Tiêu đề, Chọn Dự án, Chọn người thực hiện (có thể chọn nhiều người - Multi-assignee), Ngày hết hạn.
2. **Controller:** Nhận API `/projects/:projectId/tasks`.
3. **Service Kiểm tra Logic:**
   - Nếu FE truyền lên `type = SUB_TASK` (Task con), Service bắt buộc phải có `parentId`. Ngược lại nếu task thường mà truyền `parentId` thì báo lỗi.
   - Chuẩn hóa mảng người được gán (`assigneeIds`). Kiểm tra xem tất cả những người này có thực sự là thành viên (`ProjectMember`) của Dự án hay không. Nếu có ai đó ngoại đạo -> từ chối tạo.
4. **Repository:** Lưu bản ghi `Task`. Thay vì lưu ID người thực hiện vào bảng `Task`, do hỗ trợ nhiều Assignee nên Repository sẽ insert vào bảng trung gian `TaskAssignee`.
5. **Ghi Log và Thông báo:**
   - Service lưu một dòng vào bảng `ActivityLog` (Ghi nhận: "User A vừa tạo Task B").
   - Service gọi `notificationEmitter.onTaskAssigned()` để gửi thông báo quả chuông cho những người vừa bị gán việc.
   - Service gọi `realtimeService.emitTaskEvent` để các máy tính khác đang xem Kanban lập tức cập nhật Task mới mà không cần F5.

### 7.3. Luồng Cập nhật Trạng thái Task (Drag-and-Drop trên Kanban)
1. **Frontend:** Người dùng kéo thả 1 thẻ Task từ cột `TODO` sang cột `IN_PROGRESS`. Hàm `onDragEnd` của thư viện dnd-kit ở FE sẽ gọi API `PATCH /tasks/:id/status`.
2. **Service Backend:**
   - Kiểm tra quyền (Chỉ Member của Project mới được kéo).
   - Gọi Repository update trường `status` trong DB.
   - Ghi lại `ActivityLog` với loại `TASK_STATUS_CHANGE`.
   - Gửi thông báo đến những người liên quan (Người tạo Task, hoặc những Assignee khác).
   - Phát Realtime báo toàn mạng: "Task này đã đổi trạng thái, ai đang xem hãy render lại".

### 7.4. Xóa Task
Xóa Task cũng là Soft Delete. Service chặn chỉ cho phép xóa khi Task đang ở trạng thái `DONE` hoặc `CANCELLED` (Tránh việc nhân viên tự ý xóa task đang làm dở). Repository sẽ gán `deletedAt` cho cả Task cha và tất cả Sub-tasks con của nó.

---

## 8. Luồng Bình luận (Comment), Đề cập (Mention) & Tệp đính kèm (Attachment)

### 8.1. Bình luận và Mention (@)
- Khi nhập Comment ở FE, UI dùng Regex để phát hiện khi người dùng gõ chữ `@` và hiển thị danh sách Member dự án. 
- Khi người dùng gửi, chuỗi gửi lên BE là một chuỗi thô chứa mã Token đặc biệt, ví dụ: `"Tôi đã làm xong @[Khanh](user-id-123)"`.
- **Backend Service:** Nhận chuỗi này lưu vào bảng `Comment`. Nhưng điểm đặc biệt là Service sẽ gọi bộ quét `Notification Emitter`. Bộ quét này dùng Regex tìm kiếm mẫu `@[tên](id)` trong đoạn text. Nếu tìm thấy, nó sẽ sinh ra một Notification loại `MENTION` và đẩy realtime vào quả chuông của user có `id` tương ứng.

### 8.2. Đính kèm File
- Backend dùng `multer` để hứng file nhị phân tải lên từ FE.
- **Service** chuyển file này đẩy thẳng lên dịch vụ cloud **Cloudinary**.
- Trả về lấy URL trực tiếp và lưu vào bảng `Attachment` của Task đó. Nhờ vậy máy chủ cục bộ (Backend Server) không bị tốn dung lượng ổ cứng lưu file. Khi Xóa attachment, Service cũng tự động chọc API sang Cloudinary báo xóa file bên đó.

---

## 9. Notification (Thông báo) và Preferences (Cấu hình)
- Cơ chế Grouping: Không tạo quá nhiều thông báo rác. Nếu 1 Task bị đổi trạng thái 10 lần, BE dùng chung một `groupKey` (ví dụ: `task:123`) để cập nhật gộp thông báo lại, tránh làm người dùng bị spam quả chuông.
- Preferences: Người dùng có thể chỉnh "Tắt nhận Email khi có Task mới". Khi `Notification Emitter` chuẩn bị gửi email, nó sẽ đọc bảng `NotificationPreference`, nếu thấy đánh dấu là `email=false`, nó sẽ chặn không gửi email, chỉ báo ở chuông web.

---

## 10. Admin Console & Owner (Dành cho Quản trị viên hệ thống)
Hệ thống có 1 Role cấp cao nhất: `systemRole = OWNER`.
- Owner có trang `/owner` riêng.
- Có quyền truy cập mọi API thống kê, Xem danh sách mọi User trong hệ thống, Xem Audit Logs.
- **Luồng Block User:** Owner bấm Khóa tài khoản. Controller -> Service cập nhật `status = BLOCKED`. Emit realtime tới User đó (nếu đang online) bằng lệnh `force_logout`, ép FE của User đó tự động xóa token và văng ra màn hình đăng nhập. Đồng thời mọi hành động của Owner đều bị ghi vào bảng `AdminAuditLog` để sau này kiểm toán.

---

## 11. Tóm tắt nhanh (Quick Q&A)
- **Mô hình kiến trúc là gì?** Không phải MVC thuần. Là Modular Monolith + Layered Architecture ở Backend, kết hợp Component-based React ở Frontend.
- **Tính OOP (Hướng đối tượng) thể hiện ở đâu?** Thông qua việc đóng gói logic ở các lớp `Controller`, `Service`, `Repository` thay vì viết hàm rời rạc. Dùng Singleton Pattern, Kế thừa lớp Base (`BaseService`), và Data Transfer Objects (Interfaces/DTO).
- **Backend và Frontend nói chuyện thế nào?** Giao tiếp RESTful JSON API. FE dùng Axios có gắn Interceptor tự động làm mới JWT (Refresh Token Rotation).
- **Realtime (Socket.IO) đóng vai trò gì?** Đóng vai trò là "Chuông báo". Backend phát event (chỉ mang dữ liệu nhỏ). FE nhận event, biết được chỗ nào thay đổi, TanStack Query sẽ gửi Request ngầm hỏi Backend tải data mới rồi render lại (Invalidate & Refetch).
- **Tại sao không để Controller gọi DB luôn?** Để áp dụng "Separation of Concerns". Controller chỉ lo HTTP, Service lo logic luật lệ kinh doanh (kiểm tra rác, logic block), Repository lo câu truy vấn Prisma. Giúp dễ test và mở rộng sau này.
