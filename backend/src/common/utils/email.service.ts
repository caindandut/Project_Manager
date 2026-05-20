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
  const primaryLabel = options.isExistingUser ? 'Xem lời mời' : 'Đăng ký và tham gia';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h1 style="color: #111827; font-size: 20px; margin: 0 0 12px 0;">Project Manager</h1>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        ${options.inviterName} đã mời bạn tham gia workspace <strong>${options.workspaceName}</strong>
        với vai trò <strong>${options.role}</strong>.
      </p>
      <div style="margin: 24px 0;">
        <a href="${primaryUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 600;">
          ${primaryLabel}
        </a>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
        Bạn có thể chấp nhận hoặc từ chối lời mời sau khi đăng nhập vào tài khoản của mình.
      </p>
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
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <div style="margin-bottom: 16px;">
        <h1 style="color: #111827; font-size: 20px; margin: 0;">Project Manager</h1>
      </div>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
        <p style="color: #111827; font-size: 15px; font-weight: 600; margin: 0 0 8px 0;">
          ${options.subject}
        </p>
        <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">
          ${options.message}
        </p>
      </div>
      <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0;">Công việc liên quan:</p>
        <p style="color: #111827; font-size: 14px; font-weight: 600; margin: 0;">${options.taskTitle}</p>
      </div>
      <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
        Bạn nhận email này vì đã bật thông báo qua email trong cài đặt Project Manager.
      </p>
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
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #1f2937; font-size: 20px; margin: 0;">Project Manager</h1>
      </div>
      
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; text-align: center;">
        <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">Mã xác minh đăng ký Project Manager</p>
        
        <div style="background-color: #ffffff; border: 2px dashed #d1d5db; border-radius: 8px; padding: 20px; margin: 16px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">${code}</span>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin: 16px 0 0 0;">
          Mã này có hiệu lực trong <strong>5 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai.
        </p>
      </div>
      
      <div style="margin-top: 24px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
        </p>
      </div>
    </div>
  `;

  await sendEmail({
    to,
    subject: 'Mã xác minh đăng ký Project Manager',
    html,
  });
}
