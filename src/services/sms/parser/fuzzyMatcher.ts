/**
 * Computes the Levenshtein distance between two strings.
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // Deletion
        d[i][j - 1] + 1, // Insertion
        d[i - 1][j - 1] + cost // Substitution
      );
    }
  }
  return d[m][n];
}

/**
 * Checks if a word in the text fuzzy matches the target keyword.
 * For short keywords (len < 4), it does exact matching.
 * For longer keywords, it allows an edit distance threshold.
 */
export function wordFuzzyMatch(word: string, keyword: string): boolean {
  const cleanWord = word.toUpperCase().replace(/[^A-Z]/g, "");
  const cleanKw = keyword.toUpperCase();
  
  if (cleanKw.length < 4) {
    return cleanWord === cleanKw;
  }

  const dist = levenshteinDistance(cleanWord, cleanKw);
  const maxAllowedDist = cleanKw.length <= 5 ? 1 : 2;
  
  return dist <= maxAllowedDist;
}

/**
 * Scans clean words in SMS text to find if any are fuzzy matches to the keyword set.
 */
export function hasFuzzyKeywords(text: string, keywords: string[]): boolean {
  // Split input text by standard delimiters (spaces, punctuation)
  const tokens = text.toUpperCase().split(/[\s,.:/\-()]+/).filter(Boolean);
  
  for (const token of tokens) {
    for (const kw of keywords) {
      if (wordFuzzyMatch(token, kw)) {
        return true;
      }
    }
  }
  
  return false;
}

// Global lists of debit/credit target terms
export const DEBIT_KEYWORDS = [
  "DEBIT", "DEBITED", "WITHDRAWN", "SPENT", "PAID", "PURCHASE", 
  "TRANSFER", "TRANSFERRED", "SENT", "UPI", "IMPS", "NEFT", "RTGS", "POS", "ATM"
];

export const CREDIT_KEYWORDS = [
  "CREDIT", "CREDITED", "CR", "RECEIVED", "DEPOSIT", "DEPOSITED",
  "REFUND", "CASHBACK", "SALARY", "INTEREST", "REVERSAL"
];

/**
 * Determines transaction type: 'expense' (debit), 'income' (credit), or null.
 */
export function detectTxnType(normalizedText: string): "expense" | "income" | null {
  // Pre-process text to remove card descriptions so they do not trigger false positive transaction types
  const textWithoutCards = normalizedText
    .replace(/\b(?:DR|CR|DEBIT|CREDIT)\s+CARD[S]?\b/g, "");

  const hasDebit = hasFuzzyKeywords(textWithoutCards, DEBIT_KEYWORDS) || 
                   textWithoutCards.includes("DR") || 
                   textWithoutCards.includes("DR.");
  const hasCredit = hasFuzzyKeywords(textWithoutCards, CREDIT_KEYWORDS) || 
                    textWithoutCards.includes("CR") || 
                    textWithoutCards.includes("CR.");

  // If both exist, find the first occurrence of a debit indicator vs credit indicator to determine the primary action
  if (hasDebit && hasCredit) {
    let earliestDebitIndex = Infinity;
    const debitIndicators = [...DEBIT_KEYWORDS, "DR", "DR."];
    for (const kw of debitIndicators) {
      const idx = textWithoutCards.indexOf(kw);
      if (idx !== -1 && idx < earliestDebitIndex) {
        earliestDebitIndex = idx;
      }
    }

    let earliestCreditIndex = Infinity;
    const creditIndicators = [...CREDIT_KEYWORDS, "CR", "CR."];
    for (const kw of creditIndicators) {
      const idx = textWithoutCards.indexOf(kw);
      if (idx !== -1 && idx < earliestCreditIndex) {
        earliestCreditIndex = idx;
      }
    }

    if (earliestDebitIndex < earliestCreditIndex) {
      return "expense";
    } else {
      return "income";
    }
  }

  if (hasDebit) return "expense";
  if (hasCredit) return "income";
  return null;
}
