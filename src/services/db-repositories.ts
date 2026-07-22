import { Platform } from "react-native";
import { db } from "@/lib/db";
import { Account, Transaction, Budget, SavingsGoal } from "@/types";
import { MOCK_ACCOUNTS, MOCK_TRANSACTIONS, MOCK_BUDGETS, MOCK_GOALS } from "@/lib/mock-data";

// Fallback in-memory storage for Web environment
let webAccounts: Account[] = [...MOCK_ACCOUNTS];
let webTransactions: Transaction[] = [...MOCK_TRANSACTIONS];
let webBudgets: Budget[] = [...MOCK_BUDGETS];
let webGoals: SavingsGoal[] = [...MOCK_GOALS];

export const AccountRepository = {
  async getAll(): Promise<Account[]> {
    if (Platform.OS === "web") {
      return webAccounts;
    }
    try {
      return db.getAllSync("SELECT * FROM accounts ORDER BY createdAt DESC") as Account[];
    } catch (err) {
      console.error("Failed to fetch accounts", err);
      return [];
    }
  },

  async create(account: Account): Promise<void> {
    if (Platform.OS === "web") {
      webAccounts.push(account);
      return;
    }
    try {
      db.runSync(
        "INSERT INTO accounts (id, name, type, balance, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
        [account.id, account.name, account.type, account.balance, account.createdAt, account.updatedAt]
      );
    } catch (err) {
      console.error("Failed to insert account", err);
    }
  },

  async delete(id: string): Promise<void> {
    if (Platform.OS === "web") {
      webAccounts = webAccounts.filter((a) => a.id !== id);
      return;
    }
    try {
      db.runSync("DELETE FROM accounts WHERE id = ?", [id]);
    } catch (err) {
      console.error("Failed to delete account", err);
    }
  },
};

export const TransactionRepository = {
  async getAll(): Promise<Transaction[]> {
    if (Platform.OS === "web") {
      return webTransactions;
    }
    try {
      const rows = db.getAllSync("SELECT * FROM transactions ORDER BY date DESC") as any[];
      return rows.map((row) => ({
        ...row,
        isRecurring: row.isRecurring === 1 || row.isRecurring === true,
      })) as Transaction[];
    } catch (err) {
      console.error("Failed to fetch transactions", err);
      return [];
    }
  },

  async create(trans: Transaction): Promise<void> {
    if (Platform.OS === "web") {
      webTransactions.push(trans);
      // Update local card balance mock
      webAccounts = webAccounts.map((acc) => {
        if (acc.id === trans.accountId) {
          const delta = trans.type === "INCOME" ? trans.amount : -trans.amount;
          return { ...acc, balance: acc.balance + delta };
        }
        return acc;
      });
      return;
    }
    try {
      db.withTransactionSync(() => {
        db.runSync(
          "INSERT INTO transactions (id, amount, date, description, type, categoryId, accountId, receiptUrl, isRecurring, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            trans.id,
            trans.amount,
            trans.date,
            trans.description,
            trans.type,
            trans.categoryId,
            trans.accountId,
            trans.receiptUrl || null,
            trans.isRecurring ? 1 : 0,
            trans.createdAt,
            trans.updatedAt,
          ]
        );
        
        // Update associated account balance
        const delta = trans.type === "INCOME" ? trans.amount : -trans.amount;
        db.runSync("UPDATE accounts SET balance = balance + ? WHERE id = ?", [delta, trans.accountId]);
      });
    } catch (err) {
      console.error("Failed to insert transaction", err);
    }
  },

  async delete(id: string): Promise<void> {
    if (Platform.OS === "web") {
      const trans = webTransactions.find((t) => t.id === id);
      if (trans) {
        webAccounts = webAccounts.map((acc) => {
          if (acc.id === trans.accountId) {
            const delta = trans.type === "INCOME" ? -trans.amount : trans.amount;
            return { ...acc, balance: acc.balance + delta };
          }
          return acc;
        });
      }
      webTransactions = webTransactions.filter((t) => t.id !== id);
      return;
    }
    try {
      db.withTransactionSync(() => {
        const trans = db.getFirstSync("SELECT * FROM transactions WHERE id = ?", [id]) as Transaction;
        if (trans) {
          const delta = trans.type === "INCOME" ? -trans.amount : trans.amount;
          db.runSync("UPDATE accounts SET balance = balance + ? WHERE id = ?", [delta, trans.accountId]);
          db.runSync("DELETE FROM transactions WHERE id = ?", [id]);
        }
      });
    } catch (err) {
      console.error("Failed to delete transaction", err);
    }
  },

  async update(trans: Transaction): Promise<void> {
    if (Platform.OS === "web") {
      const oldTrans = webTransactions.find((t) => t.id === trans.id);
      if (oldTrans) {
        webAccounts = webAccounts.map((acc) => {
          if (acc.id === oldTrans.accountId) {
            const oldDelta = oldTrans.type === "INCOME" ? -oldTrans.amount : oldTrans.amount;
            return { ...acc, balance: acc.balance + oldDelta };
          }
          return acc;
        });
      }
      webAccounts = webAccounts.map((acc) => {
        if (acc.id === trans.accountId) {
          const newDelta = trans.type === "INCOME" ? trans.amount : -trans.amount;
          return { ...acc, balance: acc.balance + newDelta };
        }
        return acc;
      });
      webTransactions = webTransactions.map((t) => (t.id === trans.id ? trans : t));
      return;
    }
    try {
      db.withTransactionSync(() => {
        const oldTrans = db.getFirstSync("SELECT * FROM transactions WHERE id = ?", [trans.id]) as Transaction;
        if (oldTrans) {
          const oldDelta = oldTrans.type === "INCOME" ? -oldTrans.amount : oldTrans.amount;
          db.runSync("UPDATE accounts SET balance = balance + ? WHERE id = ?", [oldDelta, oldTrans.accountId]);
        }
        const newDelta = trans.type === "INCOME" ? trans.amount : -trans.amount;
        db.runSync("UPDATE accounts SET balance = balance + ? WHERE id = ?", [newDelta, trans.accountId]);

        db.runSync(
          "UPDATE transactions SET amount = ?, date = ?, description = ?, type = ?, categoryId = ?, accountId = ?, receiptUrl = ?, isRecurring = ?, updatedAt = ? WHERE id = ?",
          [
            trans.amount,
            trans.date,
            trans.description,
            trans.type,
            trans.categoryId,
            trans.accountId,
            trans.receiptUrl || null,
            trans.isRecurring ? 1 : 0,
            trans.updatedAt,
            trans.id,
          ]
        );
      });
    } catch (err) {
      console.error("Failed to update transaction", err);
    }
  },
};

export const BudgetRepository = {
  async getAll(): Promise<Budget[]> {
    if (Platform.OS === "web") {
      return webBudgets;
    }
    try {
      return db.getAllSync("SELECT * FROM budgets") as Budget[];
    } catch (err) {
      console.error("Failed to fetch budgets", err);
      return [];
    }
  },

  async setLimit(budget: Budget): Promise<void> {
    if (Platform.OS === "web") {
      const existsIdx = webBudgets.findIndex((b) => b.categoryId === budget.categoryId);
      if (existsIdx !== -1) {
        webBudgets[existsIdx] = budget;
      } else {
        webBudgets.push(budget);
      }
      return;
    }
    try {
      db.runSync(
        `INSERT INTO budgets (id, amount, categoryId, period, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET amount=excluded.amount, updatedAt=excluded.updatedAt`,
        [budget.id, budget.amount, budget.categoryId, budget.period, budget.createdAt, budget.updatedAt]
      );
    } catch (err) {
      console.error("Failed to upsert budget limit", err);
    }
  },
};

export const GoalRepository = {
  async getAll(): Promise<SavingsGoal[]> {
    if (Platform.OS === "web") {
      return webGoals;
    }
    try {
      return db.getAllSync("SELECT * FROM goals ORDER BY targetDate ASC") as SavingsGoal[];
    } catch (err) {
      console.error("Failed to fetch savings goals", err);
      return [];
    }
  },

  async create(goal: SavingsGoal): Promise<void> {
    if (Platform.OS === "web") {
      webGoals.push(goal);
      return;
    }
    try {
      db.runSync(
        "INSERT INTO goals (id, name, targetAmount, currentAmount, targetDate, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [goal.id, goal.name, goal.targetAmount, goal.currentAmount, goal.targetDate, goal.status, goal.createdAt, goal.updatedAt]
      );
    } catch (err) {
      console.error("Failed to insert savings goal", err);
    }
  },

  async updateProgress(id: string, currentAmount: number, targetDate?: string): Promise<void> {
    if (Platform.OS === "web") {
      webGoals = webGoals.map((g) => {
        if (g.id === id) {
          const status = currentAmount >= g.targetAmount ? "COMPLETED" : "ACTIVE";
          return { 
            ...g, 
            currentAmount, 
            targetDate: targetDate || g.targetDate, 
            status, 
            updatedAt: new Date().toISOString() 
          };
        }
        return g;
      });
      return;
    }
    try {
      const goal = db.getFirstSync("SELECT * FROM goals WHERE id = ?", [id]) as SavingsGoal;
      if (goal) {
        const status = currentAmount >= goal.targetAmount ? "COMPLETED" : "ACTIVE";
        db.runSync(
          "UPDATE goals SET currentAmount = ?, targetDate = ?, status = ?, updatedAt = ? WHERE id = ?",
          [currentAmount, targetDate || goal.targetDate, status, new Date().toISOString(), id]
        );
      }
    } catch (err) {
      console.error("Failed to update savings goal progress", err);
    }
  },

  async delete(id: string): Promise<void> {
    if (Platform.OS === "web") {
      webGoals = webGoals.filter((g) => g.id !== id);
      return;
    }
    try {
      db.runSync("DELETE FROM goals WHERE id = ?", [id]);
    } catch (err) {
      console.error("Failed to delete savings goal", err);
    }
  },
};

export const SystemRepository = {
  async clearAllData(): Promise<void> {
    if (Platform.OS === "web") {
      // Reset in-memory arrays to empty
      webAccounts.length = 0;
      webTransactions.length = 0;
      webBudgets.length = 0;
      webGoals.length = 0;
      return;
    }
    try {
      db.withTransactionSync(() => {
        db.runSync("DELETE FROM transactions");
        db.runSync("DELETE FROM budgets");
        db.runSync("DELETE FROM goals");
        db.runSync("DELETE FROM accounts");
      });
      console.log("Database cleared successfully. 🗄️");
    } catch (err) {
      console.error("Failed to clear database tables", err);
      throw err;
    }
  }
};

