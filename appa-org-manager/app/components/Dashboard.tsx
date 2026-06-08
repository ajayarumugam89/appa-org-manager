'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Calendar from '@/app/components/Calendar';
import Chat, { type ChatMessage, type MentionUser } from '@/app/components/Chat';

interface NotificationItem {
  id: string;
  actorName: string;
  read: boolean;
  createdAt: string;
  message: { body: string };
}

type Tab = 'calendar' | 'chat';

export default function Dashboard({
  currentUserId,
  users,
}: {
  currentUserId: string;
  users: MentionUser[];
}) {
  const [tab, setTab] = useState<Tab>('calendar');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [lastSeenChat, setLastSeenChat] = useState(() => Date.now());

  // Track which notification ids we've already surfaced as a browser
  // notification, so polling doesn't re-fire them. Seeded on first load.
  const seenNotifIds = useRef<Set<string>>(new Set());
  const notifInitialized = useRef(false);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/messages', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      /* polling: ignore transient errors */
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const items: NotificationItem[] = data.notifications ?? [];

      // Fire a browser notification for newly-arrived unread mentions.
      if (!notifInitialized.current) {
        items.forEach((n) => seenNotifIds.current.add(n.id));
        notifInitialized.current = true;
      } else {
        for (const n of items) {
          if (!n.read && !seenNotifIds.current.has(n.id)) {
            seenNotifIds.current.add(n.id);
            fireBrowserNotification(n);
          }
        }
      }
      setNotifications(items);
    } catch {
      /* polling: ignore transient errors */
    }
  }, []);

  // Poll both feeds every 3s.
  useEffect(() => {
    loadMessages();
    loadNotifications();
    const id = setInterval(() => {
      loadMessages();
      loadNotifications();
    }, 3000);
    return () => clearInterval(id);
  }, [loadMessages, loadNotifications]);

  // Ask for browser notification permission once.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // While the chat tab is open, keep marking messages as seen.
  useEffect(() => {
    if (tab === 'chat') setLastSeenChat(Date.now());
  }, [tab, messages]);

  const unreadChat = useMemo(() => {
    if (tab === 'chat') return 0;
    return messages.filter(
      (m) =>
        new Date(m.createdAt).getTime() > lastSeenChat &&
        m.user.id !== currentUserId,
    ).length;
  }, [messages, tab, lastSeenChat, currentUserId]);

  const unreadNotif = notifications.filter((n) => !n.read).length;

  async function openBell() {
    const next = !bellOpen;
    setBellOpen(next);
    if (next && unreadNotif > 0) {
      // Optimistically clear, then persist.
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ all: true }),
        });
      } catch {
        /* will reconcile on next poll */
      }
    }
  }

  async function sendMessage(text: string): Promise<string | null> {
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) return data.error ?? 'Could not send message.';
      await loadMessages();
      return null;
    } catch {
      return 'Network error. Try again.';
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 sm:px-6">
        <div className="flex gap-1">
          <TabButton active={tab === 'calendar'} onClick={() => setTab('calendar')}>
            📅 Calendar
          </TabButton>
          <TabButton active={tab === 'chat'} onClick={() => setTab('chat')}>
            💬 Chat
            {unreadChat > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                {unreadChat}
              </span>
            )}
          </TabButton>
        </div>

        {/* Notification bell */}
        <div className="relative py-2">
          <button
            onClick={openBell}
            className="relative rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-indigo-500"
            aria-label="Notifications"
          >
            🔔
            {unreadNotif > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
                {unreadNotif}
              </span>
            )}
          </button>

          {bellOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setBellOpen(false)}
              />
              <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-2 shadow-xl">
                <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Mentions
                </p>
                {notifications.length === 0 && (
                  <p className="px-2 py-3 text-sm text-zinc-500">
                    No mentions yet.
                  </p>
                )}
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setTab('chat');
                      setBellOpen(false);
                    }}
                    className="block w-full rounded-lg px-2 py-2 text-left hover:bg-zinc-800"
                  >
                    <div className="text-sm text-zinc-200">
                      <span className="font-medium text-indigo-300">
                        {n.actorName}
                      </span>{' '}
                      mentioned you
                    </div>
                    <div className="truncate text-xs text-zinc-500">
                      {n.message.body}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 p-4 sm:p-6">
        {tab === 'calendar' ? (
          <Calendar currentUserId={currentUserId} />
        ) : (
          <div className="mx-auto h-[calc(100vh-13rem)] max-w-2xl">
            <Chat
              currentUserId={currentUserId}
              messages={messages}
              users={users}
              onSend={sendMessage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px flex items-center border-b-2 px-4 py-3 text-sm font-medium transition ${
        active
          ? 'border-indigo-500 text-zinc-50'
          : 'border-transparent text-zinc-400 hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  );
}

function fireBrowserNotification(n: NotificationItem) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(`${n.actorName} mentioned you in Appa Org`, {
      body: n.message.body,
    });
  } catch {
    /* some browsers throw if constructed without a service worker; ignore */
  }
}
