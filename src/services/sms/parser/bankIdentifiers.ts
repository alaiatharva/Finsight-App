export interface BankInfo {
  id: string;
  name: string;
  senderKeys: string[];
}

export const INDIAN_BANKS: BankInfo[] = [
  { id: "sbi", name: "State Bank of India", senderKeys: ["SBI", "SBICARD"] },
  { id: "hdfc", name: "HDFC Bank", senderKeys: ["HDFCBK", "HDFC"] },
  { id: "icici", name: "ICICI Bank", senderKeys: ["ICICI", "ICICIB"] },
  { id: "axis", name: "Axis Bank", senderKeys: ["AXISBK", "AXIS"] },
  { id: "kotak", name: "Kotak Mahindra Bank", senderKeys: ["KOTAK", "KOTAKB"] },
  { id: "bob", name: "Bank of Baroda", senderKeys: ["BOBTXN", "BARODA", "BOB"] },
  { id: "canara", name: "Canara Bank", senderKeys: ["CANARA", "CNRB"] },
  { id: "union", name: "Union Bank of India", senderKeys: ["UNIONB", "UBI", "UNION"] },
  { id: "ippb", name: "IPPB Bank", senderKeys: ["IPPB", "IPPBSB"] },
  { id: "pnb", name: "Punjab National Bank", senderKeys: ["PNBSMS", "PNB"] },
  { id: "boi", name: "Bank of India", senderKeys: ["BOITXN", "BOI"] },
  { id: "idfc", name: "IDFC First Bank", senderKeys: ["IDFC", "IDFCFIRST"] },
  { id: "federal", name: "Federal Bank", senderKeys: ["FEDRL", "FEDERAL"] },
  { id: "yes", name: "Yes Bank", senderKeys: ["YESBK", "YES"] },
  { id: "rbl", name: "RBL Bank", senderKeys: ["RBL", "RBLTXN"] },
  { id: "indusind", name: "IndusInd Bank", senderKeys: ["INDUS", "INDUSB"] },
  { id: "bandhan", name: "Bandhan Bank", senderKeys: ["BNDHN", "BANDHAN"] },
  { id: "au", name: "AU Small Finance Bank", senderKeys: ["AUBANK", "AUSB"] },
  { id: "uco", name: "UCO Bank", senderKeys: ["UCOBK", "UCO"] },
  { id: "indian_bank", name: "Indian Bank", senderKeys: ["IDIB", "INDIANB"] },
  { id: "central_bank", name: "Central Bank of India", senderKeys: ["CBI", "CENTRAL"] }
];

/**
 * Extracts clean bank information from the sender header or text contents.
 * E.g., "AD-HDFCBK" -> HDFC Bank, "SBIINB" -> State Bank of India
 */
export function identifyBank(sender: string, text: string): { bankId: string | null; bankName: string | null } {
  const cleanSender = sender.toUpperCase().replace(/^.+-/, "").trim(); // Removes VK-, AD-, etc.
  const upperText = text.toUpperCase();

  // 1. Try matching the sender keys
  for (const bank of INDIAN_BANKS) {
    for (const key of bank.senderKeys) {
      if (cleanSender.includes(key)) {
        return { bankId: bank.id, bankName: bank.name };
      }
    }
  }

  // 2. Try matching mentions in text if sender matches a generic SMS gateway
  for (const bank of INDIAN_BANKS) {
    if (upperText.includes(bank.name.toUpperCase())) {
      return { bankId: bank.id, bankName: bank.name };
    }
    // Also check sender keys inside the body (e.g. "Welcome to HDFC Bank...")
    for (const key of bank.senderKeys) {
      if (upperText.includes(key)) {
        return { bankId: bank.id, bankName: bank.name };
      }
    }
  }

  return { bankId: null, bankName: null };
}
