import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/app/lib/jwt';
import { SESSION_COOKIE } from '@/app/lib/constants';

// Route protection (Next 16 renamed middleware -> proxy). Runs on the Edge
// runtime, so it only decrypts the session JWT (jose) — no Prisma/bcrypt here.
const PUBLIC_PATHS = ['/login'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);

  // Not logged in -> only public paths allowed.
  if (!session) {
    if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Logged in but must change password -> trap on /reset-password.
  if (session.isFirstLogin && pathname !== '/reset-password') {
    return NextResponse.redirect(new URL('/reset-password', request.url));
  }

  // Already authenticated -> keep them out of /login.
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Admin-only area.
  if (pathname.startsWith('/admin') && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals, static assets, and the
  // unauthenticated machine routes (seed, cron).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/seed|api/cron|.*\\.svg$).*)',
  ],
};
