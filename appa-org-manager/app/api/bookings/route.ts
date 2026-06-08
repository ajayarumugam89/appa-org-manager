import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';
import { randomAppaMessage } from '@/app/lib/appaMessages';

export const dynamic = 'force-dynamic';

// GET /api/bookings — list bookings (used for polling the calendar).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    orderBy: { startTime: 'asc' },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ bookings });
}

// POST /api/bookings — create a booking. Overlaps are allowed but flagged.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { title?: string; startTime?: string; endTime?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const title = (body.title ?? '').trim();
  const start = new Date(body.startTime ?? '');
  const end = new Date(body.endTime ?? '');

  if (!title) {
    return NextResponse.json({ error: 'A demo purpose is required.' }, { status: 400 });
  }
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Invalid start or end time.' }, { status: 400 });
  }
  if (end <= start) {
    return NextResponse.json({ error: 'End time must be after start time.' }, { status: 400 });
  }

  // Detect overlapping bookings (allowed, but warn the user).
  const overlapping = await prisma.booking.findMany({
    where: { startTime: { lt: end }, endTime: { gt: start } },
    include: { user: { select: { name: true } } },
  });

  const booking = await prisma.booking.create({
    data: { title, startTime: start, endTime: end, userId: user.id },
    include: { user: { select: { id: true, name: true } } },
  });

  const warning =
    overlapping.length > 0
      ? `⚠️ Heads up — Appa is already booked at this time by ${[
          ...new Set(overlapping.map((b) => b.user.name)),
        ].join(', ')}. Coordinate in chat!`
      : null;

  return NextResponse.json({
    booking,
    message: randomAppaMessage(),
    warning,
  });
}
