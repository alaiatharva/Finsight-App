import type { Account, AccountType, Transaction, TransactionType, Category, Budget, SavingsGoal, ChatMessage } from "../index";

/**
 * These are compile-time type tests. If the type definitions are incorrect,
 * TypeScript will fail to compile this file. The runtime tests verify
 * that the types are structurally sound.
 */

describe("Type Definitions - Structural Tests", () => {
  describe("Account type", () => {
    it("should accept valid Account objects", () => {
      const account: Account = {
        id: "acc-1",
        name: "Test Account",
        type: "CHECKING",
        balance: 1000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(account.id).toBe("acc-1");
      expect(account.type).toBe("CHECKING");
      expect(typeof account.balance).toBe("number");
    });

    it("should support all AccountType values", () => {
      const types: AccountType[] = ["CASH", "SAVINGS", "CHECKING", "CREDIT_CARD"];
      expect(types.length).toBe(4);
      types.forEach((t) => {
        expect(typeof t).toBe("string");
      });
    });
  });

  describe("Transaction type", () => {
    it("should accept valid Transaction objects", () => {
      const transaction: Transaction = {
        id: "t-1",
        amount: 50,
        date: new Date().toISOString(),
        description: "Test transaction",
        type: "EXPENSE",
        categoryId: "cat-1",
        accountId: "acc-1",
        isRecurring: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(transaction.type).toBe("EXPENSE");
      expect(transaction.isRecurring).toBe(false);
    });

    it("should support optional receiptUrl", () => {
      const withReceipt: Transaction = {
        id: "t-2",
        amount: 100,
        date: new Date().toISOString(),
        description: "With receipt",
        type: "EXPENSE",
        categoryId: "cat-2",
        accountId: "acc-1",
        receiptUrl: "file:///path/to/receipt.jpg",
        isRecurring: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(withReceipt.receiptUrl).toBe("file:///path/to/receipt.jpg");

      const withoutReceipt: Transaction = {
        id: "t-3",
        amount: 200,
        date: new Date().toISOString(),
        description: "Without receipt",
        type: "INCOME",
        categoryId: "cat-1",
        accountId: "acc-1",
        isRecurring: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(withoutReceipt.receiptUrl).toBeUndefined();
    });

    it("should support both TransactionType values", () => {
      const types: TransactionType[] = ["INCOME", "EXPENSE"];
      expect(types.length).toBe(2);
    });
  });

  describe("Category type", () => {
    it("should accept valid Category objects", () => {
      const category: Category = {
        id: "cat-1",
        name: "Salary",
        type: "INCOME",
        icon: "TrendingUp",
        color: "#10b981",
      };
      expect(category.name).toBe("Salary");
      expect(category.color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe("Budget type", () => {
    it("should accept valid Budget objects", () => {
      const budget: Budget = {
        id: "b-1",
        amount: 500,
        categoryId: "cat-2",
        period: "MONTHLY",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(budget.period).toBe("MONTHLY");
      expect(typeof budget.amount).toBe("number");
    });

    it("should support YEARLY period", () => {
      const yearlyBudget: Budget = {
        id: "b-2",
        amount: 6000,
        categoryId: "cat-3",
        period: "YEARLY",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(yearlyBudget.period).toBe("YEARLY");
    });
  });

  describe("SavingsGoal type", () => {
    it("should accept valid SavingsGoal objects", () => {
      const goal: SavingsGoal = {
        id: "g-1",
        name: "Emergency Fund",
        targetAmount: 15000,
        currentAmount: 5000,
        targetDate: new Date().toISOString(),
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(goal.status).toBe("ACTIVE");
      expect(goal.currentAmount).toBeLessThan(goal.targetAmount);
    });

    it("should support all status values", () => {
      const statuses: SavingsGoal["status"][] = ["ACTIVE", "COMPLETED", "FAILED"];
      expect(statuses.length).toBe(3);
    });
  });

  describe("ChatMessage type", () => {
    it("should accept valid ChatMessage objects", () => {
      const userMessage: ChatMessage = {
        id: "msg-1",
        role: "user",
        content: "Hello, what's my balance?",
        timestamp: new Date().toISOString(),
      };
      expect(userMessage.role).toBe("user");

      const assistantMessage: ChatMessage = {
        id: "msg-2",
        role: "assistant",
        content: "Your balance is $5,000.",
        timestamp: new Date().toISOString(),
      };
      expect(assistantMessage.role).toBe("assistant");
    });
  });
});
