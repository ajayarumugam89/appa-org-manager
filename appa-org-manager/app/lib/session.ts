import 'server-only';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, SESSION_MAX_AGE_DAYS } from '@/app/lib/constants';
import {
  encrypt,
  decrypt,
  type SessionPayload,
  type SessionRole,
} from '@/app/lib/jwt';

// Cookie-bound session management (Node runtime). The actual JWT crypto lives in
// the edge-safe `jwt.ts` so proxy.ts can share it.

export type { SessionPayload, SessionRole };

export async function createSession(
  userId: string,
  role: SessionRole,
  isFirstLogin: boolean,
): Promise<void> {
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
  );
  const session = await encrypt({ userId, role, isFirstLogin });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decrypt(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
