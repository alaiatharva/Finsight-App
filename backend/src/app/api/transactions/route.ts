import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { NextRequest } from 'next/server';

const createTransactionSchema = z.object({
  amount: z.number(),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1),
  merchant: z.string().optional(),
  date: z.string(), // ISO string
  isRecurring: z.boolean().default(false),
  accountId: z.string().min(1)
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!dbUser) return NextResponse.json([]);

    const transactions = await prisma.transaction.findMany({
      where: { userId: dbUser.id },
      orderBy: { date: 'desc' },
      include: { account: true }
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("[TRANSACTIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Ensure the user exists in our database (upsert if missing)
    const dbUser = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: {
        clerkId: userId,
        email: `user_${userId}@placeholder.com`,
      }
    });

    const body = await req.json();
    const validatedData = createTransactionSchema.safeParse(body);

    if (!validatedData.success) {
      return new NextResponse(validatedData.error.message, { status: 400 });
    }

    const { amount, type, category, merchant, date, isRecurring, accountId } = validatedData.data;

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: dbUser.id }
    });

    if (!account) {
      return new NextResponse("Account not found", { status: 404 });
    }

    // Run in transaction to update account balance
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          amount,
          type,
          category,
          merchant,
          date: new Date(date),
          isRecurring,
          accountId,
          userId: dbUser.id
        }
      });

      const balanceChange = type === 'expense' ? -amount : amount;

      await tx.account.update({
        where: { id: accountId },
        data: { balance: { increment: balanceChange } }
      });

      return transaction;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[TRANSACTIONS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
