export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface ScoreBreakdown {
  score: number;
  confidence: ConfidenceLevel;
}

/**
 * Calculates a confidence score for a parsed transaction payload.
 * Determines if it is a valid transaction and assigns a confidence level.
 */
export function calculateConfidence(payload: {
  amount: number | null;
  txnType: "expense" | "income" | null;
  bankId: string | null;
  reference: string | null;
  account: string | null;
  merchant: string | null;
  date: string | null;
  upiId: string | null;
}): ScoreBreakdown {
  let score = 0;

  // 1. Amount found (+30)
  if (payload.amount !== null && payload.amount > 0) {
    score += 30;
  }

  // 2. Debit/Credit keyword indicator found (+20)
  if (payload.txnType !== null) {
    score += 20;
  }

  // 3. Bank sender/header match (+20)
  if (payload.bankId !== null) {
    score += 20;
  }

  // 4. Reference/Txn ID found (+10)
  if (payload.reference !== null) {
    score += 10;
  }

  // 5. Account number found (+10)
  if (payload.account !== null) {
    score += 10;
  }

  // 6. Merchant name found (+10)
  if (payload.merchant !== null) {
    score += 10;
  }

  // 7. Date found (+10)
  if (payload.date !== null) {
    score += 10;
  }

  // 8. UPI details found (+10)
  if (payload.upiId !== null) {
    score += 10;
  }

  let confidence: ConfidenceLevel = "LOW";
  if (score >= 80) {
    confidence = "HIGH";
  } else if (score >= 50) {
    confidence = "MEDIUM";
  } else {
    confidence = "LOW";
  }

  return {
    score,
    confidence
  };
}
