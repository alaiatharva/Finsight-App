import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function GET(req: NextRequest) {
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

    // Fetch last 30 days of transactions for context
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await prisma.transaction.findMany({
      where: { 
        userId: dbUser.id,
        date: { gte: thirtyDaysAgo }
      },
      select: { amount: true, type: true, category: true, merchant: true, date: true }
    });

    if (transactions.length === 0) {
      return NextResponse.json({ insight: "Not enough recent data to generate AI insights." });
    }

    // Prepare prompt
    const prompt = `
      You are a financial AI advisor. Analyze these transactions from the last 30 days and provide one short, actionable insight (max 2 sentences) to help the user save money or identify a trend.
      
      Transactions:
      ${JSON.stringify(transactions)}
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ insight: text });
  } catch (error) {
    console.error("[INSIGHTS_GET]", error);
    // Graceful fallback if AI fails
    return NextResponse.json({ insight: "Keep an eye on your spending! Tracking your expenses regularly helps build better financial habits." });
  }
}
