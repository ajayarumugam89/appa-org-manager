import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/session';

// Server-side helpers that resolve the logged-in user from the session cookie.
// Used by Server Components, Server Actions, and route handlers (Node runtime).

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      isFirstLogin: true,
    },
  });
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== 'ADMIN') throw new Error('Not authorized');
  return user;
}
