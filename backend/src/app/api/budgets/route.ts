import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { NextRequest } from 'next/server';

const createBudgetSchema = z.object({
  name: z.string().min(1),
  limit: z.number().min(0.01),
  category: z.string().optional(),
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

    const budgets = await prisma.budget.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(budgets);
  } catch (error) {
    console.error("[BUDGETS_GET]", error);
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
    const validatedData = createBudgetSchema.safeParse(body);

    if (!validatedData.success) {
      return new NextResponse(validatedData.error.message, { status: 400 });
    }

    // Optional: Calculate current usage based on existing transactions in the current month for the specified category
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let currentUsage = 0;
    if (validatedData.data.category) {
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: dbUser.id,
          category: validatedData.data.category,
          type: 'expense',
          date: { gte: startOfMonth }
        }
      });
      currentUsage = transactions.reduce((acc, curr) => acc + curr.amount, 0);
    }

    const budget = await prisma.budget.create({
      data: {
        ...validatedData.data,
        currentUsage,
        userId: dbUser.id,
      }
    });

    return NextResponse.json(budget);
  } catch (error) {
    console.error("[BUDGETS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
