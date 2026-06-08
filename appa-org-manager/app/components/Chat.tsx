'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MENTION_REGEX } from '@/app/lib/mentions';

export interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string };
}

export interface MentionUser {
  id: string;
  name: string;
  username: string;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function Chat({
  currentUserId,
  messages,
  users,
  onSend,
}: {
  currentUserId: string;
  messages: ChatMessage[];
  users: MentionUser[];
  onSend: (text: string) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Autocomplete state.
  const [acOpen, setAcOpen] = useState(false);
  const [acQuery, setAcQuery] = useState('');
  const [acIndex, setAcIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const atBottomRef = useRef(true);

  const myUsername = useMemo(
    () => users.find((u) => u.id === currentUserId)?.username,
    [users, currentUserId],
  );
  const validUsernames = useMemo(
    () => new Set(users.map((u) => u.username.toLowerCase())),
    [users],
  );

  const acMatches = useMemo(() => {
    if (!acOpen) return [];
    const q = acQuery.toLowerCase();
    return users
      .filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.name.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [acOpen, acQuery, users]);

  // Auto-scroll to bottom on new messages if already near the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }

  // Detect the @mention token immediately before the caret to drive autocomplete.
  function refreshAutocomplete(value: string, caret: number) {
    const before = value.slice(0, caret);
    const m = before.match(/(?:^|\s)@([\w.]*)$/);
    if (m) {
      setAcOpen(true);
      setAcQuery(m[1]);
      setAcIndex(0);
    } else {
      setAcOpen(false);
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setDraft(value);
    refreshAutocomplete(value, e.target.selectionStart ?? value.length);
  }

  function applyMention(user: MentionUser) {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? draft.length;
    const before = draft.slice(0, caret);
    const after = draft.slice(caret);
    // Replace the trailing @token with @username + space.
    const replaced = before.replace(/@([\w.]*)$/, `@${user.username} `);
    const next = replaced + after;
    setDraft(next);
    setAcOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = replaced.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (acOpen && acMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAcIndex((i) => (i + 1) % acMatches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAcIndex((i) => (i - 1 + acMatches.length) % acMatches.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyMention(acMatches[acIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setAcOpen(false);
        return;
      }
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    const err = await onSend(text);
    setSending(false);
    if (err) {
      setError(err);
      return;
    }
    setDraft('');
    setAcOpen(false);
    atBottomRef.current = true;
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-lg font-medium text-zinc-100">Team chat</h2>
        <p className="text-xs text-zinc-500">
          Coordinate bookings & org changes. Use @name to ping someone. 🙊
        </p>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            No messages yet. Say hi to the family 👋
          </p>
        )}
        {messages.map((m) => {
          const mine = m.user.id === currentUserId;
          return (
            <div
              key={m.id}
              className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
            >
              <div className="mb-0.5 text-xs text-zinc-500">
                {mine ? 'You' : m.user.name} · {timeLabel(m.createdAt)}
              </div>
              <div
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                  mine ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-100'
                }`}
              >
                {renderBody(m.body, validUsernames, myUsername)}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="relative border-t border-zinc-800 p-3">
        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

        {/* Mention autocomplete */}
        {acOpen && acMatches.length > 0 && (
          <div className="absolute bottom-full left-3 mb-1 w-64 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
            {acMatches.map((u, i) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyMention(u);
                }}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  i === acIndex ? 'bg-indigo-600 text-white' : 'text-zinc-200'
                }`}
              >
                <span className="font-medium">{u.name}</span>{' '}
                <span className="text-xs opacity-70">@{u.username}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Message the team… (try @)"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

// Render a message body, highlighting valid @mentions. Mentions of the current
// user get a stronger highlight.
function renderBody(
  body: string,
  validUsernames: Set<string>,
  myUsername: string | undefined,
): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of body.matchAll(MENTION_REGEX)) {
    const username = match[1].toLowerCase();
    const start = match.index ?? 0;
    if (!validUsernames.has(username)) continue;

    if (start > lastIndex) parts.push(body.slice(lastIndex, start));
    const isMe = username === myUsername;
    parts.push(
      <span
        key={key++}
        className={
          isMe
            ? 'rounded bg-amber-400/30 px-1 font-medium text-amber-200'
            : 'rounded bg-indigo-400/20 px-1 font-medium text-indigo-200'
        }
      >
        {match[0]}
      </span>,
    );
    lastIndex = start + match[0].length;
  }
  if (lastIndex < body.length) parts.push(body.slice(lastIndex));
  return parts;
}
