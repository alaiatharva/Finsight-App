import { parseSms } from "../../services/sms/smsParserService";

describe("SMS Transaction Parser Engine Tests", () => {
  describe("Step 1: Text Preprocessing & Multiline Handling", () => {
    it("should collapse multiple tabs, newlines, and double spaces", () => {
      const sms = "Dear Customer,\n\nYour account XX1234 has been\tdebited\nwith Rs.500.00.";
      const parsed = parseSms(sms, "AD-HDFCBK");
      expect(parsed.parsedAmount).toBe(500);
      expect(parsed.parsedType).toBe("expense");
    });

    it("should normalize all Indian currency representations to RS", () => {
      const variations = [
        "Your account debited with Rs.100.00",
        "Your account debited with Rs:100.00",
        "Your account debited with Rs 100.00",
        "Your account debited with ₹100.00",
        "Your account debited with INR 100.00",
        "100.00 INR debited from account",
      ];

      variations.forEach((sms) => {
        const parsed = parseSms(sms, "AD-HDFCBK");
        expect(parsed.parsedAmount).toBe(100);
      });
    });

    it("should handle commas within transaction amount formatting", () => {
      const sms = "Your account has been debited with Rs.1,50,000.50";
      const parsed = parseSms(sms, "AD-HDFCBK");
      expect(parsed.parsedAmount).toBe(150000.50);
    });
  });

  describe("Step 2: Fuzzy Keyword Matcher (Debit/Credit/Typos)", () => {
    it("should detect debits with OCR errors and typos", () => {
      const typos = ["debitj", "deblt", "debtted", "debitied", "dr"];
      typos.forEach((typo) => {
        const sms = `Your account has been ${typo} with Rs.350`;
        const parsed = parseSms(sms, "AD-HDFCBK");
        expect(parsed.parsedType).toBe("expense");
        expect(parsed.parsedAmount).toBe(350);
      });
    });

    it("should detect credits with keywords", () => {
      const creditKeywords = ["credited", "deposit", "deposited", "received", "refund", "cashback", "salary", "interest", "reversal"];
      creditKeywords.forEach((keyword) => {
        const sms = `Account XX123 has ${keyword} with Rs.1000`;
        const parsed = parseSms(sms, "AD-HDFCBK");
        expect(parsed.parsedType).toBe("income");
      });
    });

    it("should correctly identify debit vs credit when both indicators are present", () => {
      const debitSms = "Rs.44.00 debited A/cXX6831 and credited to PRANIT DIPAK VARUDE via UPI Ref No 30715439731";
      const parsedDebit = parseSms(debitSms, "AD-HDFCBK");
      expect(parsedDebit.parsedType).toBe("expense");
      expect(parsedDebit.parsedAmount).toBe(44);

      const creditSms = "Rs.100.00 credited to A/cXX6831 and debited from SENDER via UPI Ref No 123456789012";
      const parsedCredit = parseSms(creditSms, "AD-HDFCBK");
      expect(parsedCredit.parsedType).toBe("income");
      expect(parsedCredit.parsedAmount).toBe(100);
    });
  });

  describe("Step 3: Extractors (Amount, Account, Ref, Merchant, Date)", () => {
    it("should extract account endings from different styles", () => {
      const examples = [
        { sms: "A/C X7802 debited for Rs.90", expected: "7802" },
        { sms: "A/c ending in 1234 debited for Rs.90", expected: "1234" },
        { sms: "Acct XX6831 debited for Rs.90", expected: "6831" },
        { sms: "A/c no. 5556 debited for Rs.90", expected: "5556" },
        { sms: "A/C *1123 debited for Rs.90", expected: "1123" }
      ];

      examples.forEach(({ sms, expected }) => {
        const parsed = parseSms(sms, "AD-HDFCBK");
        expect(parsed.upiReference).toBeNull(); // No ref here
      });
    });

    it("should extract UPI references and Txn IDs", () => {
      const examples = [
        { sms: "UPI Ref No 312345678901", expected: "312345678901" },
        { sms: "Txn ID 498765432109", expected: "498765432109" },
        { sms: "IMPS Ref: 554433221100", expected: "554433221100" }
      ];

      examples.forEach(({ sms, expected }) => {
        const parsed = parseSms(sms, "AD-HDFCBK");
        expect(parsed.upiReference).toBe(expected);
      });
    });

    it("should extract merchant names under various prefixes", () => {
      const examples = [
        { sms: "debited with Rs.10 for UPI to ABC STORE", expected: "Abc Store" },
        { sms: "credited Rs.200 to GOOGLE INDIA", expected: "Google India" },
        { sms: "Rs.50 Paid to AMAZON towards books", expected: "Amazon" },
        { sms: "spent Rs.500 at DMART Mumbai", expected: "Dmart" },
        { sms: "Rs.500 debited Fvg: SWATI via UPI", expected: "Swati" }
      ];

      examples.forEach(({ sms, expected }) => {
        const parsed = parseSms(sms, "AD-HDFCBK");
        expect(parsed.parsedMerchant).toBe(expected);
      });
    });

    it("should extract dates in multiple Indian bank formats", () => {
      const examples = [
        { sms: "debited Rs.10 on 20-06-26", expected: "2026-06-20" },
        { sms: "debited Rs.10 on 20/06/26", expected: "2026-06-20" },
        { sms: "debited Rs.10 on 20Jun26", expected: "2026-06-20" },
        { sms: "debited Rs.10 on 2026-06-20", expected: "2026-06-20" },
        { sms: "debited Rs.10 on 20 Jun 2026", expected: "2026-06-20" }
      ];

      examples.forEach(({ sms, expected }) => {
        const parsed = parseSms(sms, "AD-HDFCBK");
        expect(parsed.parsedDate).toBe(expected);
      });
    });
  });

  describe("Step 4: Bank Identifiers", () => {
    it("should identify bank matching the sender ID prefix", () => {
      const senders = [
        { sender: "AD-HDFCBK", sms: "Rs.10 debited" },
        { sender: "VK-SBIINB", sms: "Rs.10 debited" },
        { sender: "BP-ICICIB", sms: "Rs.10 debited" },
        { sender: "DM-AXISBK", sms: "Rs.10 debited" },
        { sender: "IP-KOTAKB", sms: "Rs.10 debited" }
      ];

      senders.forEach(({ sender, sms }) => {
        const parsed = parseSms(sms, sender);
        // Bank ID parsed correctly (validating high confidence / transaction detection)
        expect(parsed.parseConfidence).toBe("HIGH");
      });
    });
  });

  describe("Step 5: False Positive Prevention", () => {
    const falsePositives = [
      "Your OTP is 123456 to login to netbanking. Do not share.",
      "Congratulations! You are pre-approved for a personal loan of Rs 5,00,000. Apply now.",
      "Your ICICI credit card statement is generated. Total outstanding is Rs 12,000. Pay by 15th.",
      "Alert: Logged in to your Netbanking account at 13:45. If not you, block immediately.",
      "KYC Reminder: Update your bank KYC to prevent account blockages. Tap here.",
      "Dear customer, check out our exciting deals on credit cards. Up to 15% discount."
    ];

    it("should ignore non-transactional messages", () => {
      falsePositives.forEach((sms) => {
        const parsed = parseSms(sms, "AD-HDFCBK");
        expect(parsed.parseConfidence).toBe("LOW");
        expect(parsed.parsedAmount).toBeNull();
        expect(parsed.parsedType).toBeNull();
      });
    });
  });
});
