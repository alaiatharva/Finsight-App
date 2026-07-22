/**
 * Modular extractors for parsing SMS transaction components.
 * Every extractor uses multiple fallback regex patterns and safety validation checks.
 */

/**
 * Extracts transaction amount from SMS text.
 */
export function extractAmount(text: string): number | null {
  const norm = text.toUpperCase();

  const patterns = [
    // 1. "RS.299" / "RS 299" / "RS:299"
    /RS\s*(?:[:\.\s])\s*([\d,]+(?:\.\d{1,2})?)/,
    // 2. Simple "RS299"
    /RS\s*([\d,]+(?:\.\d{1,2})?)/,
    // 3. Amount followed by INR/RS
    /([\d,]+(?:\.\d{1,2})?)\s*RS/,
    // 4. Verbs followed by amount (fallback)
    /(?:DEBITED|CREDITED|PAID|SENT|SPENT)\s*(?:BY|FOR|WITH|OF)?\s*RS?\s*([\d,]+(?:\.\d{1,2})?)/
  ];

  for (const regex of patterns) {
    const match = norm.match(regex);
    if (match) {
      const amountStr = match[1];
      if (amountStr) {
        const val = parseFloat(amountStr.replace(/,/g, ""));
        if (!isNaN(val) && val > 0) {
          return val;
        }
      }
    }
  }

  return null;
}

/**
 * Extracts partial/masked account number from SMS text.
 */
export function extractAccount(text: string): string | null {
  const norm = text.toUpperCase();

  const patterns = [
    // 1. "ACCOUNT XX6831" / "ACCOUNT X7802"
    /ACCOUNT\s*(?:NO\.?|ENDING)?\s*(?:X+|[*]+|XX+)?(\d{3,6})\b/,
    // 2. "A/C ending in 1234"
    /ACCOUNT\s*ENDING\s*(?:IN|WITH)?\s*(\d{3,6})\b/,
    // 3. Raw "XX6831" or "X7802"
    /\b(?:XX+|X+|[*]+)(\d{3,6})\b/,
    // 4. Generic "ACCOUNT 1234"
    /ACCOUNT\s+(\d{3,6})\b/
  ];

  for (const regex of patterns) {
    const match = norm.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extracts UPI/IMPS reference or transaction ID.
 */
export function extractReference(text: string): string | null {
  const norm = text.toUpperCase();

  const patterns = [
    // 1. UPI Reference number (12 digits, typically starting with 3, 4, 5, 6, etc.)
    /\b(?:UPI\s+)?(?:REF|TXN|TRANS|IMPS|NEFT)\s*(?:REF\s*NO\.?|NO\.?|ID|TXN\s*ID)?\s*(?:IS)?\s*(\d{12})\b/,
    // 2. Alphanumeric transaction/ref ID
    /\b(?:TXN\s*ID|REF\s*NO\.?|TXN\s*REF|TXN)\s*(?:IS)?\s*([A-Z0-9]{8,22})\b/,
    // 3. Strict 12-digit number (fallback for UPI)
    /\b(\d{12})\b/
  ];

  for (const regex of patterns) {
    const match = norm.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extracts Merchant Name.
 */
export function extractMerchant(text: string): string | null {
  const norm = text.toUpperCase();

  const patterns = [
    // 1. Paid to / Transferred to / Sent to [Merchant]
    /\b(?:PAID|TRANSFERRED|SENT)\s+TO\s+([A-Z0-9\s.&'-]{3,30}?)(?:\s+VIA|\s+THROUGH|\s+FOR|\s+ON|\s+ACCOUNT|\s+RS|\s+DR|\bLIMIT\b|\s+TOWARDS?|\.|\n|$)/,
    // 2. Spent at / Paid at [Merchant]
    /\b(?:SPENT|PAYMENT)\s+AT\s+([A-Z0-9\s.&'-]{3,30}?)(?:\s+VIA|\s+THROUGH|\s+FOR|\s+ON|\s+ACCOUNT|\s+RS|\s+DR|\s+TOWARDS?|\.|\n|$)/,
    // 3. Credited to [Merchant] (Income destination)
    /\bCREDITED\s+TO\s+([A-Z0-9\s.&'-]{3,30}?)(?:\s+VIA|\s+THROUGH|\s+FOR|\s+ON|\s+ACCOUNT|\s+RS|\s+DR|\s+TOWARDS?|\.|\n|$)/,
    // 4. Fvg: [Merchant]
    /\bFVG\s*:\s*([A-Z0-9\s.&'-]{3,30}?)(?:\s+VIA|\s+THROUGH|\s+FOR|\s+ON|\s+ACCOUNT|\s+RS|\s+TOWARDS?|\.|\n|$)/,
    // 5. towards [Merchant]
    /\bTOWARDS\s+([A-Z0-9\s.&'-]{3,30}?)(?:\s+VIA|\s+THROUGH|\s+FOR|\s+ON|\s+ACCOUNT|\s+RS|\.|\n|$)/,
    // 6. to [Merchant]
    /\bTO\s+([A-Z0-9\s.&'-]{3,30}?)(?:\s+VIA|\s+THROUGH|\s+FOR|\s+ON|\s+ACCOUNT|\s+RS|\s+TOWARDS?|\.|\n|$)/,
    // 7. at [Merchant]
    /\bAT\s+([A-Z0-9\s.&'-]{3,30}?)(?:\s+VIA|\s+THROUGH|\s+FOR|\s+ON|\s+ACCOUNT|\s+RS|\s+TOWARDS?|\.|\n|$)/
  ];

  for (const regex of patterns) {
    const match = norm.match(regex);
    if (match && match[1]) {
      let cleanMerchant = match[1]
        .replace(/\b(?:MUMBAI|DELHI|BANGALORE|BENGALURU|CHENNAI|KOLKATA|HYDERABAD|PUNE|AHMEDABAD)\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
      
      // Clean up common false positive words
      const ignoreWords = [
        "UPI", "MOBILE BANKING", "NET BANKING", "NETBANKING", "IMPS", "NEFT", "RTGS", "ATM", 
        "YOUR ACCOUNT", "SELF", "DEBIT", "CREDIT", "RS", "ACCOUNT", "BANK", "USER", "CHG"
      ];
      
      if (ignoreWords.includes(cleanMerchant) || cleanMerchant.length < 2) {
        continue;
      }
      
      return cleanMerchant;
    }
  }

  return null;
}

/**
 * Extracts dates. Supports 20-06-26, 20/06/26, 20Jun26, 2026-06-20, 20 Jun 2026.
 */
export function extractDate(text: string): string | null {
  const norm = text.toUpperCase();

  const patterns = [
    // 1. DD-MM-YYYY or DD-MM-YY (using - or /)
    /\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/,
    // 2. YYYY-MM-DD
    /\b(\d{4})[-/](\d{2})[-/](\d{2})\b/,
    // 3. DD-MMM-YYYY or DD-MMM-YY e.g., 20JUN26
    /\b(\d{1,2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*(\d{2,4})?\b/,
    // 4. DD MMM YYYY e.g. 20 JUN 2026
    /\b(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*(\d{2,4})?\b/
  ];

  const months: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12"
  };

  for (const regex of patterns) {
    const match = norm.match(regex);
    if (match) {
      // Handle Month abbreviations (e.g. DD JUN YY)
      if (isNaN(Number(match[2]))) {
        const day = match[1].padStart(2, "0");
        const month = months[match[2]];
        let year = match[3] || String(new Date().getFullYear());
        if (year.length === 2) {
          year = "20" + year;
        }
        return `${year}-${month}-${day}`;
      }

      // Handle standard digit dates
      let part1 = match[1];
      let part2 = match[2];
      let part3 = match[3];

      // If part1 is YYYY (length 4)
      if (part1.length === 4) {
        return `${part1}-${part2.padStart(2, "0")}-${part3.padStart(2, "0")}`;
      }

      // Else it's DD-MM-YYYY or DD-MM-YY
      let year = part3;
      if (year.length === 2) {
        year = "20" + year;
      }
      return `${year}-${part2.padStart(2, "0")}-${part1.padStart(2, "0")}`;
    }
  }

  // Fallback to today
  return new Date().toISOString().split("T")[0];
}

/**
 * Extracts times. Supports 23:29, 09:47:12, 12:06 PM.
 */
export function extractTime(text: string): string | null {
  const norm = text.toUpperCase();

  const patterns = [
    // 1. HH:MM:SS AM/PM
    /\b(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?\b/,
    // 2. HH:MM AM/PM
    /\b(\d{1,2}):(\d{2})\s*(AM|PM)?\b/
  ];

  for (const regex of patterns) {
    const match = norm.match(regex);
    if (match) {
      let hh = parseInt(match[1]);
      const mm = match[2];
      const ss = match[3] && isNaN(Number(match[3])) ? "00" : (match[3] || "00");
      const ampm = match[4] || (isNaN(Number(match[3])) ? match[3] : null);

      if (ampm === "PM" && hh < 12) {
        hh += 12;
      } else if (ampm === "AM" && hh === 12) {
        hh = 0;
      }

      return `${String(hh).padStart(2, "0")}:${mm}:${ss}`;
    }
  }

  return null;
}

/**
 * Extracts remaining balance if mentioned.
 */
export function extractBalance(text: string): number | null {
  const norm = text.toUpperCase();

  const patterns = [
    /(?:AVBL|AVL|AVAILABLE|NEW)?\s*BAL(?:ANCE)?\s*(?:IS)?\s*(?:RS)?\s*([\d,]+(?:\.\d{1,2})?)/,
    /RS\s*([\d,]+(?:\.\d{1,2})?)\s*(?:AVBL|AVL|AVAILABLE|NEW)?\s*BAL/
  ];

  for (const regex of patterns) {
    const match = norm.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(val)) {
        return val;
      }
    }
  }

  return null;
}

/**
 * Extracts standard transaction channels.
 */
export function extractChannel(text: string): string | null {
  const norm = text.toUpperCase();

  const channels = [
    "UPI", "ATM", "POS", "DEBIT CARD", "CREDIT CARD", "FASTAG", "WALLET", 
    "INTERNET BANKING", "NET BANKING", "MOBILE BANKING", "IMPS", "RTGS", "NEFT"
  ];

  for (const chan of channels) {
    if (norm.includes(chan)) {
      return chan;
    }
  }

  return null;
}

/**
 * Extracts UPI ID (VPA).
 */
export function extractUpiId(text: string): string | null {
  const norm = text.toUpperCase();
  const match = norm.match(/\b([A-Z0-9._-]+@[A-Z]{3,15})\b/);
  if (match) {
    return match[1].toLowerCase();
  }
  return null;
}
