'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';
import { DEFAULT_PASSWORD } from '@/app/lib/constants';

export interface AdminState {
  error?: string;
  success?: string;
}

// Derive `firstname.lastname` from a full name (first + last token, lowercased).
function deriveUsername(name: string): string {
  const parts = name.trim().toLowerCase().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? '';
  return `${parts[0]}.${parts[parts.length - 1]}`;
}

export async function createUser(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized.' };
  }

  const name = String(formData.get('name') ?? '').trim();
  if (!name || name.split(/\s+/).length < 2) {
    return { error: 'Please enter a full name (first and last).' };
  }

  const username = deriveUsername(name);
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { error: `User "${username}" already exists.` };
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await prisma.user.create({
    data: { name, username, passwordHash, role: 'USER', isFirstLogin: true },
  });

  revalidatePath('/admin');
  return {
    success: `Added ${name} (${username}). Default password: ${DEFAULT_PASSWORD}`,
  };
}

export async function initiateReset(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { error: 'Not authorized.' };
  }

  const userId = String(formData.get('userId') ?? '');
  if (!userId) return { error: 'Missing user.' };
  if (userId === admin.id) {
    return { error: "Use the password page to change your own password." };
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, isFirstLogin: true },
  });

  revalidatePath('/admin');
  return {
    success: `Reset ${user.name} to the default password. They'll set a new one on next login.`,
  };
}
