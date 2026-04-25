import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;

  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REFRESH_TOKEN_SECRET: string;
  REFRESH_TOKEN_EXPIRES_IN: string;

  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;

  UPLOAD_DIR: string;
  MAX_FILE_SIZE: number;

  CLIENT_URL: string;

  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
}

const IS_PROD = process.env.NODE_ENV === 'production';

const validateRequired = (name: string, value: string | undefined, fallback: string): string => {
  if (value && value.trim() !== '') return value;
  if (!IS_PROD) return fallback;
  throw new Error(`${name} environment variable is required in production`);
};

const config: EnvConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: validateRequired('DATABASE_URL', process.env.DATABASE_URL, 'mysql://root:password@localhost:3306/pm_tool'),

  JWT_SECRET: validateRequired('JWT_SECRET', process.env.JWT_SECRET, 'dev-only-jwt-secret'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  REFRESH_TOKEN_SECRET: validateRequired(
    'REFRESH_TOKEN_SECRET',
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET,
    'dev-only-refresh-secret',
  ),
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL ||
    `http://localhost:${process.env.PORT || '3000'}/api/v1/auth/google/callback`,

  UPLOAD_DIR: path.resolve(__dirname, '../../uploads'),
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),

  CLIENT_URL: process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
};

export default config;
