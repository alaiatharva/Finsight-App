/**
 * Detects if an SMS message is a non-transactional alert (like OTP, spam, loan offers, login alerts).
 * Returns true if it should be ignored.
 */
export function isNonTransactional(text: string): boolean {
  const norm = text.toUpperCase();

  const SPAM_PROMO_PATTERNS = [
    // OTP / Security codes
    /\bOTP\b/,
    /\bONE TIME PASSWORD\b/,
    /\bVERIFICATION CODE\b/,
    /\bIS YOUR VERIFICATION\b/,
    /\bCODE IS\b/,
    /\bPASSCODE\b/,
    /\bAUTHENTICATION CODE\b/,

    // Promotional & Loans
    /\bPRE-APPROVED\b/,
    /\bPRE APPROVED\b/,
    /\bLOAN OFFER\b/,
    /\bAPPLY FOR\b/,
    /\bELIGIBLE FOR\b/,
    /\bCONGRATULATIONS\b/,
    /\bGET UP TO\b/,
    /\bGET COMPLIMENTARY\b/,
    /\bINSTANT LOAN\b/,
    /\bPERSONAL LOAN\b/,
    /\bLIMIT ENHANCEMENT\b/,
    /\bCREDIT CARD OFFER\b/,

    // Reminders & Bills (due warnings)
    /\bBILL DUE\b/,
    /\bIS DUE ON\b/,
    /\bMINIMUM AMOUNT DUE\b/,
    /\bSTATEMENT FOR\b/,
    /\bSTATEMENT OF\b/,
    /\bSTATEMENT IS GENERATED\b/,
    /\bSTATEMENT GENERATED\b/,
    /\bCARD STATEMENT\b/,
    /\bTOTAL OUTSTANDING\b/,
    /\bOUTSTANDING IS\b/,
    /\bPAY BY\b/,
    /\bDUE DATE\b/,
    /\bPAY YOUR BILL\b/,
    /\bPAYMENT REMINDER\b/,
    /\bLAST DATE TO PAY\b/,

    // Balance enquiries (if it lacks direct debit/credit words)
    /\bBALANCE ENQUIRY\b/,
    /\bBAL ENQ\b/,
    /\bINQUIRY FOR A\/C\b/,

    // Security & Login alerts
    /\bLOGGED IN\b/,
    /\bLOGIN ALERT\b/,
    /\bSIGNED IN\b/,
    /\bACCESS TO NETBANKING\b/,
    /\bLOGGED INTO\b/,
    /\bSECURITY ALERT\b/,
    /\bPASSWORD CHANGED\b/,
    /\bNEW DEVICE LOGGED\b/,

    // KYC Reminders
    /\bKYC UPDATE\b/,
    /\bSUBMIT KYC\b/,
    /\bKYC SUSPEND\b/,
    /\bEXPIRE YOUR A\/C\b/
  ];

  for (const regex of SPAM_PROMO_PATTERNS) {
    if (regex.test(norm)) {
      // Re-verify: sometimes a genuine transaction SMS contains the word "balance" or "statement".
      // But if it is an OTP, loan offer, or login alert, it is 100% not a transaction.
      // So we strictly reject if it matches OTP, loan, kyc, login, or statements.
      const isOTP = /\bOTP\b|\bVERIFICATION CODE\b|\bONE TIME PASSWORD\b/.test(norm);
      const isLoanPromo = /\bPRE-APPROVED\b|\bPRE APPROVED\b|\bAPPLY FOR\b/.test(norm);
      const isKYC = /\bKYC UPDATE\b|\bSUBMIT KYC\b/.test(norm);
      const isLogin = /\bLOGGED IN\b|\bLOGIN ALERT\b|\bSIGNED IN\b/.test(norm);
      const isStatement = /\bSTATEMENT IS GENERATED\b|\bSTATEMENT GENERATED\b|\bCARD STATEMENT\b|\bTOTAL OUTSTANDING\b/.test(norm);
      
      if (isOTP || isLoanPromo || isKYC || isLogin || isStatement) {
        return true;
      }

      // For reminders/bill due: if it doesn't contain a debit keyword like "debited" or "paid", it's a reminder.
      const hasDebitAction = /\b(?:DEBITED|PAID|SENT|SPENT|TRANSFERRED|WITHDRAWN)\b/.test(norm);
      const hasCreditAction = /\b(?:CREDITED|RECEIVED|DEPOSITED)\b/.test(norm);
      if (!hasDebitAction && !hasCreditAction) {
        return true;
      }
    }
  }

  return false;
}
