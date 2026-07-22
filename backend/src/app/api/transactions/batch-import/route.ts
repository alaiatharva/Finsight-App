import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { execSync } from 'child_process';

async function runBatchImport(userId: string, smsDrafts: any[]) {
  // Ensure the user exists in our database (upsert if missing)
  const dbUser = await prisma.user.upsert({
    where: { clerkId: userId },
    update: {},
    create: {
      clerkId: userId,
      email: `user_${userId}@placeholder.com`,
    }
  });

  // Process batch import within a transaction to maintain integrity
  return await prisma.$transaction(async (tx) => {
    const importedTransactions = [];

    for (const draft of smsDrafts) {
      // Create SMSImport record
      const smsImport = await tx.sMSImport.create({
        data: {
          rawSmsText: draft.rawSmsText,
          smsSender: draft.smsSender,
          parsedAmount: draft.parsedAmount,
          parsedMerchant: draft.parsedMerchant,
          parsedDate: draft.parsedDate ? new Date(draft.parsedDate) : null,
          parsedType: draft.parsedType,
          upiReference: draft.upiReference,
          parseConfidence: draft.parseConfidence,
          importStatus: draft.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING',
          userId: dbUser.id
        }
      });

      // If confidence is HIGH or user CONFIRMED it, and it has valid data, create a Transaction
      if ((draft.parseConfidence === 'HIGH' || draft.status === 'CONFIRMED') && draft.parsedAmount && draft.parsedType) {
        
        // Try to find a default account or any account to attach to
        let account = await tx.account.findFirst({
          where: { userId: dbUser.id },
          orderBy: { isDefault: 'desc' }
        });

        // If no account exists, create a default "Cash Wallet" to prevent import failures
        if (!account) {
          account = await tx.account.create({
            data: {
              name: 'Cash Wallet',
              type: 'checking',
              balance: 0.0,
              isDefault: true,
              userId: dbUser.id
            }
          });
        }

        const transaction = await tx.transaction.create({
          data: {
            amount: draft.parsedAmount,
            type: draft.parsedType,
            category: 'Uncategorized', // Default category for SMS imports
            merchant: draft.parsedMerchant || draft.smsSender || 'Unknown Merchant',
            date: draft.parsedDate ? new Date(draft.parsedDate) : new Date(),
            accountId: account.id,
            userId: dbUser.id,
            smsImportId: smsImport.id
          }
        });

        // Update account balance
        const balanceChange = draft.parsedType === 'expense' ? -draft.parsedAmount : draft.parsedAmount;
        await tx.account.update({
          where: { id: account.id },
          data: { balance: { increment: balanceChange } }
        });

        importedTransactions.push(transaction);
      }
    }

    return importedTransactions;
  });
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { smsDrafts } = body;

    if (!smsDrafts || !Array.isArray(smsDrafts)) {
      return new NextResponse("Invalid payload", { status: 400 });
    }

    try {
      const result = await runBatchImport(userId, smsDrafts);
      return NextResponse.json({ success: true, count: result.length, data: result });
    } catch (dbError: any) {
      // If table doesn't exist (P2021) or another database connection issue, push schema and retry once
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist')) {
        console.log("[DEBUG] Detected missing tables (P2021). Attempting automatic Next.js host schema sync...");
        try {
          const prismaCliPath = require.resolve('prisma/package.json').replace('package.json', 'build/index.js');
          const cmd = `"${process.execPath}" "${prismaCliPath}" db push --accept-data-loss`;
          console.log(`[DEBUG] Running local database sync command: ${cmd}`);
          execSync(cmd, { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
          console.log("[DEBUG] Schema push completed. Retrying batch import...");
          const result = await runBatchImport(userId, smsDrafts);
          return NextResponse.json({ success: true, count: result.length, data: result });
        } catch (retryError) {
          console.error("[DEBUG] Schema push or retry failed:", retryError);
          throw dbError; // Rethrow original database error if recovery failed
        }
      } else {
        throw dbError;
      }
    }
  } catch (error) {
    console.error("[BATCH_IMPORT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}


