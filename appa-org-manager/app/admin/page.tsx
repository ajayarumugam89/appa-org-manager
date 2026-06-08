import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';
import AdminPanel from '@/app/admin/AdminPanel';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // proxy.ts already gates /admin to ADMIN; this is defense in depth.
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      isFirstLogin: true,
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-50">User management</h1>
        <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300">
          ← Back to dashboard
        </Link>
      </div>
      <AdminPanel users={users} />
    </div>
  );
}
