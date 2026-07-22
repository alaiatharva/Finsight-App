import { Account, Category, Transaction, Budget, SavingsGoal, ChatMessage } from "@/types";

// Predefined Categories
export const MOCK_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Salary", type: "INCOME", icon: "TrendingUp", color: "#10b981" },
  { id: "cat-2", name: "Food & Dining", type: "EXPENSE", icon: "Pizza", color: "#f59e0b" },
  { id: "cat-3", name: "Rent & Housing", type: "EXPENSE", icon: "Home", color: "#3b82f6" },
  { id: "cat-4", name: "Utilities", type: "EXPENSE", icon: "Zap", color: "#06b6d4" },
  { id: "cat-5", name: "Transportation", type: "EXPENSE", icon: "Car", color: "#6366f1" },
  { id: "cat-6", name: "Entertainment", type: "EXPENSE", icon: "Film", color: "#ec4899" },
  { id: "cat-7", name: "Shopping", type: "EXPENSE", icon: "ShoppingBag", color: "#8b5cf6" },
];

// Accounts Mock
export const MOCK_ACCOUNTS: Account[] = [
  {
    id: "acc-1",
    name: "Chase Checking",
    type: "CHECKING",
    balance: 5430.50,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "acc-2",
    name: "Ally High Yield Savings",
    type: "SAVINGS",
    balance: 20250.00,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "acc-3",
    name: "Amex Gold Card",
    type: "CREDIT_CARD",
    balance: -830.50,
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "acc-4",
    name: "Cash Wallet",
    type: "CASH",
    balance: 150.00,
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Transactions Mock (spread over the past few days)
export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "t-1",
    amount: 3250.00,
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    description: "Monthly Tech Corp Salary Pay",
    type: "INCOME",
    categoryId: "cat-1",
    accountId: "acc-1",
    isRecurring: true,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "t-2",
    amount: 42.50,
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    description: "Whole Foods Groceries",
    type: "EXPENSE",
    categoryId: "cat-2",
    accountId: "acc-1",
    isRecurring: false,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "t-3",
    amount: 1500.00,
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    description: "Downtown Apartment Rent Payment",
    type: "EXPENSE",
    categoryId: "cat-3",
    accountId: "acc-2",
    isRecurring: true,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "t-4",
    amount: 85.00,
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    description: "Gas Station Petrol Fill",
    type: "EXPENSE",
    categoryId: "cat-5",
    accountId: "acc-3",
    isRecurring: false,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "t-5",
    amount: 120.00,
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
    description: "Electric Bill Pay",
    type: "EXPENSE",
    categoryId: "cat-4",
    accountId: "acc-1",
    isRecurring: true,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: "t-6",
    amount: 15.99,
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    description: "Netflix Subscription Premium",
    type: "EXPENSE",
    categoryId: "cat-6",
    accountId: "acc-3",
    isRecurring: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "t-7",
    amount: 220.00,
    date: new Date(Date.now() - 6 * 86400000).toISOString(),
    description: "Nike Air Max Sneakers",
    type: "EXPENSE",
    categoryId: "cat-7",
    accountId: "acc-3",
    isRecurring: false,
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
];

// Budgets Mock
export const MOCK_BUDGETS: Budget[] = [
  {
    id: "b-1",
    amount: 600.00, // food limit
    categoryId: "cat-2",
    period: "MONTHLY",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "b-2",
    amount: 200.00, // utilities limit
    categoryId: "cat-4",
    period: "MONTHLY",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "b-3",
    amount: 400.00, // transport limit
    categoryId: "cat-5",
    period: "MONTHLY",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Savings Goals Mock
export const MOCK_GOALS: SavingsGoal[] = [
  {
    id: "g-1",
    name: "Emergency Cushions",
    targetAmount: 15000.00,
    currentAmount: 10250.00,
    targetDate: new Date(Date.now() + 180 * 86400000).toISOString(),
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "g-2",
    name: "MacBook Pro M4 Max",
    targetAmount: 3500.00,
    currentAmount: 1200.00,
    targetDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Chat History Mock
export const MOCK_CHAT_LOG: ChatMessage[] = [
  {
    id: "msg-1",
    role: "assistant",
    content: "Hi! I'm your FinSight Assistant. I can analyze your transactions, monitor your budgets, and suggest ways to grow your savings. What can I help you with today?",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "msg-2",
    role: "user",
    content: "How is my food budget looking this month?",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "msg-3",
    role: "assistant",
    content: "You've spent $242.50 of your $600.00 Food & Dining budget. You have $357.50 remaining with 18 days left in the billing period. At your current pace of $13.47/day, you are on track to spend a total of $485.00, leaving a surplus of $115.00!",
    timestamp: new Date(Date.now() - 1700000).toISOString(),
  },
];
