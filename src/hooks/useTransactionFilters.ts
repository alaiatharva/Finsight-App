import { useMemo, useCallback } from "react";
import { useFilterStore } from "@/store/useFilterStore";
import { Transaction, Account } from "@/types";
import { FilterState, INITIAL_FILTER_STATE } from "@/types/filter";
import { MOCK_CATEGORIES } from "@/lib/mock-data";

// Helper to resolve payment method dynamically
export const getPaymentMethod = (trans: Transaction, acc: Account | undefined): string => {
  const desc = trans.description.toLowerCase();
  const accType = acc?.type;

  if (desc.includes("upi") || desc.includes("gpay") || desc.includes("paytm") || desc.includes("phonepe") || desc.includes("upi ref")) {
    return "UPI";
  }
  if (accType === "CREDIT_CARD") {
    return "Credit Card";
  }
  if (accType === "CASH" || desc.includes("cash deposit") || desc.includes("cash withdrawal")) {
    return "Cash";
  }
  if (desc.includes("debit card") || desc.includes("card ending") || desc.includes("pos")) {
    return "Debit Card";
  }
  if (desc.includes("auto debit") || desc.includes("autopay") || desc.includes("nach") || desc.includes("emi")) {
    return "Auto Debit";
  }
  if (desc.includes("netbanking") || desc.includes("net banking") || desc.includes("neft") || desc.includes("rtgs") || desc.includes("imps")) {
    return "Net Banking";
  }
  if (accType === "CHECKING" || accType === "SAVINGS") {
    return "Debit Card";
  }
  return "Wallet"; // fallback
};

// Helper to resolve status dynamically
export const getTransactionStatus = (trans: Transaction): string => {
  const desc = trans.description.toLowerCase();
  if (desc.includes("failed") || desc.includes("declined") || desc.includes("rejected")) {
    return "Failed";
  }
  if (desc.includes("pending") || desc.includes("hold") || desc.includes("process")) {
    return "Pending";
  }
  if (desc.includes("refund") || desc.includes("returned") || desc.includes("cashback")) {
    return "Refunded";
  }
  return "Completed";
};

export const useTransactionFilters = (transactions: Transaction[], accounts: Account[]) => {
  const { filters, setFilters, resetFilters } = useFilterStore();

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    const {
      transactionType = [],
      categories = [],
      wallets = [],
      paymentMethods = [],
      status = [],
      dateRange = { from: null, to: null },
      amountRange = { min: null, max: null },
      merchant = "",
      search = "",
      sortBy = "latest",
    } = filters || {};

    result = result.filter((trans) => {
      const acc = accounts.find((a) => a.id === trans.accountId);
      const cat = MOCK_CATEGORIES.find((c) => c.id === trans.categoryId);
      const catName = cat ? cat.name.toLowerCase() : "";

      // 1. Transaction Type (AND logic inside groups)
      if (transactionType.length > 0 && !transactionType.includes("All")) {
        const matchesType = transactionType.some((type) => {
          const lowerType = type.toLowerCase();
          if (lowerType === "income") return trans.type === "INCOME";
          if (lowerType === "expense") return trans.type === "EXPENSE";
          if (lowerType === "transfer") {
            return trans.description.toLowerCase().includes("transfer") || catName.includes("transfer");
          }
          if (lowerType === "refund") {
            return trans.description.toLowerCase().includes("refund") || catName.includes("refund");
          }
          if (lowerType === "recharge") {
            return trans.description.toLowerCase().includes("recharge") || catName.includes("recharge");
          }
          return false;
        });
        if (!matchesType) return false;
      }

      // 2. Categories
      if (categories.length > 0) {
        if (!categories.includes(trans.categoryId)) return false;
      }

      // 3. Wallets / Accounts
      if (wallets.length > 0) {
        if (!wallets.includes(trans.accountId)) return false;
      }

      // 4. Payment Methods
      if (paymentMethods.length > 0) {
        const resolvedMethod = getPaymentMethod(trans, acc);
        if (!paymentMethods.includes(resolvedMethod)) return false;
      }

      // 5. Status
      if (status.length > 0) {
        const resolvedStatus = getTransactionStatus(trans);
        if (!status.includes(resolvedStatus)) return false;
      }

      // 6. Date Range
      if (dateRange.from) {
        const transDate = new Date(trans.date.split("T")[0]);
        const fromDate = new Date(dateRange.from);
        if (transDate < fromDate) return false;
      }
      if (dateRange.to) {
        const transDate = new Date(trans.date.split("T")[0]);
        const toDate = new Date(dateRange.to);
        if (transDate > toDate) return false;
      }

      // 7. Amount Range
      if (amountRange.min !== null) {
        if (trans.amount < amountRange.min) return false;
      }
      if (amountRange.max !== null) {
        if (trans.amount > amountRange.max) return false;
      }

      // 8. Merchant Search
      if (merchant) {
        const query = merchant.toLowerCase().trim();
        if (!trans.description.toLowerCase().includes(query)) return false;
      }

      // 9. General Search
      if (search) {
        const query = search.toLowerCase().trim();
        const descMatch = trans.description.toLowerCase().includes(query);
        const catMatch = catName.includes(query);
        const accMatch = acc ? acc.name.toLowerCase().includes(query) : false;
        const amountMatch = trans.amount.toString().includes(query);
        if (!descMatch && !catMatch && !accMatch && !amountMatch) return false;
      }

      return true;
    });

    // Apply Sorting
    result.sort((a, b) => {
      if (sortBy === "latest") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === "highest") {
        return b.amount - a.amount;
      }
      if (sortBy === "lowest") {
        return a.amount - b.amount;
      }
      if (sortBy === "a-z") {
        return a.description.localeCompare(b.description);
      }
      if (sortBy === "z-a") {
        return b.description.localeCompare(a.description);
      }
      return 0;
    });

    return result;
  }, [transactions, accounts, filters]);

  // Generate individual active filter chips
  const activeChips = useMemo(() => {
    const chips: { id: string; label: string; remove: () => void }[] = [];

    const {
      transactionType = [],
      categories = [],
      wallets = [],
      paymentMethods = [],
      status = [],
      dateRange = { from: null, to: null },
      amountRange = { min: null, max: null },
      merchant = "",
    } = filters || {};

    // Transaction Type chips
    transactionType.forEach((type) => {
      if (type === "All") return;
      chips.push({
        id: `type-${type}`,
        label: type,
        remove: () => setFilters((prev) => ({
          transactionType: (prev.transactionType || []).filter((t) => t !== type),
        })),
      });
    });

    // Category chips
    categories.forEach((catId) => {
      const cat = MOCK_CATEGORIES.find((c) => c.id === catId);
      chips.push({
        id: `cat-${catId}`,
        label: cat ? cat.name : catId,
        remove: () => setFilters((prev) => ({
          categories: (prev.categories || []).filter((c) => c !== catId),
        })),
      });
    });

    // Wallet chips
    wallets.forEach((walletId) => {
      const acc = accounts.find((a) => a.id === walletId);
      chips.push({
        id: `wallet-${walletId}`,
        label: acc ? acc.name : walletId,
        remove: () => setFilters((prev) => ({
          wallets: (prev.wallets || []).filter((w) => w !== walletId),
        })),
      });
    });

    // Payment method chips
    paymentMethods.forEach((method) => {
      chips.push({
        id: `pm-${method}`,
        label: method,
        remove: () => setFilters((prev) => ({
          paymentMethods: (prev.paymentMethods || []).filter((pm) => pm !== method),
        })),
      });
    });

    // Status chips
    status.forEach((st) => {
      chips.push({
        id: `status-${st}`,
        label: st,
        remove: () => setFilters((prev) => ({
          status: (prev.status || []).filter((s) => s !== st),
        })),
      });
    });

    // Date range chip
    if (dateRange.from || dateRange.to) {
      let label = "Date Range";
      if (dateRange.from && dateRange.to) {
        label = `${new Date(dateRange.from).toLocaleDateString()} - ${new Date(dateRange.to).toLocaleDateString()}`;
      } else if (dateRange.from) {
        label = `After ${new Date(dateRange.from).toLocaleDateString()}`;
      } else if (dateRange.to) {
        label = `Before ${new Date(dateRange.to).toLocaleDateString()}`;
      }
      chips.push({
        id: "date-range",
        label,
        remove: () => setFilters({
          dateRange: { from: null, to: null },
        }),
      });
    }

    // Amount range chip
    if (amountRange.min !== null || amountRange.max !== null) {
      let label = "Amount";
      if (amountRange.min !== null && amountRange.max !== null) {
        label = `₹${amountRange.min} - ₹${amountRange.max}`;
      } else if (amountRange.min !== null) {
        label = `≥ ₹${amountRange.min}`;
      } else if (amountRange.max !== null) {
        label = `≤ ₹${amountRange.max}`;
      }
      chips.push({
        id: "amount-range",
        label,
        remove: () => setFilters({
          amountRange: { min: null, max: null },
        }),
      });
    }

    // Merchant search chip
    if (merchant) {
      chips.push({
        id: "merchant",
        label: `"${merchant}"`,
        remove: () => setFilters({ merchant: "" }),
      });
    }

    return chips;
  }, [filters, accounts, setFilters]);

  const removeChip = useCallback((chipId: string) => {
    const chip = activeChips.find((c) => c.id === chipId);
    if (chip) chip.remove();
  }, [activeChips]);

  return {
    filters,
    setFilters,
    resetFilters,
    filteredTransactions,
    activeChips,
    removeChip,
  };
};
