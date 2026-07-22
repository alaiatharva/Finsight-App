export type SortOption = "latest" | "oldest" | "highest" | "lowest" | "a-z" | "z-a";

export interface DateRange {
  from: string | null; // ISO string format YYYY-MM-DD
  to: string | null;   // ISO string format YYYY-MM-DD
}

export interface AmountRange {
  min: number | null;
  max: number | null;
}

export interface FilterState {
  transactionType: string[]; // "INCOME", "EXPENSE", "TRANSFER", "REFUND", "RECHARGE"
  categories: string[];      // category IDs
  wallets: string[];         // account IDs
  paymentMethods: string[];  // UPI, Debit Card, Credit Card, etc.
  status: string[];          // Completed, Pending, Failed, Refunded
  dateRange: DateRange;
  amountRange: AmountRange;
  merchant: string;
  search: string;
  sortBy: SortOption;
}

export const INITIAL_FILTER_STATE: FilterState = {
  transactionType: [],
  categories: [],
  wallets: [],
  paymentMethods: [],
  status: [],
  dateRange: {
    from: null,
    to: null,
  },
  amountRange: {
    min: null,
    max: null,
  },
  merchant: "",
  search: "",
  sortBy: "latest",
};
