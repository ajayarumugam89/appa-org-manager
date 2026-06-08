'use client';

import { useCallback, useEffect, useState } from 'react';

interface Booking {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  user: { id: string; name: string };
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string };
}

function dateTimeLabel(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

// Format a Date into the value a <input type="datetime-local"> expects.
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function Calendar({ currentUserId }: { currentUserId: string }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dialogDay, setDialogDay] = useState<Date | null>(null);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; warning: string | null } | null>(
    null,
  );

  // Booking detail + comments thread.
  const [detail, setDetail] = useState<Booking | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [postingComment, setPostingComment] = useState(false);

  const loadComments = useCallback(async (bookingId: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/comments`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  function openDetail(booking: Booking) {
    setDetail(booking);
    setComments([]);
    setCommentDraft('');
    setCommentError(null);
    loadComments(booking.id);
  }

  async function postComment() {
    if (!detail) return;
    const text = commentDraft.trim();
    if (!text || postingComment) return;
    setPostingComment(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/bookings/${detail.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCommentError(data.error ?? 'Could not post comment.');
        return;
      }
      setCommentDraft('');
      loadComments(detail.id);
    } catch {
      setCommentError('Network error. Try again.');
    } finally {
      setPostingComment(false);
    }
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/bookings', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setBookings(data.bookings ?? []);
    } catch {
      /* polling: ignore transient errors */
    }
  }, []);

  // Poll every 3s for cross-user updates.
  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [load]);

  // Auto-dismiss the success/warning toast.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // Build the 6x7 grid of dates (including leading/trailing blanks).
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const bookingsByDay = bookings.reduce<Record<string, Booking[]>>((acc, b) => {
    const key = ymd(new Date(b.startTime));
    (acc[key] ??= []).push(b);
    return acc;
  }, {});

  function openDialog(day: Date) {
    const start = new Date(day);
    start.setHours(10, 0, 0, 0);
    const end = new Date(day);
    end.setHours(11, 0, 0, 0);
    setTitle('');
    setStartTime(toLocalInput(start));
    setEndTime(toLocalInput(end));
    setError(null);
    setDialogDay(day);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not create booking.');
        return;
      }
      setDialogDay(null);
      setToast({ msg: data.message, warning: data.warning });
      load();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const monthName = month.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-zinc-100">{monthName}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}
            className="rounded-md border border-zinc-700 px-2 py-1 text-sm text-zinc-300 hover:border-indigo-500"
          >
            ←
          </button>
          <button
            onClick={() => {
              const now = new Date();
              setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
            }}
            className="rounded-md border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:border-indigo-500"
          >
            Today
          </button>
          <button
            onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}
            className="rounded-md border border-zinc-700 px-2 py-1 text-sm text-zinc-300 hover:border-indigo-500"
          >
            →
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="min-h-24 rounded-md" />;
          const key = ymd(day);
          const dayBookings = bookingsByDay[key] ?? [];
          const isToday = ymd(new Date()) === key;
          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => openDialog(day)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openDialog(day);
              }}
              className={`min-h-24 cursor-pointer rounded-md border p-1 text-left transition hover:border-indigo-500 ${
                isToday
                  ? 'border-indigo-500/60 bg-indigo-500/5'
                  : 'border-zinc-800 bg-zinc-950/40'
              }`}
            >
              <div className="mb-1 text-xs font-medium text-zinc-400">
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayBookings.slice(0, 3).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    title={`${b.title} — ${b.user.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetail(b);
                    }}
                    className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] transition hover:ring-1 hover:ring-indigo-400 ${
                      b.user.id === currentUserId
                        ? 'bg-indigo-600/30 text-indigo-200'
                        : 'bg-zinc-700/40 text-zinc-300'
                    }`}
                  >
                    {timeLabel(b.startTime)} {b.title}
                  </button>
                ))}
                {dayBookings.length > 3 && (
                  <div className="text-[10px] text-zinc-500">
                    +{dayBookings.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking dialog */}
      {dialogDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDialogDay(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-medium text-zinc-100">
              Book Appa org
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  What are you demoing / changing?
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Customer X demo, flow rebuild…"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-sm text-zinc-400">
                    Start
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-sm text-zinc-400">End</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setDialogDay(null)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  {submitting ? 'Booking…' : 'Book Appa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking detail + comments */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-zinc-800 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-medium text-zinc-100">
                  {detail.title}
                </h3>
                <button
                  onClick={() => setDetail(null)}
                  className="text-zinc-500 hover:text-zinc-300"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <p className="mt-1 text-sm text-zinc-400">
                {dateTimeLabel(detail.startTime)} – {timeLabel(detail.endTime)}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Booked by {detail.user.id === currentUserId ? 'you' : detail.user.name}
              </p>
            </div>

            {/* Comments thread */}
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Comments
              </h4>
              {comments.length === 0 && (
                <p className="text-sm text-zinc-500">
                  No comments yet. Add notes about this booking.
                </p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-zinc-800/60 p-3">
                  <div className="mb-0.5 text-xs text-zinc-500">
                    {c.user.id === currentUserId ? 'You' : c.user.name} ·{' '}
                    {dateTimeLabel(c.createdAt)}
                  </div>
                  <div className="whitespace-pre-wrap break-words text-sm text-zinc-100">
                    {c.body}
                  </div>
                </div>
              ))}
            </div>

            {/* Add comment */}
            <div className="border-t border-zinc-800 p-4">
              {commentError && (
                <p className="mb-2 text-sm text-red-400">{commentError}</p>
              )}
              <div className="flex gap-2">
                <input
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      postComment();
                    }
                  }}
                  placeholder="Add a comment…"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500"
                />
                <button
                  onClick={postComment}
                  disabled={postingComment || !commentDraft.trim()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-indigo-500/40 bg-zinc-900 p-4 shadow-xl">
          <p className="text-sm text-zinc-100">{toast.msg}</p>
          {toast.warning && (
            <p className="mt-2 text-sm text-amber-400">{toast.warning}</p>
          )}
        </div>
      )}
    </div>
  );
}
