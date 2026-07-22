import { preprocessSms } from "./parser/preprocessor";
import { detectTxnType } from "./parser/fuzzyMatcher";
import { identifyBank } from "./parser/bankIdentifiers";
import { isNonTransactional } from "./parser/validators";
import {
  extractAmount,
  extractAccount,
  extractReference,
  extractMerchant,
  extractDate,
  extractUpiId,
} from "./parser/extractors";
import { calculateConfidence } from "./parser/confidence";

export interface ParsedSMS {
  rawSmsText: string;
  smsSender: string;
  parsedAmount: number | null;
  parsedMerchant: string | null;
  parsedDate: string | null;
  parsedType: "income" | "expense" | null;
  upiReference: string | null;
  parseConfidence: "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Parses an incoming bank SMS body to extract transaction details.
 * Implements standard Indian banking text preprocessing, fuzzy match filtering,
 * modular extraction, and confidence scoring.
 */
export const parseSms = (body: string, sender: string): ParsedSMS => {
  // 1. Check for false positive signals (OTP, spam, promotional campaigns)
  if (isNonTransactional(body)) {
    return {
      rawSmsText: body,
      smsSender: sender,
      parsedAmount: null,
      parsedMerchant: null,
      parsedDate: null,
      parsedType: null,
      upiReference: null,
      parseConfidence: "LOW",
    };
  }

  // 2. Preprocess text (standardizing currency, spacing, and casing)
  const { normalized } = preprocessSms(body);

  // 3. Extract parameters using modular extraction logic
  const bank = identifyBank(sender, normalized);
  const txnType = detectTxnType(normalized);
  const amount = extractAmount(normalized);
  const account = extractAccount(normalized);
  const reference = extractReference(normalized);
  const merchant = extractMerchant(normalized);
  const dateStr = extractDate(normalized);
  const upiId = extractUpiId(normalized);

  // 4. Calculate confidence based on standard scoring weight list
  const { confidence } = calculateConfidence({
    amount,
    txnType,
    bankId: bank.bankId,
    reference,
    account,
    merchant,
    date: dateStr,
    upiId,
  });

  // Keep a clean casing for merchant name if extracted (Title Cased or Uppercase is fine)
  let cleanMerchant = merchant;
  if (cleanMerchant) {
    cleanMerchant = cleanMerchant
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  return {
    rawSmsText: body,
    smsSender: sender,
    parsedAmount: amount,
    parsedMerchant: cleanMerchant,
    parsedDate: dateStr,
    parsedType: txnType,
    upiReference: reference,
    parseConfidence: confidence,
  };
};
