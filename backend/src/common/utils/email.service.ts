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
