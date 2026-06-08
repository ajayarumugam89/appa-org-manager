import { NextResponse } from 'next/server';
import leoProfanity from 'leo-profanity';
import { prisma } from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';
import { extractMentions } from '@/app/lib/mentions';
import { chatCutoff } from '@/app/lib/constants';

export const dynamic = 'force-dynamic';

// GET /api/messages — team-channel messages from the last 48h (oldest first).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const recent = await prisma.message.findMany({
    where: { createdAt: { gte: chatCutoff() } },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ messages: recent.reverse() });
}

// POST /api/messages — post a message; rejected if it contains profanity.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const text = (body.body ?? '').trim();
  if (!text) {
    return NextResponse.json({ error: 'Message is empty.' }, { status: 400 });
  }
  if (text.length > 1000) {
    return NextResponse.json(
      { error: 'Message is too long (max 1000 chars).' },
      { status: 400 },
    );
  }

  if (leoProfanity.check(text)) {
    return NextResponse.json(
      { error: "🙊 Keep it clean — Appa's watching." },
      { status: 422 },
    );
  }

  const message = await prisma.message.create({
    data: { body: text, userId: user.id },
    include: { user: { select: { id: true, name: true } } },
  });

  // Create @mention notifications for any valid, non-self usernames referenced.
  const mentioned = extractMentions(text);
  if (mentioned.length > 0) {
    const recipients = await prisma.user.findMany({
      where: { username: { in: mentioned }, id: { not: user.id } },
      select: { id: true },
    });
    if (recipients.length > 0) {
      await prisma.notification.createMany({
        data: recipients.map((r) => ({
          userId: r.id,
          messageId: message.id,
          actorName: user.name,
        })),
      });
    }
  }

  return NextResponse.json({ message });
}
