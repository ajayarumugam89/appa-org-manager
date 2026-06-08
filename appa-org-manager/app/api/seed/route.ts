import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';
import { DEFAULT_PASSWORD } from '@/app/lib/constants';

export async function GET() {
  try {
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const users = [
      { name: 'Ajay Arumugam', role: 'ADMIN' },
      { name: 'Aashish Nashte', role: 'USER' },
      { name: 'Aswin Sundaresan', role: 'USER' },
      { name: 'Poorvi Malaviya', role: 'USER' },
      { name: 'Ritesh Sharma', role: 'USER' },
      { name: 'Samvit Khadilkar', role: 'USER' },
      { name: 'Shailja Sharma', role: 'USER' },
      { name: 'Vishnu Sudheesh', role: 'USER' },
      { name: 'Apurva Joshi', role: 'USER' },
      { name: 'Deepesh Variyani', role: 'USER' },
      { name: 'Neha Rajoria', role: 'USER' },
      { name: 'Vignesh SF', role: 'USER' },
      { name: 'Vrinda Singla', role: 'USER' },
    ];

    let count = 0;
    for (const user of users) {
      const username = user.name.toLowerCase().replace(' ', '.');
      await prisma.user.upsert({
        where: { username },
        update: {},
        create: {
          name: user.name,
          username,
          passwordHash: hashedPassword,
          role: user.role as any,
          isFirstLogin: true,
        },
      });
      count++;
    }

    return NextResponse.json({ message: `✅ Successfully seeded ${count} users!` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}
