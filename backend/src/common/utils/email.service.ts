import nodemailer from 'nodemailer';
import { config } from '../../config';

const transporter = nodemailer.createTransport({
  host: config.EMAIL_HOST,
  port: config.EMAIL_PORT,
  secure: false,
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASS,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendWorkspaceInvitationEmail(options: {
  to: string;
  workspaceName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
  declineUrl: string;
  registerUrl: string;
  isExistingUser: boolean;
}): Promise<void> {
  const primaryUrl = options.isExistingUser ? options.acceptUrl : options.registerUrl;
  const primaryLabel = options.isExistingUser ? 'Xem chi tiết lời mời' : 'Đăng ký & tham gia';

  const html = `
    <div style="background-color: #f3f4f6; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; min-height: 100%;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
        <!-- Brand Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
          <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 8px 16px; margin-bottom: 12px;">
            <span style="color: #ffffff; font-weight: 700; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">PROJECT MANAGER</span>
          </div>
          <h2 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; line-height: 1.3;">Lời mời tham gia Workspace</h2>
        </div>

        <!-- Content Body -->
        <div style="padding: 32px 24px;">
          <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">Xin chào,</p>
          
          <!-- Invitation Card -->
          <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px; border: 1px solid #e5e7eb;">
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
              <strong>${options.inviterName}</strong> đã mời bạn tham gia vào không gian làm việc
            </p>
            <h3 style="color: #111827; font-size: 22px; font-weight: 800; margin: 0 0 12px 0;">${options.workspaceName}</h3>
            <div style="display: inline-block; background-color: #e0e7ff; color: #4f46e5; font-size: 13px; font-weight: 600; padding: 6px 16px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
              Vai trò: ${options.role}
            </div>
          </div>

          <!-- CTA Buttons -->
          <div style="text-align: center; margin: 32px 0 16px 0;">
            <a href="${primaryUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1); transition: background-color 0.2s;">
              ${primaryLabel}
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 13px; line-height: 1.5; text-align: center; margin-top: 24px;">
            Bạn có thể chấp nhận hoặc từ chối lời mời này sau khi truy cập vào hệ thống.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px; text-align: center;">
          <p style="color: #9ca3af; font-size: 11px; margin: 0;">
            &copy; ${new Date().getFullYear()} Project Manager. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to: options.to,
    subject: `Lời mời tham gia workspace ${options.workspaceName}`,
    html,
  });
}

export async function sendNotificationEmail(options: {
  to: string;
  userName: string;
  subject: string;
  message: string;
  taskTitle: string;
  taskId: number;
}): Promise<void> {
  const html = `
    <div style="background-color: #f3f4f6; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; min-height: 100%;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
        <!-- Brand Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
          <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 8px 16px; margin-bottom: 12px;">
            <span style="color: #ffffff; font-weight: 700; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">PROJECT MANAGER</span>
          </div>
          <h2 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; line-height: 1.3;">Thông báo hệ thống</h2>
        </div>

        <!-- Content Body -->
        <div style="padding: 32px 24px;">
          <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">Xin chào ${options.userName},</p>
          
          <!-- Alert Message Box -->
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #1e3a8a; font-size: 15px; font-weight: 700; margin: 0 0 8px 0;">
              🔔 ${options.subject}
            </p>
            <p style="color: #1e40af; font-size: 14px; line-height: 1.6; margin: 0;">
              ${options.message}
            </p>
          </div>

          <!-- Task Details Box -->
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
            <span style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">Công việc liên quan:</span>
            <strong style="color: #111827; font-size: 16px; font-weight: 700; display: block; margin-bottom: 4px;">${options.taskTitle}</strong>
            <span style="color: #9ca3af; font-size: 12px; display: block;">Mã số công việc: #${options.taskId}</span>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0 16px 0;">
            <a href="${config.CLIENT_URL}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1); transition: background-color 0.2s;">
              Đi đến ứng dụng
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px; text-align: center;">
          <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin: 0 0 8px 0;">
            Bạn nhận được thư này vì bạn đã bật thông báo qua email trong cài đặt tài khoản Project Manager.
          </p>
          <p style="color: #9ca3af; font-size: 11px; margin: 0;">
            &copy; ${new Date().getFullYear()} Project Manager. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to: options.to,
    subject: '[PM] ' + options.subject,
    html,
  });
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  await transporter.sendMail({
    from: config.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

export async function sendOTPEmail(to: string, code: string): Promise<void> {
  const html = `
    <div style="background-color: #f3f4f6; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; min-height: 100%;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
        <!-- Brand Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
          <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 8px 16px; margin-bottom: 12px;">
            <span style="color: #ffffff; font-weight: 700; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">PROJECT MANAGER</span>
          </div>
          <h2 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; line-height: 1.3;">Xác minh tài khoản</h2>
        </div>

        <!-- Content Body -->
        <div style="padding: 32px 24px; text-align: center;">
          <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Mã xác minh đăng ký tài khoản</p>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0;">
            Vui lòng sử dụng mã xác minh dưới đây để hoàn tất quá trình đăng ký tài khoản của bạn trên hệ thống Project Manager.
          </p>

          <!-- OTP Display -->
          <div style="background-color: #f9fafb; border: 2px dashed #4f46e5; border-radius: 12px; padding: 20px 24px; display: inline-block; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111827; font-family: Courier, monospace;">${code}</span>
          </div>

          <p style="color: #ef4444; font-size: 13px; font-weight: 600; margin: 0 0 16px 0;">
            Mã này có hiệu lực trong vòng 5 phút
          </p>
          <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
            Không chia sẻ mã xác minh này với bất kỳ ai để đảm bảo an toàn cho tài khoản của bạn.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px; text-align: center;">
          <p style="color: #9ca3af; font-size: 11px; margin: 0;">
            &copy; ${new Date().getFullYear()} Project Manager. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to,
    subject: 'Mã xác minh đăng ký Project Manager',
    html,
  });
}
