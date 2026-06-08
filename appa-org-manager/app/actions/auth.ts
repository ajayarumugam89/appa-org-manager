'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { prisma } from '@/app/lib/prisma';
import {
  createSession,
  deleteSession,
  getSession,
} from '@/app/lib/session';

export interface AuthState {
  error?: string;
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = String(formData.get('username') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!username || !password) {
    return { error: 'Username and password are required.' };
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: 'Invalid username or password.' };
  }

  await createSession(user.id, user.role, user.isFirstLogin);

  if (user.isFirstLogin) redirect('/reset-password');
  redirect('/');
}

export async function changePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const session = await getSession();
  if (!session) redirect('/login');

  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }
  if (password !== confirm) {
    return { error: 'Passwords do not match.' };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash, isFirstLogin: false },
  });

  // Refresh the session so isFirstLogin is no longer set (proxy stops forcing reset).
  await createSession(session.userId, session.role, false);
  redirect('/');
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect('/login');
}
