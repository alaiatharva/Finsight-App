import React, { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Drawer } from "./ui/drawer";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { FilterSection } from "./FilterSection";
import { MultiSelectList } from "./MultiSelectList";
import { RangeInput } from "./RangeInput";
import { DateRangePicker } from "./DateRangePicker";
import { SortSelector } from "./SortSelector";
import { FilterState, SortOption } from "@/types/filter";
import { Transaction, Account } from "@/types";
import { MOCK_CATEGORIES } from "@/lib/mock-data";
import { getPaymentMethod, getTransactionStatus } from "@/hooks/useTransactionFilters";

const getSafeFilters = (f: Partial<FilterState> | undefined): FilterState => {
  return {
    transactionType: f?.transactionType || [],
    categories: f?.categories || [],
    wallets: f?.wallets || [],
    paymentMethods: f?.paymentMethods || [],
    status: f?.status || [],
    dateRange: f?.dateRange || { from: null, to: null },
    amountRange: f?.amountRange || { min: null, max: null },
    merchant: f?.merchant || "",
    search: f?.search || "",
    sortBy: f?.sortBy || "latest",
  };
};

interface TransactionFilterModalProps {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
  accounts: Account[];
  currentFilters: FilterState;
  onApply: (filters: FilterState) => void;
  onReset: () => void;
}

export function TransactionFilterModal({
  open,
  onClose,
  transactions,
  accounts,
  currentFilters,
  onApply,
  onReset,
}: TransactionFilterModalProps) {
  // Temporary local state for filters
  const [localFilters, setLocalFilters] = useState<FilterState>(getSafeFilters(currentFilters));

  // Sync local filters when modal opens
  useEffect(() => {
    if (open) {
      setLocalFilters(getSafeFilters(currentFilters));
    }
  }, [open, currentFilters]);

  const updateLocalFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Live count matching transactions based on local filters
  const liveCount = useMemo(() => {
    const {
      transactionType = [],
      categories = [],
      wallets = [],
      paymentMethods = [],
      status = [],
      dateRange = { from: null, to: null },
      amountRange = { min: null, max: null },
      merchant = "",
    } = localFilters || {};

    return transactions.filter((trans) => {
      const acc = accounts.find((a) => a.id === trans.accountId);
      const cat = MOCK_CATEGORIES.find((c) => c.id === trans.categoryId);
      const catName = cat ? cat.name.toLowerCase() : "";

      // 1. Transaction Type
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

      // 3. Wallets
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

      return true;
    }).length;
  }, [transactions, accounts, localFilters]);

  // Formats categories list for MultiSelectList
  const categoryItems = useMemo(() => {
    return MOCK_CATEGORIES.map((cat) => ({
      id: cat.id,
      label: cat.name,
    }));
  }, []);

  // Formats account list for MultiSelectList
  const walletItems = useMemo(() => {
    return accounts.map((acc) => ({
      id: acc.id,
      label: acc.name,
    }));
  }, [accounts]);

  const typeItems = [
    { id: "income", label: "Income" },
    { id: "expense", label: "Expense" },
    { id: "transfer", label: "Transfer" },
    { id: "refund", label: "Refund" },
    { id: "recharge", label: "Recharge" },
  ];

  const paymentItems = [
    { id: "UPI", label: "UPI" },
    { id: "Debit Card", label: "Debit Card" },
    { id: "Credit Card", label: "Credit Card" },
    { id: "Wallet", label: "Wallet" },
    { id: "Cash", label: "Cash" },
    { id: "Net Banking", label: "Net Banking" },
    { id: "Auto Debit", label: "Auto Debit" },
  ];

  const statusItems = [
    { id: "Completed", label: "Completed" },
    { id: "Pending", label: "Pending" },
    { id: "Failed", label: "Failed" },
    { id: "Refunded", label: "Refunded" },
  ];

  const handleResetPress = () => {
    onReset();
    onClose();
  };

  const handleApplyPress = () => {
    onApply(localFilters);
    onClose();
  };

  return (
    <Drawer open={open} onClose={onClose} title="Filter Transactions">
      <ScrollView
        style={{ maxHeight: 420 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View style={{ flexDirection: "column", gap: 16 }}>
          {/* General Merchant Search */}
          <FilterSection title="Search Merchant">
            <Input
              placeholder="e.g. Swiggy, Zomato"
              value={localFilters.merchant}
              onChangeText={(text) => updateLocalFilter("merchant", text)}
            />
          </FilterSection>

          {/* Sort By Radio */}
          <FilterSection title="Sort By">
            <SortSelector
              value={localFilters.sortBy}
              onChange={(val) => updateLocalFilter("sortBy", val)}
            />
          </FilterSection>

          {/* Transaction Type */}
          <FilterSection title="Transaction Type">
            <MultiSelectList
              items={typeItems}
              selectedValues={localFilters.transactionType}
              onChange={(vals) => updateLocalFilter("transactionType", vals)}
              allowAllOption
            />
          </FilterSection>

          {/* Categories */}
          <FilterSection title="Categories">
            <MultiSelectList
              items={categoryItems}
              selectedValues={localFilters.categories}
              onChange={(vals) => updateLocalFilter("categories", vals)}
            />
          </FilterSection>

          {/* Wallets */}
          <FilterSection title="Linked Wallets / Cards">
            <MultiSelectList
              items={walletItems}
              selectedValues={localFilters.wallets}
              onChange={(vals) => updateLocalFilter("wallets", vals)}
            />
          </FilterSection>

          {/* Payment Methods */}
          <FilterSection title="Payment Methods">
            <MultiSelectList
              items={paymentItems}
              selectedValues={localFilters.paymentMethods}
              onChange={(vals) => updateLocalFilter("paymentMethods", vals)}
            />
          </FilterSection>

          {/* Date Ranges */}
          <FilterSection title="Date Range">
            <DateRangePicker
              from={localFilters.dateRange.from}
              to={localFilters.dateRange.to}
              onChange={(fromVal, toVal) =>
                updateLocalFilter("dateRange", { from: fromVal, to: toVal })
              }
            />
          </FilterSection>

          {/* Amount Ranges */}
          <FilterSection title="Amount Range">
            <RangeInput
              min={localFilters.amountRange.min}
              max={localFilters.amountRange.max}
              onChange={(minVal, maxVal) =>
                updateLocalFilter("amountRange", { min: minVal, max: maxVal })
              }
            />
          </FilterSection>

          {/* Transaction Statuses */}
          <FilterSection title="Transaction Status">
            <MultiSelectList
              items={statusItems}
              selectedValues={localFilters.status}
              onChange={(vals) => updateLocalFilter("status", vals)}
            />
          </FilterSection>
        </View>
      </ScrollView>

      {/* Filter Summary and Apply Buttons */}
      <View style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 16, marginTop: 12 }}>
        <Text style={{ color: "#32484F", fontSize: 13, fontWeight: "bold", textAlign: "center", marginBottom: 12 }}>
          {liveCount} transaction{liveCount !== 1 ? "s" : ""} found
        </Text>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" onPress={handleResetPress} className="w-full py-3">
              Reset All
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button variant="default" onPress={handleApplyPress} className="w-full py-3 bg-primary">
              Apply Filters
            </Button>
          </View>
        </View>
      </View>
    </Drawer>
  );
}
