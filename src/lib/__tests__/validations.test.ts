import { AccountSchema, TransactionSchema, BudgetSchema, GoalSchema } from "../validations";

describe("AccountSchema", () => {
  it("should accept valid account data", () => {
    const result = AccountSchema.safeParse({
      name: "Chase Checking",
      type: "CHECKING",
      balance: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("should accept all valid account types", () => {
    const types = ["CASH", "SAVINGS", "CHECKING", "CREDIT_CARD"] as const;
    types.forEach((type) => {
      const result = AccountSchema.safeParse({
        name: "Test Account",
        type,
        balance: 100,
      });
      expect(result.success).toBe(true);
    });
  });

  it("should reject name shorter than 2 characters", () => {
    const result = AccountSchema.safeParse({
      name: "A",
      type: "CHECKING",
      balance: 100,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("name");
    }
  });

  it("should reject name longer than 40 characters", () => {
    const result = AccountSchema.safeParse({
      name: "A".repeat(41),
      type: "CHECKING",
      balance: 100,
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid account type", () => {
    const result = AccountSchema.safeParse({
      name: "Test Account",
      type: "INVALID_TYPE",
      balance: 100,
    });
    expect(result.success).toBe(false);
  });

  it("should accept negative balances (e.g. credit card)", () => {
    const result = AccountSchema.safeParse({
      name: "Amex Gold",
      type: "CREDIT_CARD",
      balance: -500,
    });
    expect(result.success).toBe(true);
  });

  it("should reject extremely low balance", () => {
    const result = AccountSchema.safeParse({
      name: "Test",
      type: "CHECKING",
      balance: -2000000,
    });
    expect(result.success).toBe(false);
  });

  it("should coerce string balance to number", () => {
    const result = AccountSchema.safeParse({
      name: "Test Account",
      type: "SAVINGS",
      balance: "1500.50",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.balance).toBe(1500.50);
    }
  });
});

describe("TransactionSchema", () => {
  const validTransaction = {
    amount: 50.0,
    date: "2026-06-01",
    description: "Coffee Shop",
    type: "EXPENSE" as const,
    categoryId: "cat-2",
    accountId: "acc-1",
    isRecurring: false,
  };

  it("should accept valid transaction data", () => {
    const result = TransactionSchema.safeParse(validTransaction);
    expect(result.success).toBe(true);
  });

  it("should reject zero amount", () => {
    const result = TransactionSchema.safeParse({
      ...validTransaction,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative amount", () => {
    const result = TransactionSchema.safeParse({
      ...validTransaction,
      amount: -10,
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid date string", () => {
    const result = TransactionSchema.safeParse({
      ...validTransaction,
      date: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("should accept valid ISO date", () => {
    const result = TransactionSchema.safeParse({
      ...validTransaction,
      date: "2026-01-15T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("should reject short description", () => {
    const result = TransactionSchema.safeParse({
      ...validTransaction,
      description: "A",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing categoryId", () => {
    const result = TransactionSchema.safeParse({
      ...validTransaction,
      categoryId: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing accountId", () => {
    const result = TransactionSchema.safeParse({
      ...validTransaction,
      accountId: "",
    });
    expect(result.success).toBe(false);
  });

  it("should accept INCOME type", () => {
    const result = TransactionSchema.safeParse({
      ...validTransaction,
      type: "INCOME",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid type", () => {
    const result = TransactionSchema.safeParse({
      ...validTransaction,
      type: "TRANSFER",
    });
    expect(result.success).toBe(false);
  });

  it("should default isRecurring to false", () => {
    const { isRecurring, ...withoutRecurring } = validTransaction;
    const result = TransactionSchema.safeParse(withoutRecurring);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isRecurring).toBe(false);
    }
  });
});

describe("BudgetSchema", () => {
  it("should accept valid budget data", () => {
    const result = BudgetSchema.safeParse({
      amount: 500,
      categoryId: "cat-2",
      period: "MONTHLY",
    });
    expect(result.success).toBe(true);
  });

  it("should reject zero amount", () => {
    const result = BudgetSchema.safeParse({
      amount: 0,
      categoryId: "cat-2",
      period: "MONTHLY",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing categoryId", () => {
    const result = BudgetSchema.safeParse({
      amount: 500,
      categoryId: "",
      period: "MONTHLY",
    });
    expect(result.success).toBe(false);
  });

  it("should accept YEARLY period", () => {
    const result = BudgetSchema.safeParse({
      amount: 6000,
      categoryId: "cat-3",
      period: "YEARLY",
    });
    expect(result.success).toBe(true);
  });

  it("should default period to MONTHLY", () => {
    const result = BudgetSchema.safeParse({
      amount: 300,
      categoryId: "cat-2",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period).toBe("MONTHLY");
    }
  });
});

describe("GoalSchema", () => {
  it("should accept valid goal data", () => {
    const result = GoalSchema.safeParse({
      name: "Emergency Fund",
      targetAmount: 15000,
      targetDate: "2027-01-01",
    });
    expect(result.success).toBe(true);
  });

  it("should reject short name", () => {
    const result = GoalSchema.safeParse({
      name: "X",
      targetAmount: 1000,
      targetDate: "2027-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("should reject name exceeding 50 characters", () => {
    const result = GoalSchema.safeParse({
      name: "A".repeat(51),
      targetAmount: 1000,
      targetDate: "2027-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("should reject zero targetAmount", () => {
    const result = GoalSchema.safeParse({
      name: "Test Goal",
      targetAmount: 0,
      targetDate: "2027-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid targetDate", () => {
    const result = GoalSchema.safeParse({
      name: "Test Goal",
      targetAmount: 5000,
      targetDate: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("should coerce string targetAmount to number", () => {
    const result = GoalSchema.safeParse({
      name: "Test Goal",
      targetAmount: "2500",
      targetDate: "2027-06-15",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetAmount).toBe(2500);
    }
  });
});
