'use client';

import { useActionState } from 'react';
import {
  createUser,
  initiateReset,
  type AdminState,
} from '@/app/actions/admin';

interface AdminUser {
  id: string;
  name: string;
  username: string;
  role: 'ADMIN' | 'USER';
  isFirstLogin: boolean;
}

const initial: AdminState = {};

export default function AdminPanel({ users }: { users: AdminUser[] }) {
  const [createState, createAction, creating] = useActionState(
    createUser,
    initial,
  );
  const [resetState, resetAction, resetting] = useActionState(
    initiateReset,
    initial,
  );

  return (
    <div className="space-y-8">
      {/* Add user */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-3 text-lg font-medium text-zinc-100">Add a user</h2>
        <form action={createAction} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label
              htmlFor="name"
              className="mb-1 block text-sm text-zinc-400"
            >
              Full name
            </label>
            <input
              id="name"
              name="name"
              placeholder="e.g. Priya Menon"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {creating ? 'Adding…' : 'Add user'}
          </button>
        </form>
        {createState.error && (
          <p className="mt-3 text-sm text-red-400">{createState.error}</p>
        )}
        {createState.success && (
          <p className="mt-3 text-sm text-emerald-400">{createState.success}</p>
        )}
      </section>

      {/* User list */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-3 text-lg font-medium text-zinc-100">
          Users ({users.length})
        </h2>
        {resetState.error && (
          <p className="mb-3 text-sm text-red-400">{resetState.error}</p>
        )}
        {resetState.success && (
          <p className="mb-3 text-sm text-emerald-400">{resetState.success}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-400">
              <tr className="border-b border-zinc-800">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Username</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="text-zinc-200">
              {users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-800/60">
                  <td className="py-2 pr-4">{u.name}</td>
                  <td className="py-2 pr-4 font-mono text-zinc-400">
                    {u.username}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={
                        u.role === 'ADMIN'
                          ? 'rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400'
                          : 'rounded bg-zinc-700/40 px-2 py-0.5 text-xs text-zinc-300'
                      }
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {u.isFirstLogin ? (
                      <span className="text-xs text-amber-400">
                        Pending reset
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-400">Active</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {u.role !== 'ADMIN' && (
                      <form action={resetAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <button
                          type="submit"
                          disabled={resetting}
                          className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition hover:border-red-500 hover:text-red-400 disabled:opacity-60"
                        >
                          Force reset
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
