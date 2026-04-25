import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';

export interface GoogleUserPayload {
  sub: string;       // Google user ID
  email: string;
  name?: string;
  picture?: string;
}

const oauth2Client = new OAuth2Client({
  clientId: config.GOOGLE_CLIENT_ID,
  clientSecret: config.GOOGLE_CLIENT_SECRET,
  redirectUri: config.GOOGLE_CALLBACK_URL,
});

export function getGoogleAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['openid', 'email', 'profile'],
  });
}

export async function verifyIdToken(idToken: string): Promise<GoogleUserPayload> {
  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: config.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Invalid Google ID token payload');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch {
    throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Invalid or expired Google ID token');
  }
}

export { oauth2Client };
