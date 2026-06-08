import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';
import { logout } from '@/app/actions/auth';
import Dashboard from '@/app/components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrentUser();
  // proxy.ts handles redirects, but guard here too for safety.
  if (!user) redirect('/login');
  if (user.isFirstLogin) redirect('/reset-password');

  // Used for @mention autocomplete + highlighting in chat.
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, username: true },
  });

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👨‍🦳</span>
          <div>
            <h1 className="text-lg font-semibold text-zinc-50">
              Appa Org Manager
            </h1>
            <p className="text-xs text-zinc-500">
              One org, one family, many demos.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-400 sm:inline">
            {user.name}
          </span>
          {user.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-indigo-500"
            >
              Admin
            </Link>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-red-500 hover:text-red-400"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Tabbed calendar + chat with notifications */}
      <Dashboard currentUserId={user.id} users={users} />
    </div>
  );
}
