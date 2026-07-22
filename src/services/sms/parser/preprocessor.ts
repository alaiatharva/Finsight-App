/**
 * Normalizes an SMS body to standard formats to make pattern matching extremely robust.
 * Handles multiline text, tabs, carriage returns, duplicate spaces, and normalizes
 * key banking terms like currency symbols and account notations.
 */
export function preprocessSms(text: string): { normalized: string; rawCleaned: string } {
  if (!text) {
    return { normalized: "", rawCleaned: "" };
  }

  // 1. Replace newlines, tabs, and carriage returns with a single space
  let cleaned = text.replace(/[\r\n\t]+/g, " ");

  // 2. Remove hidden Unicode characters, zero-width spaces, and duplicate spaces
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, ""); // Zero-width spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Keep a copy of cleaned raw text (maintaining casing)
  const rawCleaned = cleaned;

  // Create uppercase version for standardized extraction
  let norm = cleaned.toUpperCase();

  // 3. Normalize currency tokens (RS., RS:, RS, ₹, INR) to "RS"
  // Order is important: match symbols and prefixes
  norm = norm.replace(/(?:RS[:\.]?|INR|₹)/g, "RS");

  // 4. Normalize account identifiers (A/c, A/C, AC, Account, Acct) to "ACCOUNT"
  // Avoid replacing regular words like "ACTION" by checking boundaries
  norm = norm.replace(/\b(?:A\/C|AC|ACCOUNT|ACCT|A\/c)\b/gi, "ACCOUNT");
  norm = norm.replace(/\bA\/C\b/g, "ACCOUNT");

  // 5. Remove any duplicate spaces that normalization might have introduced
  norm = norm.replace(/\s+/g, " ").trim();

  return {
    normalized: norm,
    rawCleaned,
  };
}
