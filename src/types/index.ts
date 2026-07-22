export type AccountType = "CASH" | "SAVINGS" | "CHECKING" | "CREDIT_CARD";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = "INCOME" | "EXPENSE";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string; // Lucide icon name string
  color: string; // Tailwind hex or class name
}

export interface Transaction {
  id: string;
  amount: number;
  date: string; // ISO String
  description: string;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  receiptUrl?: string;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  amount: number;
  categoryId: string;
  period: "MONTHLY" | "YEARLY";
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // ISO String
  status: "ACTIVE" | "COMPLETED" | "FAILED";
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO String
}
