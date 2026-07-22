import { z } from "zod";

// Account Schema
export const AccountSchema = z.object({
  name: z.string().min(2, "Account name must be at least 2 characters").max(40, "Account name is too long"),
  type: z.enum(["CASH", "SAVINGS", "CHECKING", "CREDIT_CARD"]),
  balance: z.coerce.number().min(-1000000, "Balance is too low").max(10000000, "Balance is too high"),
});

export type AccountFormInput = z.infer<typeof AccountSchema>;

// Transaction Schema
export const TransactionSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be greater than zero"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Please select a valid date"),
  description: z.string().min(2, "Description must be at least 2 characters").max(100),
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.string().min(1, "Please select a category"),
  accountId: z.string().min(1, "Please select an account"),
  isRecurring: z.boolean().default(false),
});

export type TransactionFormInput = z.infer<typeof TransactionSchema>;

// Budget Schema
export const BudgetSchema = z.object({
  amount: z.coerce.number().min(0.01, "Limit must be greater than zero"),
  categoryId: z.string().min(1, "Please select a category"),
  period: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
});

export type BudgetFormInput = z.infer<typeof BudgetSchema>;

// Goal Schema
export const GoalSchema = z.object({
  name: z.string().min(2, "Goal name must be at least 2 characters").max(50),
  targetAmount: z.coerce.number().min(1, "Target amount must be at least $1"),
  targetDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Please select a valid date"),
});

export type GoalFormInput = z.infer<typeof GoalSchema>;
