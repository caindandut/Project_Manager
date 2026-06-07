import nodemailer from 'nodemailer';
import { config, prisma } from '../../config';
import { logger } from './logger';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface EmailTransportConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  googleClientId: string;
  googleClientSecret: string;
  gmailRefreshToken: string;
}

const SMTP_SETTING_KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'] as const;
const GOOGLE_MAIL_SETTING_KEYS = ['google_client_id', 'google_client_secret', 'gmail_refresh_token'] as const;
const EMAIL_SETTING_KEYS = [...SMTP_SETTING_KEYS, ...GOOGLE_MAIL_SETTING_KEYS] as const;

let missingEmailConfigWarningKey: string | null = null;

const trimValue = (value: string | undefined | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const parsePort = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getDbEmailSettings = async (): Promise<Partial<Record<(typeof EMAIL_SETTING_KEYS)[number], string>>> => {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: [...EMAIL_SETTING_KEYS] } },
      select: { key: true, value: true },
    });

    return settings.reduce<Partial<Record<(typeof EMAIL_SETTING_KEYS)[number], string>>>(
      (acc, setting) => {
        if (EMAIL_SETTING_KEYS.includes(setting.key as (typeof EMAIL_SETTING_KEYS)[number])) {
          acc[setting.key as (typeof EMAIL_SETTING_KEYS)[number]] = setting.value;
        }
        return acc;
      },
      {},
    );
  } catch (error) {
    logger.warn('Could not load email settings from database; falling back to environment variables.', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {};
  }
};

const resolveEmailTransportConfig = async (): Promise<EmailTransportConfig> => {
  const dbSettings = await getDbEmailSettings();
  const user = trimValue(dbSettings.smtp_user) || trimValue(process.env.EMAIL_USER) || '';
  const pass = trimValue(dbSettings.smtp_pass) || trimValue(process.env.EMAIL_PASS) || '';
  const from =
    trimValue(dbSettings.smtp_from) ||
    trimValue(process.env.EMAIL_FROM) ||
    user;
  const port = parsePort(trimValue(dbSettings.smtp_port), config.EMAIL_PORT || 587);

  return {
    host: trimValue(dbSettings.smtp_host) || config.EMAIL_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    user,
    pass,
    from,
    googleClientId:
      trimValue(dbSettings.google_client_id) ||
      trimValue(process.env.GMAIL_CLIENT_ID) ||
      trimValue(process.env.GOOGLE_CLIENT_ID) ||
      '',
    googleClientSecret:
      trimValue(dbSettings.google_client_secret) ||
      trimValue(process.env.GMAIL_CLIENT_SECRET) ||
      trimValue(process.env.GOOGLE_CLIENT_SECRET) ||
      '',
    gmailRefreshToken:
      trimValue(dbSettings.gmail_refresh_token) ||
      trimValue(process.env.GMAIL_REFRESH_TOKEN) ||
      '',
  };
};

const canUseGmailApi = (emailConfig: EmailTransportConfig): boolean => {
  return Boolean(
    emailConfig.googleClientId &&
    emailConfig.googleClientSecret &&
    emailConfig.gmailRefreshToken,
  );
};

const validateSmtpConfig = (emailConfig: EmailTransportConfig): void => {
  const missingKeys = [
    !emailConfig.user ? 'smtp_user/EMAIL_USER' : null,
    !emailConfig.pass ? 'smtp_pass/EMAIL_PASS' : null,
    !emailConfig.from ? 'smtp_from/EMAIL_FROM' : null,
  ].filter((key): key is string => Boolean(key));

  if (missingKeys.length === 0) return;

  const warningKey = missingKeys.join(',');
  if (missingEmailConfigWarningKey !== warningKey) {
    missingEmailConfigWarningKey = warningKey;
    logger.error('Email SMTP is not configured completely.', {
      missing: missingKeys,
      host: emailConfig.host,
      port: emailConfig.port,
    });
  }

  throw new Error(`Email SMTP is not configured. Missing: ${missingKeys.join(', ')}`);
};

const validateGmailApiConfig = (emailConfig: EmailTransportConfig): void => {
  const missingKeys = [
    !emailConfig.googleClientId ? 'google_client_id/GMAIL_CLIENT_ID/GOOGLE_CLIENT_ID' : null,
    !emailConfig.googleClientSecret ? 'google_client_secret/GMAIL_CLIENT_SECRET/GOOGLE_CLIENT_SECRET' : null,
    !emailConfig.gmailRefreshToken ? 'gmail_refresh_token/GMAIL_REFRESH_TOKEN' : null,
    !emailConfig.from ? 'smtp_from/EMAIL_FROM/smtp_user/EMAIL_USER' : null,
  ].filter((key): key is string => Boolean(key));

  if (missingKeys.length === 0) return;

  throw new Error(`Gmail API is not configured. Missing: ${missingKeys.join(', ')}`);
};

const createSmtpTransport = (emailConfig: EmailTransportConfig) => {
  return nodemailer.createTransport({
    pool: true,
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: {
      user: emailConfig.user,
      pass: emailConfig.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const encodeMimeHeader = (value: string): string => {
  return /[^\x20-\x7e]/.test(value)
    ? `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
    : value;
};

const encodeBase64Url = (value: string): string => {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const buildRawEmail = (options: SendEmailOptions, from: string): string => {
  const raw = [
    `From: ${from}`,
    `To: ${options.to}`,
    `Subject: ${encodeMimeHeader(options.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    options.html,
  ].join('\r\n');

  return encodeBase64Url(raw);
};

const getGmailAccessToken = async (emailConfig: EmailTransportConfig): Promise<string> => {
  validateGmailApiConfig(emailConfig);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: emailConfig.googleClientId,
      client_secret: emailConfig.googleClientSecret,
      refresh_token: emailConfig.gmailRefreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json() as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `Google OAuth token request failed with ${response.status}`);
  }

  return data.access_token;
};

const sendEmailViaGmailApi = async (
  options: SendEmailOptions,
  emailConfig: EmailTransportConfig,
): Promise<void> => {
  const accessToken = await getGmailAccessToken(emailConfig);
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: buildRawEmail(options, emailConfig.from) }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Gmail API send failed with ${response.status}: ${responseText}`);
  }
};

const verifyGmailApi = async (emailConfig: EmailTransportConfig): Promise<void> => {
  await getGmailAccessToken(emailConfig);
};

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
  const acceptUrl = options.isExistingUser ? options.acceptUrl : options.registerUrl;

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
            <a href="${acceptUrl}" style="display: inline-block; min-width: 128px; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 10px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.2), 0 2px 4px -1px rgba(22, 163, 74, 0.1);">
              Chấp nhận
            </a>
            <a href="${options.declineUrl}" style="display: inline-block; min-width: 128px; margin-left: 12px; background-color: #ffffff; color: #dc2626; text-decoration: none; padding: 11px 22px; border-radius: 10px; font-size: 14px; font-weight: 700; border: 1px solid #fecaca;">
              Từ chối
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 13px; line-height: 1.5; text-align: center; margin-top: 24px;">
            ${options.isExistingUser
              ? 'Bạn có thể chấp nhận hoặc từ chối lời mời này trong hệ thống.'
              : 'Nếu chấp nhận, bạn sẽ được chuyển đến trang đăng ký và tham gia workspace này sau khi hoàn tất tài khoản.'}
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
  taskUrl?: string;
}): Promise<void> {
  const taskUrl = options.taskUrl || config.CLIENT_URL;
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
            <a href="${taskUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1); transition: background-color 0.2s;">
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
  const emailConfig = await resolveEmailTransportConfig();

  if (canUseGmailApi(emailConfig)) {
    try {
      await sendEmailViaGmailApi(options, emailConfig);
      logger.info(`Email sent via Gmail API to ${options.to}`, {
        from: emailConfig.from,
      });
      return;
    } catch (error) {
      logger.error(`Failed to send email via Gmail API to ${options.to}`, {
        from: emailConfig.from,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  validateSmtpConfig(emailConfig);

  try {
    const transporter = createSmtpTransport(emailConfig);
    await transporter.sendMail({
      from: emailConfig.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    logger.info(`Email sent via Google SMTP to ${options.to}`, {
      host: emailConfig.host,
      port: emailConfig.port,
      from: emailConfig.from,
    });
  } catch (error) {
    logger.error(`Failed to send email via Google SMTP to ${options.to}`, {
      host: emailConfig.host,
      port: emailConfig.port,
      from: emailConfig.from,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function verifyEmailTransport(): Promise<void> {
  const emailConfig = await resolveEmailTransportConfig();

  if (canUseGmailApi(emailConfig)) {
    try {
      await verifyGmailApi(emailConfig);
      logger.info('Email transport verified successfully via Gmail API.', {
        from: emailConfig.from,
      });
    } catch (error) {
      logger.error('Email transport verification failed via Gmail API.', {
        from: emailConfig.from,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  try {
    validateSmtpConfig(emailConfig);
  } catch (error) {
    logger.warn('Email transport verification skipped because SMTP configuration is incomplete.', {
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  try {
    const transporter = createSmtpTransport(emailConfig);
    await transporter.verify();
    logger.info('Email transport verified successfully via Google SMTP.', {
      host: emailConfig.host,
      port: emailConfig.port,
      from: emailConfig.from,
    });
  } catch (error) {
    logger.error('Email transport verification failed via Google SMTP.', {
      host: emailConfig.host,
      port: emailConfig.port,
      from: emailConfig.from,
      error: error instanceof Error ? error.message : String(error),
    });
  }
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
