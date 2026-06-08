import { SignJWT, jwtVerify } from 'jose';
import { SESSION_MAX_AGE_DAYS } from '@/app/lib/constants';

// Edge-safe JWT encode/decode (jose only — no next/headers, no Prisma, no
// `server-only`) so it can be imported from both Server Actions and proxy.ts.

export type SessionRole = 'ADMIN' | 'USER';

export interface SessionPayload {
  userId: string;
  role: SessionRole;
  isFirstLogin: boolean;
  [key: string]: unknown;
}

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET);

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_DAYS}d`)
    .sign(encodedKey);
}

export async function decrypt(
  session: string | undefined,
): Promise<SessionPayload | null> {
  if (!session) return null;
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
