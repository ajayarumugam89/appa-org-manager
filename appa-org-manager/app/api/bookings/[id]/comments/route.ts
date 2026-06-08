import { NextResponse } from 'next/server';
import leoProfanity from 'leo-profanity';
import { prisma } from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/bookings/[id]/comments — comments on a booking (oldest first).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const comments = await prisma.comment.findMany({
    where: { bookingId: id },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ comments });
}

// POST /api/bookings/[id]/comments — add a comment (profanity-filtered).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const text = (body.body ?? '').trim();
  if (!text) {
    return NextResponse.json({ error: 'Comment is empty.' }, { status: 400 });
  }
  if (text.length > 1000) {
    return NextResponse.json(
      { error: 'Comment is too long (max 1000 chars).' },
      { status: 400 },
    );
  }
  if (leoProfanity.check(text)) {
    return NextResponse.json(
      { error: "🙊 Keep it clean — Appa's watching." },
      { status: 422 },
    );
  }

  // Ensure the booking exists before commenting.
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: { body: text, bookingId: id, userId: user.id },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ comment });
}
