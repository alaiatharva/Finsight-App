import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { NextRequest } from 'next/server';

const createAccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['checking', 'savings', 'credit', 'investment']),
  balance: z.number().default(0),
  isDefault: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("[ACCOUNTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const validatedData = createAccountSchema.safeParse(body);

    if (!validatedData.success) {
      return new NextResponse(validatedData.error.message, { status: 400 });
    }

    // Make sure user exists in our DB, if not, create via webhook typically, but we can upsert here for simplicity
    await prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: {
        clerkId: userId,
        email: `user_${userId}@placeholder.com`, // Usually synced via Clerk webhooks
      }
    });

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!dbUser) {
       return new NextResponse("User sync error", { status: 400 });
    }

    // If setting as default, unset others
    if (validatedData.data.isDefault) {
      await prisma.account.updateMany({
        where: { userId: dbUser.id, isDefault: true },
        data: { isDefault: false }
      });
    }

    const account = await prisma.account.create({
      data: {
        ...validatedData.data,
        userId: dbUser.id,
      }
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error("[ACCOUNTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
