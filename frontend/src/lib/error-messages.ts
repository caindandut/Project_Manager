export function toVietnameseErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : ""

  const mappings: Array<[string, string]> = [
    ["Invalid email or password", "Email hoặc mật khẩu không đúng."],
    ["Email already registered", "Email này đã được đăng ký."],
    ["Authentication required", "Bạn cần đăng nhập để tiếp tục."],
    ["Access token has expired", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."],
    ["Invalid access token", "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại."],
    ["Refresh token required", "Không tìm thấy phiên làm việc để làm mới đăng nhập."],
    ["Refresh token not found", "Phiên đăng nhập không còn hiệu lực."],
    ["Refresh token has expired", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."],
    ["Invalid refresh token", "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại."],
    ["User not found", "Không tìm thấy người dùng."],
    ["Workspace not found", "Không tìm thấy workspace."],
    ["You are not a member of this workspace", "Bạn không thuộc workspace này."],
    ["You are not a member of this project", "Bạn không có quyền truy cập dự án này."],
    ["Only project admin can manage project members", "Chỉ admin dự án mới có thể quản lý thành viên dự án."],
    ["This action requires MEMBER project role", "Bạn cần là thành viên dự án để thực hiện thao tác này."],
    ["This action requires ADMIN project role", "Bạn cần là admin dự án để thực hiện thao tác này."],
    ["This action requires GUEST project role", "Bạn không có quyền truy cập dự án này."],
    ["User is already a member of this workspace", "Người dùng này đã là thành viên của workspace."],
    ["Cannot assign OWNER role from this endpoint", "Không thể gán vai trò Admin từ màn hình này."],
    ["Cannot change this member role", "Không thể thay đổi vai trò của thành viên này."],
    ["Cannot remove workspace owner", "Không thể xóa quản trị viên của workspace."],
    ["Cannot remove yourself from workspace", "Bạn không thể tự xóa chính mình khỏi workspace này."],
    ["Member not found", "Không tìm thấy thành viên."],
    ["A pending invitation already exists for this email", "Đã có lời mời đang chờ xử lý cho email này."],
  ]

  const matched = mappings.find(([source]) => message.includes(source))
  return matched?.[1] ?? fallback
}
