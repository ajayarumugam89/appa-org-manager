import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/notifications — current user's recent mention notifications.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { message: { select: { body: true } } },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  return NextResponse.json({ notifications, unreadCount });
}

// PATCH /api/notifications — mark notifications read (all, or specific ids).
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { ids?: string[]; all?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    /* empty body == mark all */
  }

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      read: false,
      ...(body.all || !body.ids ? {} : { id: { in: body.ids } }),
    },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
