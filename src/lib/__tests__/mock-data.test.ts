import { MOCK_ACCOUNTS, MOCK_TRANSACTIONS, MOCK_BUDGETS, MOCK_GOALS, MOCK_CATEGORIES } from "../mock-data";

describe("MOCK_CATEGORIES", () => {
  it("should have at least 5 categories", () => {
    expect(MOCK_CATEGORIES.length).toBeGreaterThanOrEqual(5);
  });

  it("should contain both INCOME and EXPENSE types", () => {
    const types = new Set(MOCK_CATEGORIES.map((c) => c.type));
    expect(types.has("INCOME")).toBe(true);
    expect(types.has("EXPENSE")).toBe(true);
  });

  it("should have unique IDs", () => {
    const ids = MOCK_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each category should have all required fields", () => {
    MOCK_CATEGORIES.forEach((cat) => {
      expect(cat.id).toBeTruthy();
      expect(cat.name).toBeTruthy();
      expect(["INCOME", "EXPENSE"]).toContain(cat.type);
      expect(cat.icon).toBeTruthy();
      expect(cat.color).toMatch(/^#/); // hex color
    });
  });
});

describe("MOCK_ACCOUNTS", () => {
  it("should have at least 3 accounts", () => {
    expect(MOCK_ACCOUNTS.length).toBeGreaterThanOrEqual(3);
  });

  it("should have unique IDs", () => {
    const ids = MOCK_ACCOUNTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should contain different account types", () => {
    const types = new Set(MOCK_ACCOUNTS.map((a) => a.type));
    expect(types.size).toBeGreaterThanOrEqual(3);
  });

  it("each account should have valid timestamps", () => {
    MOCK_ACCOUNTS.forEach((acc) => {
      expect(new Date(acc.createdAt).getTime()).not.toBeNaN();
      expect(new Date(acc.updatedAt).getTime()).not.toBeNaN();
    });
  });

  it("credit card accounts should have negative or zero balance", () => {
    const creditCards = MOCK_ACCOUNTS.filter((a) => a.type === "CREDIT_CARD");
    creditCards.forEach((card) => {
      expect(card.balance).toBeLessThanOrEqual(0);
    });
  });
});

describe("MOCK_TRANSACTIONS", () => {
  it("should have at least 5 transactions", () => {
    expect(MOCK_TRANSACTIONS.length).toBeGreaterThanOrEqual(5);
  });

  it("should have unique IDs", () => {
    const ids = MOCK_TRANSACTIONS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should contain both INCOME and EXPENSE transactions", () => {
    const types = new Set(MOCK_TRANSACTIONS.map((t) => t.type));
    expect(types.has("INCOME")).toBe(true);
    expect(types.has("EXPENSE")).toBe(true);
  });

  it("all transactions should reference valid category IDs", () => {
    const validCatIds = new Set(MOCK_CATEGORIES.map((c) => c.id));
    MOCK_TRANSACTIONS.forEach((t) => {
      expect(validCatIds.has(t.categoryId)).toBe(true);
    });
  });

  it("all transactions should reference valid account IDs", () => {
    const validAccIds = new Set(MOCK_ACCOUNTS.map((a) => a.id));
    MOCK_TRANSACTIONS.forEach((t) => {
      expect(validAccIds.has(t.accountId)).toBe(true);
    });
  });

  it("all amounts should be positive", () => {
    MOCK_TRANSACTIONS.forEach((t) => {
      expect(t.amount).toBeGreaterThan(0);
    });
  });

  it("all dates should be valid ISO strings", () => {
    MOCK_TRANSACTIONS.forEach((t) => {
      const parsed = new Date(t.date);
      expect(parsed.getTime()).not.toBeNaN();
    });
  });
});

describe("MOCK_BUDGETS", () => {
  it("should have at least 2 budgets", () => {
    expect(MOCK_BUDGETS.length).toBeGreaterThanOrEqual(2);
  });

  it("should have unique IDs", () => {
    const ids = MOCK_BUDGETS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all budgets should reference valid category IDs", () => {
    const validCatIds = new Set(MOCK_CATEGORIES.map((c) => c.id));
    MOCK_BUDGETS.forEach((b) => {
      expect(validCatIds.has(b.categoryId)).toBe(true);
    });
  });

  it("all amounts should be positive", () => {
    MOCK_BUDGETS.forEach((b) => {
      expect(b.amount).toBeGreaterThan(0);
    });
  });

  it("period should be MONTHLY or YEARLY", () => {
    MOCK_BUDGETS.forEach((b) => {
      expect(["MONTHLY", "YEARLY"]).toContain(b.period);
    });
  });
});

describe("MOCK_GOALS", () => {
  it("should have at least 1 goal", () => {
    expect(MOCK_GOALS.length).toBeGreaterThanOrEqual(1);
  });

  it("should have unique IDs", () => {
    const ids = MOCK_GOALS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("currentAmount should not exceed targetAmount for ACTIVE goals", () => {
    const activeGoals = MOCK_GOALS.filter((g) => g.status === "ACTIVE");
    activeGoals.forEach((g) => {
      expect(g.currentAmount).toBeLessThanOrEqual(g.targetAmount);
    });
  });

  it("target dates should be in the future", () => {
    MOCK_GOALS.forEach((g) => {
      const targetDate = new Date(g.targetDate).getTime();
      // Allow a reasonable buffer since test might run after mock creation
      expect(targetDate).toBeGreaterThan(Date.now() - 86400000);
    });
  });

  it("status should be valid enum value", () => {
    MOCK_GOALS.forEach((g) => {
      expect(["ACTIVE", "COMPLETED", "FAILED"]).toContain(g.status);
    });
  });
});

describe("Cross-referential integrity", () => {
  it("every transaction category type should match (INCOME→INCOME, EXPENSE→EXPENSE)", () => {
    MOCK_TRANSACTIONS.forEach((t) => {
      const cat = MOCK_CATEGORIES.find((c) => c.id === t.categoryId);
      expect(cat).toBeDefined();
      if (cat) {
        expect(cat.type).toBe(t.type);
      }
    });
  });

  it("budget categories should all be EXPENSE type", () => {
    MOCK_BUDGETS.forEach((b) => {
      const cat = MOCK_CATEGORIES.find((c) => c.id === b.categoryId);
      expect(cat).toBeDefined();
      if (cat) {
        expect(cat.type).toBe("EXPENSE");
      }
    });
  });
});
