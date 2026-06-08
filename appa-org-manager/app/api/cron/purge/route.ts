import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { chatCutoff, CHAT_RETENTION_HOURS } from '@/app/lib/constants';

export const dynamic = 'force-dynamic';

// GET /api/cron/purge — hard-deletes chat messages older than the retention
// window (cascade-deletes their @mention notifications). Triggered by Vercel
// Cron. If CRON_SECRET is set, requires `Authorization: Bearer <secret>`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const result = await prisma.message.deleteMany({
    where: { createdAt: { lt: chatCutoff() } },
  });

  return NextResponse.json({
    purged: result.count,
    retentionHours: CHAT_RETENTION_HOURS,
  });
}
