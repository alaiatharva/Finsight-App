import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, ScrollView, useColorScheme, Pressable, TouchableOpacity, Platform, Image, Alert, ActivityIndicator, TextInput } from "react-native";
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Landmark, 
  AlertTriangle, 
  Plus, 
  CreditCard, 
  Wallet, 
  Tag, 
  Check, 
  Info, 
  X,
  Settings,
  Trash2,
  Camera,
  Star,
  Target,
  ChevronLeft,
  ChevronRight
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";
import { resolveApiBaseUrl } from "@/services/apiResolver";
import { scanReceipt } from "@/services/ocrService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { PieChart, BarChart } from "react-native-gifted-charts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountRepository, TransactionRepository, BudgetRepository, GoalRepository } from "@/services/db-repositories";
import { AnimatedEntry } from "@/components/ui/animated-entry";
import { Account, Transaction, Budget, SavingsGoal } from "@/types";
import { MOCK_CATEGORIES } from "@/lib/mock-data";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { AccountSchema, TransactionSchema } from "@/lib/validations";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useCategoryStore } from "@/store/useCategoryStore";
import DateTimePicker from "@react-native-community/datetimepicker";
import { parseSafeDate } from "@/lib/dateUtils";

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { showToast } = useToast();
  const router = useRouter();
  const { getToken } = useAuth();
  const { defaultBankAccountId, setDefaultBankAccountId } = useSettingsStore();

  // Data States
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  // Auto-select latest transaction's month if current month has no data
  useEffect(() => {
    if (transactions.length > 0) {
      const now = new Date();
      const hasCurrentMonthTxn = transactions.some((t) => {
        const tDate = parseSafeDate(t.date);
        return tDate.getFullYear() === now.getFullYear() && tDate.getMonth() === now.getMonth();
      });
      
      if (!hasCurrentMonthTxn) {
        const latestTxn = transactions.reduce((latest, current) => {
          return parseSafeDate(current.date).getTime() > parseSafeDate(latest.date).getTime() ? current : latest;
        }, transactions[0]);
        setSelectedMonth(parseSafeDate(latestTxn.date));
      }
    }
  }, [transactions]);

  // Savings Goal Interaction States
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTargetAmount, setGoalTargetAmount] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState(new Date().toISOString().split("T")[0]);
  const [goalSaving, setGoalSaving] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [goalProgressModalOpen, setGoalProgressModalOpen] = useState(false);
  const [goalProgressAmount, setGoalProgressAmount] = useState("");
  const [showGoalDatePicker, setShowGoalDatePicker] = useState(false);
  const [goalProgressDate, setGoalProgressDate] = useState("");
  const [showGoalProgressDatePicker, setShowGoalProgressDatePicker] = useState(false);

  // Dashboard Filters & Budget States
  const [selectedAccountId, setSelectedAccountId] = useState<string>("ALL");
  const [cashFlowPeriod, setCashFlowPeriod] = useState<"7D" | "30D" | "3M" | "6M" | "1Y">("30D");
  const [budgetLimit, setBudgetLimit] = useState<number>(2000);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [tempBudgetLimit, setTempBudgetLimit] = useState("");
  const [budgetSaving, setBudgetSaving] = useState(false);

  // Custom Account Options states
  const [accountOptionsOpen, setAccountOptionsOpen] = useState(false);
  const [selectedAccountForOptions, setSelectedAccountForOptions] = useState<Account | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // Custom Quick Add States & Interface
  interface QuickAddShortcut {
    id: string;
    amount: number;
    categoryKeyword: string;
    label: string;
  }

  const [quickAdds, setQuickAdds] = useState<QuickAddShortcut[]>([
    { id: "qa-1", amount: 100, categoryKeyword: "Food", label: "Food" },
    { id: "qa-2", amount: 200, categoryKeyword: "Transportation", label: "Travel" },
  ]);
  const [quickAddManageOpen, setQuickAddManageOpen] = useState(false);
  const [qaAmount, setQaAmount] = useState("");
  const [qaLabel, setQaLabel] = useState("");
  const [qaCategoryKeyword, setQaCategoryKeyword] = useState("");
  const [qaCategorySelectorOpen, setQaCategorySelectorOpen] = useState(false);
  const [qaErrors, setQaErrors] = useState<Record<string, string>>({});

  // Load Custom Quick Add Items from AsyncStorage
  useEffect(() => {
    const loadQuickAdds = async () => {
      try {
        const stored = await AsyncStorage.getItem("quick_add_shortcuts");
        if (stored) {
          setQuickAdds(JSON.parse(stored));
        }
      } catch (err) {
        console.error("Failed to load quick adds from storage", err);
      }
    };
    loadQuickAdds();
  }, []);

  const saveQuickAdds = async (items: QuickAddShortcut[]) => {
    try {
      await AsyncStorage.setItem("quick_add_shortcuts", JSON.stringify(items));
      setQuickAdds(items);
    } catch (err) {
      console.error("Failed to save quick adds to storage", err);
      showToast("Failed to save shortcuts", "error");
    }
  };

  const handleCreateQuickAdd = async () => {
    setQaErrors({});
    const errors: Record<string, string> = {};
    const parsedAmount = parseFloat(qaAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.amount = "Enter a valid amount > 0";
    }
    if (!qaLabel.trim()) {
      errors.label = "Label is required";
    }
    if (!qaCategoryKeyword) {
      errors.category = "Category is required";
    }

    if (Object.keys(errors).length > 0) {
      setQaErrors(errors);
      return;
    }

    const newShortcut: QuickAddShortcut = {
      id: `qa-${Math.random().toString(36).substring(2, 9)}`,
      amount: parsedAmount,
      categoryKeyword: qaCategoryKeyword,
      label: qaLabel.trim(),
    };

    const updatedList = [...quickAdds, newShortcut];
    await saveQuickAdds(updatedList);
    showToast("Shortcut added!", "success");
    
    // Reset inputs
    setQaAmount("");
    setQaLabel("");
    setQaCategoryKeyword("");
  };

  const handleDeleteQuickAdd = async (id: string) => {
    const updatedList = quickAdds.filter((qa) => qa.id !== id);
    await saveQuickAdds(updatedList);
    showToast("Shortcut deleted", "success");
  };

  // Add Account Modal Form States
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<"CASH" | "SAVINGS" | "CHECKING" | "CREDIT_CARD">("CHECKING");
  const [accountBalance, setAccountBalance] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>({});
  const [accountTypeSelectorOpen, setAccountTypeSelectorOpen] = useState(false);

  // Add Transaction Modal Form States
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDate(selectedDate.toISOString().split("T")[0]);
      setLowConfidenceFields(prev => prev.filter(f => f !== "date"));
    }
  };
  const [transactionSaving, setTransactionSaving] = useState(false);
  const [transactionErrors, setTransactionErrors] = useState<Record<string, string>>({});
  const [categorySelectorOpen, setCategorySelectorOpen] = useState(false);
  const [accountSelectorOpen, setAccountSelectorOpen] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [ocrStage, setOcrStage] = useState("");
  const [lowConfidenceFields, setLowConfidenceFields] = useState<string[]>([]);

  // Custom Category creation state
  const [newCatName, setNewCatName] = useState("");
  const { addCategory, customCategories } = useCategoryStore();

  const handleCreateCustomCategory = () => {
    if (!newCatName.trim()) {
      showToast("Category name cannot be empty", "error");
      return;
    }
    try {
      const added = addCategory(newCatName, type);
      setCategoryId(added.id);
      setNewCatName("");
      setCategorySelectorOpen(false);
      showToast(`Category "${added.name}" added successfully!`, "success");
    } catch (err) {
      showToast("Failed to add category", "error");
    }
  };

  // Reset category selection when transaction type changes to prevent type mismatches
  useEffect(() => {
    setCategoryId("");
  }, [type]);

  const handleProcessReceiptOCR = async (uri: string) => {
    setScanningReceipt(true);
    setOcrStage("Starting...");
    try {
      const token = await getToken();
      const data = await scanReceipt(uri, token, (stage) => {
        setOcrStage(stage);
      });

      setLowConfidenceFields(data.lowConfidenceFields || []);

      if (data.amount !== undefined) {
        setAmount(data.amount.toString());
      }
      const descVal = data.merchant || data.description || "";
      if (descVal) {
        setDescription(descVal);
      }
      if (data.date) {
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (datePattern.test(data.date)) {
          setDate(data.date);
        } else {
          try {
            const parsedDate = new Date(data.date);
            if (!isNaN(parsedDate.getTime())) {
              setDate(parsedDate.toISOString().split("T")[0]);
            }
          } catch (_) {}
        }
      }
      if (data.categoryId) {
        setCategoryId(data.categoryId);
      }
      setType("EXPENSE");

      showToast("Receipt scanned and form pre-filled!", "success");
    } catch (err: any) {
      console.error("[DEBUG] OCR processing error:", err);
      setLowConfidenceFields([]);
      const msg = err.userMessage || err.message || "";
      showToast(msg || "Failed to parse receipt. You can still input details manually.", "error");
    } finally {
      setScanningReceipt(false);
      setOcrStage("");
    }
  };

  const [attachReceiptOpen, setAttachReceiptOpen] = useState(false);

  const handleAttachReceiptPress = () => {
    setTransactionModalOpen(false);
    setAttachReceiptOpen(true);
  };

  const handleAttachSource = async (source: "camera" | "library") => {
    setAttachReceiptOpen(false);
    try {
      if (source === "camera") {
        const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPerm.granted) {
          showToast("Camera permission is required to take photos.", "error");
          setTransactionModalOpen(true);
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.7,
        });

        if (!result.canceled && result.assets.length > 0) {
          const selectedUri = result.assets[0].uri;
          setReceiptUri(selectedUri);
          setTransactionModalOpen(true);
          await handleProcessReceiptOCR(selectedUri);
        } else {
          setTransactionModalOpen(true);
        }
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          quality: 0.7,
        });

        if (!result.canceled && result.assets.length > 0) {
          const selectedUri = result.assets[0].uri;
          setReceiptUri(selectedUri);
          setTransactionModalOpen(true);
          await handleProcessReceiptOCR(selectedUri);
        } else {
          setTransactionModalOpen(true);
        }
      }
    } catch (err) {
      console.error(`[DEBUG] ${source} access error:`, err);
      showToast(`Failed to access ${source === "camera" ? "camera" : "image library"}.`, "error");
      setTransactionModalOpen(true);
    }
  };

  // Load Dashboard Data
  const loadDashboardData = useCallback(async () => {
    try {
      const accountsData = await AccountRepository.getAll();
      const transactionsData = await TransactionRepository.getAll();
      setAccounts(accountsData);
      setTransactions(transactionsData);

      const budgetsData = await BudgetRepository.getAll();
      const globalBudget = budgetsData.find((b) => b.id === "global-budget" || b.categoryId === "global");
      if (globalBudget) {
        setBudgetLimit(globalBudget.amount);
      } else {
        setBudgetLimit(2000); // default
      }

      const goalsData = await GoalRepository.getAll();
      setGoals(goalsData);
      
      // Auto pre-fill default account for transaction form if empty
      if (accountsData.length > 0 && !accountId) {
        const hasDefault = defaultBankAccountId && accountsData.some(a => a.id === defaultBankAccountId);
        setAccountId(hasDefault ? defaultBankAccountId : accountsData[0].id);
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  }, [accountId, defaultBankAccountId]);

  const handleSaveBudget = async () => {
    const amountVal = parseFloat(tempBudgetLimit);
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }
    setBudgetSaving(true);
    try {
      await BudgetRepository.setLimit({
        id: "global-budget",
        amount: amountVal,
        categoryId: "global",
        period: "MONTHLY",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setBudgetLimit(amountVal);
      setBudgetModalOpen(false);
      showToast("Budget limit updated successfully!", "success");
    } catch (err) {
      showToast("Failed to save budget limit", "error");
    } finally {
      setBudgetSaving(false);
    }
  };

  const handleSaveGoal = async () => {
    const amountVal = parseFloat(goalTargetAmount);
    if (!goalName.trim()) {
      showToast("Please enter a goal name", "error");
      return;
    }
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast("Please enter a valid target amount", "error");
      return;
    }
    setGoalSaving(true);
    try {
      const newGoal: SavingsGoal = {
        id: Math.random().toString(36).substring(7),
        name: goalName.trim(),
        targetAmount: amountVal,
        currentAmount: 0,
        targetDate: goalTargetDate,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await GoalRepository.create(newGoal);
      showToast("Savings Goal created successfully!", "success");
      setGoalModalOpen(false);
      setGoalName("");
      setGoalTargetAmount("");
      await loadDashboardData();
    } catch (err) {
      console.error("Failed to create savings goal", err);
      showToast("Failed to create savings goal", "error");
    } finally {
      setGoalSaving(false);
    }
  };

  const handleUpdateGoalProgress = async () => {
    if (!selectedGoal) return;
    const progressVal = parseFloat(goalProgressAmount);
    if (isNaN(progressVal) || progressVal < 0) {
      showToast("Please enter a valid progress amount", "error");
      return;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(goalProgressDate)) {
      showToast("Please enter a valid target date (YYYY-MM-DD)", "error");
      return;
    }
    try {
      await GoalRepository.updateProgress(selectedGoal.id, progressVal, goalProgressDate);
      showToast("Goal progress updated successfully!", "success");
      setGoalProgressModalOpen(false);
      setGoalProgressAmount("");
      setGoalProgressDate("");
      setSelectedGoal(null);
      await loadDashboardData();
    } catch (err) {
      console.error("Failed to update progress", err);
      showToast("Failed to update progress", "error");
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await GoalRepository.delete(id);
      showToast("Savings Goal deleted successfully!", "success");
      setGoalProgressModalOpen(false);
      setSelectedGoal(null);
      await loadDashboardData();
    } catch (err) {
      console.error("Failed to delete goal", err);
      showToast("Failed to delete goal", "error");
    }
  };

  const getRemainingTimeText = (targetDateStr: string, isCompleted: boolean) => {
    if (isCompleted) return "Completed!";
    const target = new Date(targetDateStr);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffMs = target.getTime() - today.getTime();
    if (diffMs < 0) {
      return "Overdue";
    }
    
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Ends today!";
    if (diffDays === 1) return "1 day left";
    if (diffDays < 30) return `${diffDays} days left`;
    
    const diffMonths = Math.round(diffDays / 30);
    if (diffMonths === 1) return "1 month left";
    return `${diffMonths} months left`;
  };

  const getMonthlyContributionText = (targetAmount: number, currentAmount: number, targetDateStr: string, isCompleted: boolean) => {
    if (isCompleted) return "Goal achieved!";
    const remainingToSave = targetAmount - currentAmount;
    if (remainingToSave <= 0) return "Goal achieved!";

    const target = new Date(targetDateStr);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffMs = target.getTime() - today.getTime();
    if (diffMs <= 0) return "Overdue";

    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 30) {
      const dailyRate = Math.round(remainingToSave / diffDays);
      return `Save ₹${dailyRate}/day`;
    }

    const diffMonths = diffDays / 30.4;
    const monthlyRate = Math.round(remainingToSave / diffMonths);
    return `Save ₹${monthlyRate.toLocaleString("en-IN")}/mo`;
  };

  const handleGoalDateChange = (event: any, selectedDate?: Date) => {
    setShowGoalDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setGoalTargetDate(selectedDate.toISOString().split("T")[0]);
    }
  };

  const handleGoalProgressDateChange = (event: any, selectedDate?: Date) => {
    setShowGoalProgressDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setGoalProgressDate(selectedDate.toISOString().split("T")[0]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const handleCreateAccount = async () => {
    setAccountErrors({});
    const numBalance = parseFloat(accountBalance) || 0;

    const validationResult = AccountSchema.safeParse({
      name: accountName,
      type: accountType,
      balance: numBalance,
    });

    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0].toString()] = issue.message;
        }
      });
      setAccountErrors(errors);
      showToast("Please check account details", "error");
      return;
    }

    setAccountSaving(true);
    try {
      const newAccount: Account = {
        id: `acc-${Math.random().toString(36).substring(2, 9)}`,
        name: accountName,
        type: accountType,
        balance: numBalance,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await AccountRepository.create(newAccount);
      showToast("Account created successfully!", "success");

      // Reset & Reload
      setAccountName("");
      setAccountType("CHECKING");
      setAccountBalance("");
      setAccountModalOpen(false);
      loadDashboardData();
    } catch (err) {
      showToast("Failed to create account", "error");
    } finally {
      setAccountSaving(false);
    }
  };

  const handleDeleteAccount = (acc: Account) => {
    setAccountToDelete(acc);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteAccount = async () => {
    if (!accountToDelete) return;
    const acc = accountToDelete;
    try {
      await AccountRepository.delete(acc.id);
      if (defaultBankAccountId === acc.id) {
        setDefaultBankAccountId(null);
      }
      showToast(`${acc.name} deleted successfully`, "success");
      loadDashboardData();
    } catch (err) {
      console.error("Failed to delete account", err);
      showToast("Failed to delete account", "error");
    } finally {
      setDeleteConfirmOpen(false);
      setAccountToDelete(null);
    }
  };

  const handleCreateTransaction = async () => {
    setTransactionErrors({});
    const numAmount = parseFloat(amount) || 0;

    const validationResult = TransactionSchema.safeParse({
      amount: numAmount,
      date,
      description,
      type,
      categoryId,
      accountId,
      isRecurring,
    });

    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0].toString()] = issue.message;
        }
      });
      setTransactionErrors(errors);
      const errorMsg = validationResult.error.issues.map((i) => i.message).join(", ");
      showToast(errorMsg || "Please check transaction details", "error");
      return;
    }

    setTransactionSaving(true);
    try {
      const newTrans: Transaction = {
        id: `t-${Math.random().toString(36).substring(2, 9)}`,
        amount: numAmount,
        date: new Date(date).toISOString(),
        description,
        type,
        categoryId,
        accountId,
        receiptUrl: receiptUri || undefined,
        isRecurring,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await TransactionRepository.create(newTrans);
      showToast("Transaction saved successfully!", "success");

      // Reset & Reload
      setDescription("");
      setAmount("");
      setCategoryId("");
      setReceiptUri(null);
      setDate(new Date().toISOString().split("T")[0]);
      setIsRecurring(false);
      setLowConfidenceFields([]);
      setTransactionModalOpen(false);
      loadDashboardData();
    } catch (err) {
      showToast("Failed to save transaction", "error");
    } finally {
      setTransactionSaving(false);
    }
  };

  const handleQuickAdd = async (amountVal: number, categoryKeyword: string, label: string) => {
    if (accounts.length === 0) {
      showToast("Link an account card first!", "error");
      return;
    }

    const cat = MOCK_CATEGORIES.find((c) =>
      c.name.toLowerCase().includes(categoryKeyword.toLowerCase())
    );

    if (!cat) {
      showToast("Category mapping mismatch", "error");
      return;
    }

    try {
      const hasDefault = defaultBankAccountId && accounts.some((a) => a.id === defaultBankAccountId);
      const defaultAccount = hasDefault 
        ? accounts.find((a) => a.id === defaultBankAccountId) || accounts[0]
        : accounts[0];
      const newTrans: Transaction = {
        id: `t-${Math.random().toString(36).substring(2, 9)}`,
        amount: amountVal,
        date: new Date().toISOString(),
        description: `Quick Add: ${label}`,
        type: cat.type as "INCOME" | "EXPENSE",
        categoryId: cat.id,
        accountId: defaultAccount.id,
        isRecurring: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await TransactionRepository.create(newTrans);
      showToast(`Added: ₹${amountVal} for ${label}!`, "success");
      loadDashboardData();
    } catch (err) {
      console.error(err);
      showToast("Failed to perform quick add", "error");
    }
  };

  // Filtered transactions based on selectedAccountId
  const filteredTransactions = useMemo(() => {
    if (selectedAccountId === "ALL") {
      return transactions;
    }
    return transactions.filter((t) => t.accountId === selectedAccountId);
  }, [transactions, selectedAccountId]);

  // Selected account or total balance (memoized)
  const displayBalance = useMemo(() => {
    if (selectedAccountId === "ALL") {
      return accounts.reduce((sum, acc) => sum + acc.balance, 0);
    }
    const acc = accounts.find((a) => a.id === selectedAccountId);
    return acc ? acc.balance : 0;
  }, [accounts, selectedAccountId]);
  
  // Format currency (stable reference)
  const formatCurrency = useCallback((amount: number) => {
    const isNegative = amount < 0;
    const formatted = Math.abs(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${isNegative ? "-" : ""}₹${formatted}`;
  }, []);

  // Monthly inflow and outflow aggregates (memoized)
  const { inflow, outflow } = useMemo(() => {
    const currentYear = selectedMonth.getFullYear();
    const currentMonth = selectedMonth.getMonth();
    let inf = 0;
    let outf = 0;
    
    filteredTransactions.forEach((t) => {
      const tDate = parseSafeDate(t.date);
      if (tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth) {
        if (t.type === "INCOME") {
          inf += t.amount;
        } else {
          outf += t.amount;
        }
      }
    });
    
    return { inflow: inf, outflow: outf };
  }, [filteredTransactions, selectedMonth]);

  // Outflow trends bar chart (memoized)
  const cashFlowChartData = useMemo(() => {
    const data = [];
    const now = new Date(selectedMonth);
    const today = new Date();
    
    // If it's a past month, set the date to the end of that month so we see the full history for that month
    if (now.getFullYear() !== today.getFullYear() || now.getMonth() !== today.getMonth()) {
      now.setMonth(now.getMonth() + 1);
      now.setDate(0); // last day of selectedMonth
      now.setHours(23, 59, 59, 999);
    }
    
    if (cashFlowPeriod === "7D") {
      const daysLabel = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        d.setHours(0, 0, 0, 0);
        
        const start = d.getTime();
        const end = start + 86400000;
        const label = daysLabel[d.getDay()];
        
        const spent = filteredTransactions
          .filter((t) => {
            if (t.type !== "EXPENSE") return false;
            const tTime = parseSafeDate(t.date).getTime();
            return tTime >= start && tTime < end;
          })
          .reduce((sum, t) => sum + t.amount, 0);
          
        data.push({
          value: spent,
          label: label,
          frontColor: spent > 0 ? "#CAA166" : "#e2e8f0",
        });
      }
    } 
    else if (cashFlowPeriod === "30D") {
      // Group by 5-day intervals (6 bars total)
      for (let i = 5; i >= 0; i--) {
        const startD = new Date(now);
        startD.setDate(now.getDate() - (i * 5 + 4));
        startD.setHours(0, 0, 0, 0);
        
        const endD = new Date(now);
        endD.setDate(now.getDate() - (i * 5));
        endD.setHours(23, 59, 59, 999);
        
        const start = startD.getTime();
        const end = endD.getTime();
        const label = `${startD.getDate()}/${startD.getMonth() + 1}`;
        
        const spent = filteredTransactions
          .filter((t) => {
            if (t.type !== "EXPENSE") return false;
            const tTime = parseSafeDate(t.date).getTime();
            return tTime >= start && tTime <= end;
          })
          .reduce((sum, t) => sum + t.amount, 0);
          
        data.push({
          value: spent,
          label: label,
          frontColor: spent > 0 ? "#CAA166" : "#e2e8f0",
        });
      }
    } 
    else {
      // 3M, 6M, 1Y (Grouped by month)
      const monthsLabel = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthsCount = cashFlowPeriod === "3M" ? 3 : cashFlowPeriod === "6M" ? 6 : 12;
      
      for (let i = monthsCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(now.getMonth() - i);
        
        const startD = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
        const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        
        const start = startD.getTime();
        const end = endD.getTime();
        const label = monthsLabel[startD.getMonth()];
        
        const spent = filteredTransactions
          .filter((t) => {
            if (t.type !== "EXPENSE") return false;
            const tTime = parseSafeDate(t.date).getTime();
            return tTime >= start && tTime <= end;
          })
          .reduce((sum, t) => sum + t.amount, 0);
          
        data.push({
          value: spent,
          label: label,
          frontColor: spent > 0 ? "#CAA166" : "#e2e8f0",
        });
      }
    }
    return data;
  }, [filteredTransactions, cashFlowPeriod, selectedMonth]);

  const chartLayoutConfig = useMemo(() => {
    switch (cashFlowPeriod) {
      case "7D":
        return { barWidth: 22, spacing: 18 };
      case "30D":
        return { barWidth: 22, spacing: 16 };
      case "3M":
        return { barWidth: 44, spacing: 38 };
      case "6M":
        return { barWidth: 22, spacing: 18 };
      case "1Y":
        return { barWidth: 11, spacing: 8 };
      default:
        return { barWidth: 22, spacing: 18 };
    }
  }, [cashFlowPeriod]);

  // Group current month's expenses by category (for selected account)
  const categoryPieData = useMemo(() => {
    const currentYear = selectedMonth.getFullYear();
    const currentMonth = selectedMonth.getMonth();
    
    const categoryTotals: Record<string, number> = {};
    
    filteredTransactions.forEach((t) => {
      const tDate = parseSafeDate(t.date);
      if (
        t.type === "EXPENSE" &&
        tDate.getFullYear() === currentYear &&
        tDate.getMonth() === currentMonth
      ) {
        categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + t.amount;
      }
    });

    const totalExpense = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

    return MOCK_CATEGORIES.map((cat) => {
      const amount = categoryTotals[cat.id] || 0;
      const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
      return {
        id: cat.id,
        name: cat.name,
        value: amount,
        percentage,
        color: cat.color || "#cbd5e1",
      };
    }).filter(item => item.value > 0);
  }, [filteredTransactions, selectedMonth]);

  const pieChartData = useMemo(() => {
    return categoryPieData.map((item) => ({
      value: item.value,
      color: item.color,
      text: `${item.percentage.toFixed(0)}%`,
    }));
  }, [categoryPieData]);

  const budgetProgressInfo = useMemo(() => {
    const limit = budgetLimit;
    const spent = outflow;
    const remaining = Math.max(0, limit - spent);
    const percent = limit > 0 ? (spent / limit) * 100 : 0;
    
    let progressColor = "#10B981"; // green
    let textAlert = "Healthy Budget";
    let bgAlertClass = "bg-emerald-50 border-emerald-200 text-emerald-700";
    
    if (percent >= 90) {
      progressColor = "#EF4444"; // red
      textAlert = "Budget limit almost exceeded! Consider trimming non-essential outflows.";
      bgAlertClass = "bg-red-50 border-red-200 text-red-700";
    } else if (percent >= 75) {
      progressColor = "#F59E0B"; // yellow
      textAlert = "Approaching spending limit. Maintain cautious spending.";
      bgAlertClass = "bg-amber-50 border-amber-200 text-amber-700";
    }
    
    return {
      limit,
      spent,
      remaining,
      percent: Math.min(100, percent),
      rawPercent: percent,
      progressColor,
      textAlert,
      bgAlertClass,
    };
  }, [budgetLimit, outflow]);

  const dynamicHealthScore = useMemo(() => {
    if (inflow === 0) {
      return { score: 50, label: "Fair", colorClass: "text-amber-600", desc: "No active income recorded yet. Add transactions to generate your score." };
    }
    
    const savingsRate = ((inflow - outflow) / inflow) * 100;
    let score = 60 + Math.round(savingsRate * 0.3); // Base 60, scale up/down with savings rate
    
    // Deduct points if budget limit is exceeded
    if (budgetLimit > 0 && outflow > budgetLimit) {
      const excessPercent = ((outflow - budgetLimit) / budgetLimit) * 100;
      score -= Math.min(25, Math.round(excessPercent * 0.2));
    }
    
    // Keep score in 10-100 range
    score = Math.max(10, Math.min(100, score));
    
    let label = "Good";
    let colorClass = "text-emerald-600";
    let desc = "You are doing well overall. Small spending adjustments can improve this score.";
    
    if (score >= 85) {
      label = "Excellent";
      colorClass = "text-emerald-700 font-extrabold";
      desc = "Outstanding job! Your savings rate is healthy and expenses are well within control.";
    } else if (score >= 70) {
      label = "Good";
      colorClass = "text-emerald-600 font-semibold";
      desc = "Your finances are in good shape. Maintain your current savings habit.";
    } else if (score >= 45) {
      label = "Fair";
      colorClass = "text-amber-500 font-semibold";
      desc = "Balanced, but you have room to optimize. Focus on reducing variable expenses.";
    } else {
      label = "Poor";
      colorClass = "text-red-500 font-semibold";
      desc = "Caution: High outflows relative to income. Consider pausing discretionary purchases.";
    }
    
    return { score, label, colorClass, desc };
  }, [inflow, outflow, budgetLimit]);

  const spendingAlertJSX = useMemo(() => {
    const percentUsed = budgetLimit > 0 ? (outflow / budgetLimit) * 100 : 0;
    
    if (budgetLimit === 0) {
      return (
        <Text className="text-slate-600 text-xs leading-relaxed">
          You spent <Text className="font-bold text-slate-900">{formatCurrency(outflow)}</Text> this month. Add a budget limit to set up spending thresholds.
        </Text>
      );
    }
    
    if (percentUsed >= 100) {
      return (
        <Text className="text-slate-600 text-xs leading-relaxed">
          Warning: Spent <Text className="font-bold text-red-600">{formatCurrency(outflow)}</Text>, exceeding your budget of <Text className="font-semibold text-slate-800">{formatCurrency(budgetLimit)}</Text> by <Text className="font-extrabold text-red-600">{(percentUsed - 100).toFixed(0)}%</Text>!
        </Text>
      );
    }
    
    if (percentUsed >= 75) {
      return (
        <Text className="text-slate-600 text-xs leading-relaxed">
          Caution: Spent <Text className="font-bold text-slate-900">{formatCurrency(outflow)}</Text>, using <Text className="font-extrabold text-amber-600">{percentUsed.toFixed(0)}%</Text> of your <Text className="font-semibold text-slate-800">{formatCurrency(budgetLimit)}</Text> budget limit.
        </Text>
      );
    }
    
    return (
      <Text className="text-slate-600 text-xs leading-relaxed">
        Good: Spent <Text className="font-bold text-emerald-600">{formatCurrency(outflow)}</Text>, utilizing only <Text className="font-extrabold text-emerald-600">{percentUsed.toFixed(0)}%</Text> of your <Text className="font-semibold text-slate-800">{formatCurrency(budgetLimit)}</Text> budget limit.
      </Text>
    );
  }, [outflow, budgetLimit, formatCurrency]);

  const topCategoryJSX = useMemo(() => {
    if (categoryPieData.length === 0) {
      return (
        <Text className="text-slate-600 text-xs leading-relaxed">
          No expense trend yet for this month.
        </Text>
      );
    }
    
    const topCat = categoryPieData[0];
    return (
      <Text className="text-slate-600 text-xs leading-relaxed">
        Your highest expenditure is on <Text className="font-bold text-slate-900">{topCat.name}</Text>, with a total of <Text className="font-bold text-slate-900">{formatCurrency(topCat.value)}</Text> (<Text className="font-semibold text-[#b45309]">{topCat.percentage.toFixed(1)}%</Text> of total spent).
      </Text>
    );
  }, [categoryPieData, formatCurrency]);

  const savingsTipJSX = useMemo(() => {
    if (outflow === 0) {
      return (
        <Text className="text-slate-600 text-xs leading-relaxed">
          Add a few expense entries to unlock personalized savings tips.
        </Text>
      );
    }
    
    const savingsRate = inflow > 0 ? ((inflow - outflow) / inflow) * 100 : -100;
    
    if (savingsRate < 0) {
      return (
        <Text className="text-slate-600 text-xs leading-relaxed">
          Tip: Your monthly outflows <Text className="font-semibold text-red-600">exceed</Text> income. Pause non-essential subscription services or delay large electronics purchases.
        </Text>
      );
    }
    
    if (categoryPieData.length > 0) {
      const topCat = categoryPieData[0];
      if (topCat.name.toLowerCase().includes("food")) {
        return (
          <Text className="text-slate-600 text-xs leading-relaxed">
            Tip: <Text className="font-bold text-slate-900">{topCat.name}</Text> is your top expense (<Text className="font-semibold text-sky-700">{topCat.percentage.toFixed(0)}%</Text>). Meal prep or cooking at home can cut this category in half.
          </Text>
        );
      } else if (topCat.name.toLowerCase().includes("shop")) {
        return (
          <Text className="text-slate-600 text-xs leading-relaxed">
            Tip: <Text className="font-bold text-slate-900">{topCat.name}</Text> is your top expense (<Text className="font-semibold text-sky-700">{topCat.percentage.toFixed(0)}%</Text>). Try the <Text className="font-medium text-slate-800">'24-hour cooling rule'</Text> before checking out items.
          </Text>
        );
      } else if (topCat.name.toLowerCase().includes("entertain")) {
        return (
          <Text className="text-slate-600 text-xs leading-relaxed">
            Tip: <Text className="font-bold text-slate-900">{topCat.name}</Text> is your top expense (<Text className="font-semibold text-sky-700">{topCat.percentage.toFixed(0)}%</Text>). Look for local free community events or split subscription costs.
          </Text>
        );
      }
    }
    
    return (
      <Text className="text-slate-600 text-xs leading-relaxed">
        Tip: Automate your savings by transferring <Text className="font-bold text-emerald-600">10-15%</Text> of your income to a separate savings account on payday.
      </Text>
    );
  }, [inflow, outflow, categoryPieData]);

  return (
    <>
      <ScrollView className="flex-1 bg-[#F8FBFC] px-4 py-6">
      
      {/* Quick Add Section */}
      <AnimatedEntry delay={0}>
        <View className="mb-6 bg-primary p-4 rounded-3xl flex-row items-center justify-between">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ alignItems: "center" }}
            className="flex-1"
          >
            <View className="flex-row items-center gap-3">
              <Text className="text-white font-medium text-sm">Quick Add:</Text>
              <View className="flex-row gap-2">
                {quickAdds.length === 0 ? (
                  <Text className="text-white/50 text-2xs italic">No shortcuts yet</Text>
                ) : (
                  quickAdds.map((qa) => (
                    <TouchableOpacity 
                      key={qa.id}
                      onPress={() => handleQuickAdd(qa.amount, qa.categoryKeyword, qa.label)}
                      className="bg-[#ffffff1a] px-3.5 py-1.5 rounded-full border border-[#ffffff33] active:bg-[#ffffff2d]"
                    >
                      <Text className="text-white text-xs font-bold">+₹{qa.amount} {qa.label}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          </ScrollView>
          <TouchableOpacity 
            onPress={() => setQuickAddManageOpen(true)}
            className="ml-2 w-8 h-8 rounded-full bg-[#ffffff15] items-center justify-center border border-[#ffffff20] active:bg-[#ffffff30]"
          >
            <Settings size={14} color="white" />
          </TouchableOpacity>
        </View>
      </AnimatedEntry>

      {/* Header & Filters */}
      <AnimatedEntry delay={80}>
        <View className="mb-6 flex-row justify-between items-center">
          <View className="flex-1 mr-3">
            <Text className="text-2xl font-extrabold text-primary mb-1">Dashboard Overview</Text>
            <Text className="text-slate-500 text-xs" numberOfLines={2}>This is your overview report for the selected period</Text>
          </View>
          <TouchableOpacity 
            onPress={() => {
              setDescription("");
              setAmount("");
              setCategoryId("");
              setReceiptUri(null);
              setDate(new Date().toISOString().split("T")[0]);
              setIsRecurring(false);
              setTransactionErrors({});
              setLowConfidenceFields([]);
              
              const hasDefault = defaultBankAccountId && accounts.some(a => a.id === defaultBankAccountId);
              setAccountId(hasDefault ? defaultBankAccountId : (accounts[0]?.id || ""));
              
              setTransactionModalOpen(true);
            }}
            className="bg-[#CAA166] px-4 py-2.5 rounded-xl shadow-sm active:opacity-85"
          >
            <Text className="text-white font-bold text-xs">+ Add Transaction</Text>
          </TouchableOpacity>
        </View>
      </AnimatedEntry>

      {/* Month/Period Selector */}
      <AnimatedEntry delay={90}>
        <View className="mb-6 flex-row justify-between items-center bg-white border border-[#DDE4E5] rounded-2xl px-4 py-2.5 shadow-sm">
          <TouchableOpacity 
            onPress={() => {
              setSelectedMonth(prev => {
                const d = new Date(prev);
                d.setMonth(d.getMonth() - 1);
                return d;
              });
            }}
            className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 items-center justify-center active:bg-slate-100"
          >
            <ChevronLeft size={16} color="#32484F" />
          </TouchableOpacity>
          
          <Text className="text-primary font-bold text-xs">
            {selectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}
          </Text>
          
          <TouchableOpacity 
            onPress={() => {
              setSelectedMonth(prev => {
                const d = new Date(prev);
                d.setMonth(d.getMonth() + 1);
                return d;
              });
            }}
            className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 items-center justify-center active:bg-slate-100"
          >
            <ChevronRight size={16} color="#32484F" />
          </TouchableOpacity>
        </View>
      </AnimatedEntry>

      {/* Account Selector Capsules */}
      <AnimatedEntry delay={100}>
        <View className="mb-6">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, flexDirection: "row" }}
          >
            <TouchableOpacity
              onPress={() => setSelectedAccountId("ALL")}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 9999,
                borderWidth: 1,
                borderColor: selectedAccountId === "ALL" ? "#32484F" : "#DDE4E5",
                backgroundColor: selectedAccountId === "ALL" ? "#32484F" : "white",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "bold",
                  color: selectedAccountId === "ALL" ? "white" : "#32484F",
                }}
              >
                All Accounts
              </Text>
            </TouchableOpacity>

            {accounts.map((acc) => {
              const isSelected = selectedAccountId === acc.id;
              return (
                <TouchableOpacity
                  key={acc.id}
                  onPress={() => setSelectedAccountId(acc.id)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 9999,
                    borderWidth: 1,
                    borderColor: isSelected ? "#32484F" : "#DDE4E5",
                    backgroundColor: isSelected ? "#32484F" : "white",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: isSelected ? "white" : "#32484F",
                    }}
                  >
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </AnimatedEntry>

      {/* My Accounts & Cards Horizontal Carousel */}
      <AnimatedEntry delay={120}>
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-primary font-bold text-base">My Accounts & Cards</Text>
            <TouchableOpacity 
              onPress={() => setAccountModalOpen(true)}
              className="bg-[#32484F]/10 px-3.5 py-1.5 rounded-full active:opacity-75 border border-[#32484F]/20"
            >
              <Text className="text-primary font-bold text-xs">+ Add Account</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
            className="flex-row py-1"
          >
            {accounts.length === 0 ? (
              <TouchableOpacity 
                onPress={() => setAccountModalOpen(true)}
                className="w-44 bg-white border border-[#DDE4E5] border-dashed rounded-3xl p-4 mr-3 items-center justify-center h-32 active:bg-slate-50"
              >
                <Landmark size={20} color="#6E858B" style={{ marginBottom: 4 }} />
                <Text className="text-slate-600 font-bold text-xs">No accounts yet</Text>
                <Text className="text-slate-400 text-3xs text-center mt-1">Tap to link a card/wallet</Text>
              </TouchableOpacity>
            ) : (
              <>
                {accounts.map((acc) => {
                  const isCredit = acc.type === "CREDIT_CARD";
                  const isSavings = acc.type === "SAVINGS";
                  const isCash = acc.type === "CASH";
                  
                  const isDefault = defaultBankAccountId === acc.id;
                  const borderClass = isDefault 
                    ? "border-[#CAA166] border-[1.5px]" 
                    : "border-[#DDE4E5] border";
                  const bgClass = isDefault 
                    ? "bg-[#FDFBF7]" 
                    : "bg-white";
                  const textTitleClass = "text-slate-900";
                  const textBalanceClass = "text-[#CAA166]";
                  const iconColor = "#32484F";
                  
                  return (
                    <TouchableOpacity 
                      key={acc.id}
                      onPress={() => {
                        setSelectedAccountForOptions(acc);
                        setAccountOptionsOpen(true);
                      }}
                      className={`w-44 rounded-3xl p-4 mr-3 shadow-sm justify-between h-32 active:opacity-90 ${borderClass} ${bgClass}`}
                    >
                      <View className="flex-row justify-between items-center">
                        <View className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center">
                          {isCredit ? (
                            <CreditCard size={14} color={iconColor} />
                          ) : isCash ? (
                            <Wallet size={14} color={iconColor} />
                          ) : (
                            <Landmark size={14} color={iconColor} />
                          )}
                        </View>
                        <Badge variant={isCredit ? "destructive" : "success"}>
                          {acc.type === "CREDIT_CARD" ? "CREDIT" : acc.type.replace("_", " ")}
                        </Badge>
                      </View>
                      <View className="mt-2">
                        <View className="flex-row items-center gap-1">
                          <Text className={`font-bold text-2xs tracking-tight ${textTitleClass}`} numberOfLines={1}>
                            {acc.name}
                          </Text>
                          {isDefault && (
                            <Star size={10} color="#D97706" fill="#D97706" />
                          )}
                        </View>
                        <Text className={`font-extrabold text-xs mt-0.5 ${textBalanceClass}`}>
                          {formatCurrency(acc.balance)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                
                <TouchableOpacity 
                  onPress={() => setAccountModalOpen(true)}
                  className="w-40 bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-4 items-center justify-center h-32 active:bg-slate-100"
                >
                  <Plus size={20} color="#94A3B8" style={{ marginBottom: 4 }} />
                  <Text className="text-slate-500 font-bold text-xs">Add Account</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </AnimatedEntry>

      {/* Stat Cards Grid */}
      <AnimatedEntry delay={160}>
        <View className="flex-row flex-wrap justify-between mb-6 gap-y-3">
          <View className="w-[48%] bg-primary p-4 rounded-2xl shadow-md">
            <Text className="text-[#ffffffb3] text-xs mb-1 font-medium">Available Balance</Text>
            <Text className="text-[#EEF6F8] text-xl font-bold">{formatCurrency(displayBalance)}</Text>
          </View>
          <View className="w-[48%] bg-primary p-4 rounded-2xl shadow-md">
            <Text className="text-[#ffffffb3] text-xs mb-1 font-medium">Total Income</Text>
            <Text className="text-[#EEF6F8] text-xl font-bold">{formatCurrency(inflow)}</Text>
          </View>
          <View className="w-[48%] bg-primary p-4 rounded-2xl shadow-md">
            <Text className="text-[#ffffffb3] text-xs mb-1 font-medium">Total Expenses</Text>
            <Text className="text-[#fca5a5] text-xl font-bold">-{formatCurrency(outflow)}</Text>
          </View>
          <View className="w-[48%] bg-primary p-4 rounded-2xl shadow-md">
            <Text className="text-[#ffffffb3] text-xs mb-1 font-medium">Savings Rate</Text>
            <Text className="text-[#CAA166] text-xl font-bold">{inflow > 0 ? ((inflow - outflow) / inflow * 100).toFixed(1) : 0}%</Text>
          </View>
        </View>
      </AnimatedEntry>

      {/* Savings Goals Section */}
      <AnimatedEntry delay={200}>
        <View className="mb-6 bg-white border border-[#DDE4E5] rounded-3xl p-5 shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-1 mr-3">
              <Text className="text-primary font-bold text-lg mb-0.5">Savings Goals</Text>
              <Text className="text-slate-500 text-xs" numberOfLines={1} ellipsizeMode="tail">
                Track and fund your long-term savings targets
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                setGoalName("");
                setGoalTargetAmount("");
                setGoalTargetDate(new Date().toISOString().split("T")[0]);
                setGoalModalOpen(true);
              }}
              className="bg-[#32484F]/10 px-3.5 py-1.5 rounded-full active:opacity-75 border border-[#32484F]/20 shrink-0"
            >
              <Text className="text-primary font-bold text-xs">+ Add Goal</Text>
            </TouchableOpacity>
          </View>

          {goals.length === 0 ? (
            <TouchableOpacity 
              onPress={() => {
                setGoalName("");
                setGoalTargetAmount("");
                setGoalTargetDate(new Date().toISOString().split("T")[0]);
                setGoalModalOpen(true);
              }}
              className="border border-dashed border-slate-200 rounded-2xl py-6 px-4 items-center justify-center bg-slate-50 active:bg-slate-100"
            >
              <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mb-2">
                <Target size={20} color="#64748B" />
              </View>
              <Text className="text-slate-700 font-bold text-xs mb-0.5">No Savings Goals Set</Text>
              <Text className="text-slate-400 text-2xs text-center px-4">Tap to set up a target (e.g. Vacation, Emergency Fund, Tech Upgrade)</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="flex-row"
              contentContainerStyle={{ paddingRight: 10 }}
            >
              {goals.map((g) => {
                const pct = g.targetAmount > 0 ? Math.min(100, Math.max(0, (g.currentAmount / g.targetAmount) * 100)) : 0;
                
                const targetDateObj = new Date(g.targetDate);
                const currentYear = new Date().getFullYear();
                const showYear = targetDateObj.getFullYear() !== currentYear;
                const formattedDate = targetDateObj.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  ...(showYear ? { year: "numeric" } : {})
                });

                const isCompleted = g.status === "COMPLETED" || pct >= 100;
                const remainingText = getRemainingTimeText(g.targetDate, isCompleted);
                const isOverdue = remainingText === "Overdue";
                const monthlyRateText = getMonthlyContributionText(g.targetAmount, g.currentAmount, g.targetDate, isCompleted);
                
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => {
                      setSelectedGoal(g);
                      setGoalProgressAmount(g.currentAmount.toString());
                      setGoalProgressDate(g.targetDate.split("T")[0]);
                      setGoalProgressModalOpen(true);
                    }}
                    className={`w-64 bg-slate-50 border border-slate-100 rounded-2xl p-4 mr-3 active:bg-slate-100/80 h-[135px] justify-between ${
                      isCompleted ? "border-emerald-100 bg-[#f0fdf4]" : isOverdue ? "border-red-100 bg-red-50/10" : ""
                    }`}
                  >
                    <View className="flex-row justify-between items-center">
                      <Text className="text-slate-900 font-bold text-sm tracking-tight flex-1 mr-2" numberOfLines={1}>
                        {g.name}
                      </Text>
                      <View className={`rounded-full px-2 py-0.5 ${isCompleted ? "bg-emerald-100" : "bg-slate-100"}`}>
                        <Text className={`font-bold text-[10px] ${isCompleted ? "text-emerald-700" : "text-slate-600"}`}>
                          {isCompleted ? "Completed" : `${pct.toFixed(0)}%`}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center my-0.5">
                      <Text className="text-slate-400 text-[10px]" numberOfLines={1}>
                        Target: {formattedDate}
                      </Text>
                      <Text 
                        numberOfLines={1}
                        className={`text-[10px] font-semibold ${
                          isCompleted ? "text-emerald-600" : isOverdue ? "text-red-500" : "text-amber-600"
                        }`}
                      >
                        {remainingText}
                      </Text>
                    </View>

                    <View className="mt-1">
                      <View className="mb-1 flex-row">
                        <Text className="text-slate-800 font-bold text-xs" numberOfLines={1}>
                          {formatCurrency(g.currentAmount).replace(/\.00$/, "")}
                          <Text className="text-slate-400 font-normal text-[10px]"> of {formatCurrency(g.targetAmount).replace(/\.00$/, "")}</Text>
                        </Text>
                      </View>

                      {/* Custom Progress Bar */}
                      <View className="h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                        <View 
                          style={{ width: `${pct}%` }} 
                          className={`h-full rounded-full ${isCompleted ? "bg-emerald-500" : isOverdue ? "bg-red-400" : "bg-[#32484F]"}`}
                        />
                      </View>

                      {/* Monthly Savings Rate Indicator */}
                      {!isCompleted && !isOverdue && (
                        <Text className="text-primary font-bold text-[10px] italic mt-1.5" numberOfLines={1}>
                          • {monthlyRateText} required
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </AnimatedEntry>

      {/* AI Insights */}
      <AnimatedEntry delay={240}>
        <View className="mb-6 bg-white border border-[#DDE4E5] rounded-3xl p-5 shadow-sm">
          <Text className="text-primary font-bold text-lg mb-1">AI Insights</Text>
          <Text className="text-slate-500 text-xs mb-4">Personalized suggestions based on this month&apos;s spending pattern</Text>
          
          <View className="flex-col gap-4">
            {/* Financial Health Score Row */}
            <View className="flex-row items-start bg-[#f0fdf4] border border-[#bbf7d0] p-4 rounded-2xl">
              <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mr-3 mt-1.5">
                <Sparkles size={16} color="#059669" />
              </View>
              <View className="flex-1">
                <Text className="text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
                  Financial Health Score
                </Text>
                <Text className="text-slate-900 font-black text-2xl mb-1.5">
                  {dynamicHealthScore.score}
                  <Text className="text-slate-400 text-xs font-normal">/100</Text>
                  <Text className={`text-base font-extrabold ${dynamicHealthScore.colorClass}`}>
                    {" "}· {dynamicHealthScore.label}
                  </Text>
                </Text>
                <Text className="text-slate-600 text-xs leading-relaxed">
                  {dynamicHealthScore.desc}
                </Text>
              </View>
            </View>

            {/* Spending Alert Row */}
            <View className="flex-row items-start bg-[#fef2f2] border border-[#fecaca] p-4 rounded-2xl">
              <View className="w-8 h-8 rounded-full bg-red-100 items-center justify-center mr-3 mt-0.5">
                <AlertTriangle size={16} color="#dc2626" />
              </View>
              <View className="flex-1">
                <Text className="text-red-800 text-xs font-bold uppercase tracking-wider mb-1">Spending Alert</Text>
                {spendingAlertJSX}
              </View>
            </View>

            {/* Top Category Row */}
            <View className="flex-row items-start bg-[#fffbeb] border border-[#fde68a] p-4 rounded-2xl">
              <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center mr-3 mt-0.5">
                <Tag size={16} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text className="text-[#b45309] text-xs font-bold uppercase tracking-wider mb-1">Top Expense Category</Text>
                {topCategoryJSX}
              </View>
            </View>

            {/* Savings Tip Row */}
            <View className="flex-row items-start bg-[#f0f9ff] border border-[#bae6fd] p-4 rounded-2xl">
              <View className="w-8 h-8 rounded-full bg-sky-100 items-center justify-center mr-3 mt-0.5">
                <Info size={16} color="#0284c7" />
              </View>
              <View className="flex-1">
                <Text className="text-[#0369a1] text-xs font-bold uppercase tracking-wider mb-1">Savings Tip</Text>
                {savingsTipJSX}
              </View>
            </View>
          </View>
        </View>
      </AnimatedEntry>

      {/* Monthly Budget Card */}
      <AnimatedEntry delay={260}>
        <View className="mb-6 bg-white border border-[#DDE4E5] rounded-3xl p-5 shadow-sm">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-1 mr-2">
              <Text className="text-primary font-bold text-lg mb-0.5">Monthly Budget Progress</Text>
              <Text className="text-slate-500 text-xs" numberOfLines={2}>Based on current month expenses for selected view</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setTempBudgetLimit(budgetLimit.toString());
                setBudgetModalOpen(true);
              }}
              style={{
                backgroundColor: "rgba(50, 72, 79, 0.1)",
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 9999,
                borderWidth: 1,
                borderColor: "rgba(50, 72, 79, 0.2)",
              }}
              className="active:opacity-75"
            >
              <Text className="text-primary font-bold text-xs">Set Limit</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-between items-end mb-2">
            <View>
              <Text className="text-2xs text-slate-400 font-semibold uppercase">Total Spent</Text>
              <Text className="text-slate-900 text-xl font-bold">
                {formatCurrency(budgetProgressInfo.spent)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-2xs text-slate-400 font-semibold uppercase">Budget Limit</Text>
              <Text className="text-slate-600 text-sm font-semibold">
                {formatCurrency(budgetProgressInfo.limit)}
              </Text>
            </View>
          </View>

          {/* Progress Bar track */}
          <View className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
            <View 
              style={{
                width: `${budgetProgressInfo.percent}%`,
                backgroundColor: budgetProgressInfo.progressColor,
                height: "100%",
                borderRadius: 9999,
              }}
            />
          </View>

          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-slate-500 text-xs">
              {budgetProgressInfo.rawPercent.toFixed(1)}% of budget used
            </Text>
            <Text className="text-slate-600 text-xs font-semibold">
              {formatCurrency(budgetProgressInfo.remaining)} remaining
            </Text>
          </View>

          {/* Warning banner */}
          <View className={`border rounded-2xl p-3 flex-row items-start gap-2 ${budgetProgressInfo.bgAlertClass}`}>
            <AlertTriangle size={15} style={{ marginTop: 1 }} />
            <Text className="text-2xs font-semibold flex-1 leading-relaxed">
              {budgetProgressInfo.textAlert}
            </Text>
          </View>
        </View>
      </AnimatedEntry>

      {/* Category Expense Breakdown */}
      <AnimatedEntry delay={280}>
        <View className="mb-6 bg-white border border-[#DDE4E5] rounded-3xl p-5 shadow-sm">
          <Text className="text-primary font-bold text-lg mb-1">Category Spending Breakdown</Text>
          <Text className="text-slate-500 text-xs mb-4">Expenses distribution for the current month</Text>
          
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : categoryPieData.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <Text className="text-slate-400 text-xs italic">No expense entries recorded for this month.</Text>
            </View>
          ) : (
            <View className="items-center justify-center">
              <View className="h-44 items-center justify-center mt-2">
                <PieChart
                  data={pieChartData}
                  donut
                  showText
                  textColor="white"
                  textStyle={{ fontSize: 9, fontWeight: "bold" }}
                  radius={75}
                  innerRadius={45}
                  focusOnPress
                  innerCircleColor="white"
                />
              </View>
              
              {/* Category Legend */}
              <View className="w-full mt-4 flex-col gap-2">
                {categoryPieData.map((item) => (
                  <View key={item.id} className="flex-row items-center justify-between py-1.5 border-b border-slate-50">
                    <View className="flex-row items-center">
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color, marginRight: 8 }} />
                      <Text className="text-slate-700 text-xs font-semibold">{item.name}</Text>
                    </View>
                    <Text className="text-slate-900 text-xs font-bold">
                      {formatCurrency(item.value)} <Text className="text-slate-400 text-3xs font-medium">({item.percentage.toFixed(1)}%)</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </AnimatedEntry>

      {/* Cash Flow Breakdown */}
      <AnimatedEntry delay={320}>
        <View className="mb-6 bg-white border border-[#DDE4E5] rounded-3xl p-5 shadow-sm">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-primary font-bold text-lg">Cash Flow Breakdown</Text>
          </View>
          <Text className="text-slate-500 text-xs mb-3">
            {cashFlowPeriod === "7D" && "Visualizing the journey of your money for the last 7 Days"}
            {cashFlowPeriod === "30D" && "Visualizing the journey of your money for the last 30 Days"}
            {cashFlowPeriod === "3M" && "Visualizing the journey of your money for the last 3 Months"}
            {cashFlowPeriod === "6M" && "Visualizing the journey of your money for the last 6 Months"}
            {cashFlowPeriod === "1Y" && "Visualizing the journey of your money for the last Year"}
          </Text>

          {/* Time Period Selector Tabs */}
          <View className="flex-row gap-1 mb-4 bg-slate-50 p-1 rounded-xl border border-slate-100">
            {(["7D", "30D", "3M", "6M", "1Y"] as const).map((period) => {
              const isActive = cashFlowPeriod === period;
              return (
                <TouchableOpacity
                  key={period}
                  onPress={() => setCashFlowPeriod(period)}
                  style={{
                    flex: 1,
                    backgroundColor: isActive ? "#32484F" : "transparent",
                    borderRadius: 8,
                    paddingVertical: 6,
                    alignItems: "center",
                    justifyContent: "center",
                    ...(isActive ? {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 1,
                    } : {})
                  }}
                >
                  <Text 
                    style={{
                      fontSize: 10,
                      fontWeight: "bold",
                      color: isActive ? "#ffffff" : "#64748b"
                    }}
                  >
                    {period}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <View className="items-center justify-center h-40">
              <BarChart
                data={cashFlowChartData}
                barWidth={chartLayoutConfig.barWidth}
                spacing={chartLayoutConfig.spacing}
                noOfSections={3}
                barBorderRadius={4}
                frontColor="#CAA166"
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor="#e2e8f0"
                hideRules
                yAxisTextStyle={{ color: "#6b7280", fontSize: 10 }}
                xAxisLabelTextStyle={{ color: "#6b7280", fontSize: 10 }}
                height={120}
              />
            </View>
          )}
        </View>
      </AnimatedEntry>

      {/* Recent Ledger Entries */}
      <AnimatedEntry delay={400}>
        <View className="mb-6 bg-white border border-[#DDE4E5] rounded-3xl p-5 shadow-sm">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-primary font-bold text-lg">Recent Transactions</Text>
            <TouchableOpacity 
              onPress={() => router.push("/(tabs)/transactions")}
              className="border border-slate-200 px-3 py-1 rounded-full bg-slate-50 active:bg-slate-100"
            >
              <Text className="text-xs text-slate-600 font-semibold">View All</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-slate-500 text-xs mb-4">Showing latest 5 transactions for last 30 days</Text>
          
          {loading ? (
            <View className="flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <Text className="text-slate-500 text-sm">No transactions found</Text>
            </View>
          ) : (
            <Table>
              <TableHeader>
                <TableCell flex={1.8} isHeader>Category</TableCell>
                <TableCell flex={1.2} isHeader>Amount</TableCell>
                <TableCell flex={1.0} isHeader className="min-w-[65px] items-center">Type</TableCell>
              </TableHeader>
              {filteredTransactions.slice(0, 5).map((trans) => {
                const cat = MOCK_CATEGORIES.find((c) => c.id === trans.categoryId);
                const isIncome = trans.type === "INCOME";
                return (
                  <TableRow key={trans.id}>
                    <TableCell flex={1.8}>
                      <Text className="text-primary font-bold text-xs" numberOfLines={1}>
                        {cat?.name || "Uncategorized"}
                      </Text>
                      <Text className="text-slate-400 text-3xs mt-0.5" numberOfLines={1}>
                        {trans.description}
                      </Text>
                    </TableCell>
                    <TableCell flex={1.2}>
                      <Text className={`text-xs font-extrabold ${isIncome ? "text-primary" : "text-slate-900"}`}>
                        {isIncome ? "+" : ""}{formatCurrency(trans.amount)}
                      </Text>
                    </TableCell>
                    <TableCell flex={1.0} className="min-w-[65px] items-center">
                      <View 
                        className={`flex-row items-center justify-center px-2.5 py-1 rounded-full border ${
                          isIncome 
                            ? "bg-emerald-50 border-emerald-100/60" 
                            : "bg-red-50 border-red-100/60"
                        }`}
                      >
                        {isIncome ? (
                          <TrendingUp size={10} color="#059669" style={{ marginRight: 3 }} />
                        ) : (
                          <TrendingDown size={10} color="#dc2626" style={{ marginRight: 3 }} />
                        )}
                        <Text 
                          className={`text-[9px] font-black tracking-wider ${
                            isIncome ? "text-emerald-700" : "text-red-700"
                          }`}
                        >
                          {isIncome ? "IN" : "OUT"}
                        </Text>
                      </View>
                    </TableCell>
                  </TableRow>
                );
              })}
            </Table>
          )}
        </View>
      </AnimatedEntry>
      
      {/* Footer Spacing */}
      <View className="h-20" />
    </ScrollView>

    {/* Add Account Dialog */}
    <Dialog
      open={accountModalOpen}
      onClose={() => !accountSaving && setAccountModalOpen(false)}
      title="Create Account"
    >
      <View className="flex-col gap-4">
        <Input
          label="Account Name"
          placeholder="e.g. HDFC Bank, Cash Wallet"
          value={accountName}
          onChangeText={setAccountName}
          error={accountErrors.name}
          editable={!accountSaving}
        />
        
        <View className="flex-col gap-1.5 w-full">
          <Text className="text-slate-700 text-xs font-semibold">
            Account Type
          </Text>
          <TouchableOpacity
            onPress={() => {
              setAccountModalOpen(false);
              setAccountTypeSelectorOpen(true);
            }}
            className="w-full flex-row items-center justify-between border border-slate-200 rounded-xl bg-white px-3 py-3"
          >
            <Text className="text-slate-900 text-sm">
              {accountType ? accountType.replace("_", " ") : "Select Type"}
            </Text>
            <Landmark size={14} color="#94a3b8" />
          </TouchableOpacity>
          {accountErrors.type && (
            <Text className="text-red-500 text-2xs font-medium mt-0.5">{accountErrors.type}</Text>
          )}
        </View>

        <Input
          label="Initial Balance (₹)"
          placeholder="0.00"
          value={accountBalance}
          onChangeText={setAccountBalance}
          keyboardType="numeric"
          error={accountErrors.balance}
          editable={!accountSaving}
        />

        <Button
          variant="default"
          onPress={handleCreateAccount}
          loading={accountSaving}
          className="mt-2 bg-[#32484F]"
        >
          Create Account
        </Button>
      </View>
    </Dialog>

    {/* Account Type Selector Sub-Modal */}
    <Dialog
      open={accountTypeSelectorOpen}
      onClose={() => {
        setAccountTypeSelectorOpen(false);
        setAccountModalOpen(true);
      }}
      title="Select Account Type"
    >
      <ScrollView style={{ maxHeight: 240 }}>
        {["CHECKING", "SAVINGS", "CASH", "CREDIT_CARD"].map((typeOption) => (
          <Pressable
            key={typeOption}
            onPress={() => {
              setAccountType(typeOption as any);
              setAccountTypeSelectorOpen(false);
              setAccountModalOpen(true);
            }}
            className="flex-row items-center justify-between py-3 border-b border-slate-100"
          >
            <Text className="text-slate-900 text-sm font-semibold">{typeOption.replace("_", " ")}</Text>
            {accountType === typeOption ? <Check size={16} color="#059669" /> : null}
          </Pressable>
        ))}
      </ScrollView>
    </Dialog>

    {/* Add Transaction Dialog */}
    <Dialog
      open={transactionModalOpen}
      onClose={() => !transactionSaving && setTransactionModalOpen(false)}
      title="Add Transaction"
    >
      <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingBottom: 16 }}>
        <View className="flex-col gap-4">
          {accounts.length === 0 ? (
            <View className="bg-[#fffbeb] border border-[#fef3c7] p-3 rounded-2xl flex-row gap-2">
              <Info size={16} color="#d97706" style={{ marginTop: 2 }} />
              <Text className="text-[#b45309] text-3xs font-semibold flex-1 leading-relaxed">
                Notice: You must create an account card first before adding a transaction record.
              </Text>
            </View>
          ) : null}

          <Input
            label="Description"
            placeholder="e.g. Starbucks Coffee"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              setLowConfidenceFields(prev => prev.filter(f => f !== "merchant" && f !== "description"));
            }}
            error={transactionErrors.description}
            editable={!transactionSaving && !scanningReceipt}
          />
          {(lowConfidenceFields.includes("merchant") || lowConfidenceFields.includes("description")) && (
            <Text style={{ color: "#d97706", fontSize: 11, fontWeight: "600", marginTop: -6, marginBottom: 8, paddingHorizontal: 4 }}>
              ⚠️ Verify description (AI was uncertain about this field)
            </Text>
          )}

          <Input
            label="Amount (₹)"
            placeholder="0.00"
            value={amount}
            onChangeText={(text) => {
              setAmount(text);
              setLowConfidenceFields(prev => prev.filter(f => f !== "amount"));
            }}
            keyboardType="numeric"
            error={transactionErrors.amount}
            editable={!transactionSaving && !scanningReceipt}
          />
          {lowConfidenceFields.includes("amount") && (
            <Text style={{ color: "#d97706", fontSize: 11, fontWeight: "600", marginTop: -6, marginBottom: 8, paddingHorizontal: 4 }}>
              ⚠️ Verify amount (AI was uncertain about this value)
            </Text>
          )}

          <View className="flex-col gap-1.5 w-full">
            <Text className="text-slate-700 text-xs font-semibold">
              Type
            </Text>
            <View 
              style={{
                flexDirection: "row",
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 12,
                backgroundColor: "#f1f5f9",
                padding: 4,
              }}
            >
              {["EXPENSE", "INCOME"].map((t) => {
                const isActive = type === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => !transactionSaving && !scanningReceipt && setType(t as any)}
                    style={[
                      {
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: "center",
                        backgroundColor: isActive ? "white" : "transparent",
                      },
                      isActive ? {
                        shadowColor: "#000000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1,
                      } : {}
                    ]}
                  >
                    <Text 
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color: isActive ? "#32484F" : "#64748b",
                      }}
                    >
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Account Selector */}
          <View className="flex-col gap-1.5 w-full">
            <Text className="text-slate-700 text-xs font-semibold">Account / Card</Text>
            <TouchableOpacity
              onPress={() => accounts.length > 0 && !transactionSaving && !scanningReceipt && setAccountSelectorOpen(true)}
              className="w-full flex-row items-center justify-between border border-slate-200 rounded-xl bg-white px-3 py-3"
            >
              <Text className="text-slate-900 text-xs">
                {accountId ? accounts.find((a) => a.id === accountId)?.name : "Select account..."}
              </Text>
              <Wallet size={14} color="#94a3b8" />
            </TouchableOpacity>
            {transactionErrors.accountId ? (
              <Text className="text-red-500 text-2xs font-medium mt-0.5">{transactionErrors.accountId}</Text>
            ) : null}
          </View>

          {/* Category Selector */}
          <View className="flex-col gap-1.5 w-full">
            <Text className="text-slate-700 text-xs font-semibold">Category</Text>
            <TouchableOpacity
              onPress={() => !transactionSaving && !scanningReceipt && setCategorySelectorOpen(true)}
              className="w-full flex-row items-center justify-between border border-slate-200 rounded-xl bg-white px-3 py-3"
            >
              <Text className="text-slate-900 text-xs">
                {categoryId ? MOCK_CATEGORIES.find((c) => c.id === categoryId)?.name : "Select category..."}
              </Text>
              <Tag size={14} color="#94a3b8" />
            </TouchableOpacity>
            {transactionErrors.categoryId ? (
              <Text className="text-red-500 text-2xs font-medium mt-0.5">{transactionErrors.categoryId}</Text>
            ) : null}
            {lowConfidenceFields.includes("categoryId") && (
              <Text style={{ color: "#d97706", fontSize: 11, fontWeight: "600", marginTop: 2, paddingHorizontal: 4 }}>
                ⚠️ Verify category (AI was uncertain about this category)
              </Text>
            )}
          </View>

          {Platform.OS === "web" ? (
            <Input
              label="Transaction Date"
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={(text) => {
                setDate(text);
                setLowConfidenceFields(prev => prev.filter(f => f !== "date"));
              }}
              error={transactionErrors.date}
              editable={!transactionSaving && !scanningReceipt}
            />
          ) : (
            <>
              <TouchableOpacity 
                onPress={() => !transactionSaving && !scanningReceipt && setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <View pointerEvents="none">
                  <Input
                    label="Transaction Date"
                    placeholder="YYYY-MM-DD"
                    value={date}
                    error={transactionErrors.date}
                    editable={false}
                  />
                </View>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(date)}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    handleDateChange(event, selectedDate);
                    setLowConfidenceFields(prev => prev.filter(f => f !== "date"));
                  }}
                />
              )}
              {lowConfidenceFields.includes("date") && (
                <Text style={{ color: "#d97706", fontSize: 11, fontWeight: "600", marginTop: 2, paddingHorizontal: 4 }}>
                  ⚠️ Verify date (AI was uncertain about this transaction date)
                </Text>
              )}
            </>
          )}

          {/* Receipt Attachment */}
          <View style={{ flexDirection: "column", gap: 4, width: "100%" }}>
            <Text style={{ color: "#334155", fontSize: 12, fontWeight: "600" }}>Receipt Attachment</Text>
            {receiptUri ? (
              <View style={{ position: "relative" }}>
                <Image
                  source={{ uri: receiptUri }}
                  style={{ width: "100%", height: 144, borderRadius: 12 }}
                  resizeMode="cover"
                />
                {scanningReceipt ? (
                  <View style={{ 
                    position: "absolute", 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    backgroundColor: "rgba(0, 0, 0, 0.6)", 
                    borderRadius: 12, 
                    alignItems: "center", 
                    justifyContent: "center",
                    gap: 8
                  }}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>{ocrStage || "Scanning with AI..."}</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setReceiptUri(null)}
                    style={{ 
                      position: "absolute", 
                      top: 8, 
                      right: 8, 
                      backgroundColor: "#00000099", 
                      borderRadius: 9999, 
                      padding: 4 
                    }}
                  >
                    <X size={14} color="white" />
                  </Pressable>
                )}
              </View>
            ) : scanningReceipt ? (
              <View style={{ 
                flexDirection: "row", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: 8, 
                borderWidth: 1, 
                borderColor: "#cbd5e1", 
                borderRadius: 12, 
                paddingVertical: 18, 
                backgroundColor: "#f8fafc" 
              }}>
                <ActivityIndicator size="small" color="#32484F" />
                <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "600" }}>{ocrStage || "Scanning receipt with AI..."}</Text>
              </View>
            ) : (
              <Pressable
                onPress={handleAttachReceiptPress}
                style={{ 
                  flexDirection: "row", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  gap: 8, 
                  borderWidth: 1, 
                  borderStyle: "dashed", 
                  borderColor: "#cbd5e1", 
                  borderRadius: 12, 
                  paddingVertical: 18, 
                  backgroundColor: "#f8fafc" 
                }}
              >
                <Camera size={18} color="#94a3b8" />
                <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "600" }}>Tap to attach receipt photo</Text>
              </Pressable>
            )}
          </View>

          {/* Recurring */}
          <Pressable
            onPress={() => !transactionSaving && !scanningReceipt && setIsRecurring(!isRecurring)}
            className="flex-row items-center gap-2 py-1"
          >
            <View
              style={{
                height: 18,
                width: 18,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: isRecurring ? "#32484F" : "#cbd5e1",
                backgroundColor: isRecurring ? "#32484F" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isRecurring ? <Check size={11} color="white" /> : null}
            </View>
            <Text className="text-slate-700 text-xs font-semibold">
              Is Recurring Transaction?
            </Text>
          </Pressable>

          <Button
            variant="default"
            onPress={handleCreateTransaction}
            loading={transactionSaving || scanningReceipt}
            disabled={accounts.length === 0 || scanningReceipt}
            className="mt-2 bg-[#32484F]"
          >
            Submit Record
          </Button>
        </View>
      </ScrollView>
    </Dialog>

    {/* Account Selector Sub-Modal */}
    <Dialog
      open={accountSelectorOpen}
      onClose={() => setAccountSelectorOpen(false)}
      title="Select Wallet Account"
    >
      <ScrollView style={{ maxHeight: 240 }}>
        {accounts.map((acc) => (
          <Pressable
            key={acc.id}
            onPress={() => {
              setAccountId(acc.id);
              setAccountSelectorOpen(false);
            }}
            className="flex-row items-center justify-between py-3 border-b border-slate-100"
          >
            <View>
              <Text className="text-slate-900 text-sm font-semibold">{acc.name}</Text>
              <Text className="text-slate-400 text-3xs uppercase mt-0.5">
                {acc.type} • {formatCurrency(acc.balance)}
              </Text>
            </View>
            {accountId === acc.id ? <Check size={16} color="#059669" /> : null}
          </Pressable>
        ))}
      </ScrollView>
    </Dialog>

    {/* Category Selector Sub-Modal */}
    <Dialog
      open={categorySelectorOpen}
      onClose={() => setCategorySelectorOpen(false)}
      title="Select Category"
    >
      <ScrollView style={{ maxHeight: 240 }}>
        {MOCK_CATEGORIES.filter((c) => c.type === type).map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => {
              setCategoryId(cat.id);
              setLowConfidenceFields(prev => prev.filter(f => f !== "categoryId"));
              setCategorySelectorOpen(false);
            }}
            className="flex-row items-center justify-between py-3 border-b border-slate-100"
          >
            <Text className="text-slate-900 text-sm font-semibold">{cat.name}</Text>
            {categoryId === cat.id ? <Check size={16} color="#059669" /> : null}
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#e2e8f0", marginTop: 8 }}>
        <TextInput
          placeholder="New Category Name..."
          value={newCatName}
          onChangeText={setNewCatName}
          style={{ flex: 1, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, color: "#0f172a" }}
          placeholderTextColor="#94a3b8"
        />
        <Pressable
          onPress={handleCreateCustomCategory}
          style={{ backgroundColor: "#32484F", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, minHeight: 40, justifyContent: "center" }}
        >
          <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>Add</Text>
        </Pressable>
      </View>
    </Dialog>

    {/* Manage Quick Add Shortcuts Dialog */}
    <Dialog
      open={quickAddManageOpen}
      onClose={() => setQuickAddManageOpen(false)}
      title="Manage Shortcuts"
    >
      <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingBottom: 16 }}>
        <View className="flex-col gap-4">
          
          <Text className="text-slate-700 text-xs font-bold mb-1">Active Shortcuts</Text>
          {quickAdds.length === 0 ? (
            <Text className="text-slate-400 text-xs italic">No shortcuts created yet.</Text>
          ) : (
            <View className="flex-col gap-2">
              {quickAdds.map((qa) => (
                <View 
                  key={qa.id}
                  className="flex-row justify-between items-center bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl"
                >
                  <View>
                    <Text className="text-slate-900 text-sm font-semibold">
                      +₹{qa.amount} {qa.label}
                    </Text>
                    <Text className="text-slate-400 text-3xs uppercase mt-0.5">
                      Category: {qa.categoryKeyword}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => handleDeleteQuickAdd(qa.id)}
                    className="w-8 h-8 rounded-full bg-red-50 items-center justify-center active:bg-red-100"
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View className="h-px bg-slate-200 my-2" />

          <Text className="text-slate-700 text-xs font-bold">Create New Shortcut</Text>
          
          <Input
            label="Amount (₹)"
            placeholder="e.g. 150"
            value={qaAmount}
            onChangeText={setQaAmount}
            keyboardType="numeric"
            error={qaErrors.amount}
          />

          <Input
            label="Short Label"
            placeholder="e.g. Coffee, Fuel"
            value={qaLabel}
            onChangeText={setQaLabel}
            error={qaErrors.label}
          />

          {/* Category Select Button */}
          <View className="flex-col gap-1.5 w-full">
            <Text className="text-slate-700 text-xs font-semibold">Category</Text>
            <TouchableOpacity
              onPress={() => setQaCategorySelectorOpen(true)}
              className="w-full flex-row items-center justify-between border border-slate-200 rounded-xl bg-white px-3 py-3"
            >
              <Text className="text-slate-900 text-xs">
                {qaCategoryKeyword ? qaCategoryKeyword : "Select category..."}
              </Text>
              <Tag size={14} color="#94a3b8" />
            </TouchableOpacity>
            {qaErrors.category && (
              <Text className="text-red-500 text-2xs font-medium mt-0.5">{qaErrors.category}</Text>
            )}
          </View>

          <Button
            variant="default"
            onPress={handleCreateQuickAdd}
            className="mt-2 bg-[#32484F]"
          >
            Add Shortcut
          </Button>
        </View>
      </ScrollView>
    </Dialog>

    {/* Shortcut Category Selector Dialog */}
    <Dialog
      open={qaCategorySelectorOpen}
      onClose={() => setQaCategorySelectorOpen(false)}
      title="Select Category"
    >
      <ScrollView style={{ maxHeight: 240 }}>
        {MOCK_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => {
              setQaCategoryKeyword(cat.name);
              setQaCategorySelectorOpen(false);
            }}
            className="flex-row items-center justify-between py-3 border-b border-slate-100"
          >
            <View>
              <Text className="text-slate-900 text-sm font-semibold">{cat.name}</Text>
              <Text className="text-slate-400 text-3xs uppercase mt-0.5">{cat.type}</Text>
            </View>
            {qaCategoryKeyword === cat.name ? <Check size={16} color="#059669" /> : null}
          </Pressable>
        ))}
      </ScrollView>
    </Dialog>
    
    {/* Edit Budget Dialog */}
    <Dialog
      open={budgetModalOpen}
      onClose={() => !budgetSaving && setBudgetModalOpen(false)}
      title="Set Budget Limit"
    >
      <View className="flex-col gap-4">
        <Input
          label="Monthly Budget Limit (₹)"
          placeholder="e.g. 5000.00"
          value={tempBudgetLimit}
          onChangeText={setTempBudgetLimit}
          keyboardType="numeric"
          editable={!budgetSaving}
        />

        <Button
          variant="default"
          onPress={handleSaveBudget}
          loading={budgetSaving}
          className="mt-2 bg-[#32484F]"
        >
          Save Budget Limit
        </Button>
      </View>
    </Dialog>

    {/* Account Options Dialog */}
    <Dialog
      open={accountOptionsOpen}
      onClose={() => setAccountOptionsOpen(false)}
      title="Account Options"
    >
      {selectedAccountForOptions && (() => {
        const acc = selectedAccountForOptions;
        const isDefault = defaultBankAccountId === acc.id;
        return (
          <View className="flex-col gap-3 py-1">
            <Text className="text-slate-500 text-sm text-center mb-1 leading-relaxed">
              What would you like to do with <Text className="font-extrabold text-slate-800">{acc.name.trim()}</Text>?
            </Text>

            <TouchableOpacity
              onPress={() => {
                if (isDefault) {
                  setDefaultBankAccountId(null);
                  showToast(`${acc.name} removed as default.`, "success");
                } else {
                  setDefaultBankAccountId(acc.id);
                  showToast(`${acc.name} set as default bank!`, "success");
                }
                setAccountOptionsOpen(false);
              }}
              className={`py-3.5 px-4 rounded-2xl items-center justify-center border ${
                isDefault 
                  ? "bg-[#32484F]/5 border-[#32484F]/10 active:bg-[#32484F]/10" 
                  : "bg-primary border-primary active:bg-primary/95"
              }`}
            >
              <Text className={`font-bold text-sm ${isDefault ? "text-primary" : "text-white"}`}>
                {isDefault ? "Remove Default Status" : "Set as Default Bank"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setAccountOptionsOpen(false);
                setTimeout(() => {
                  handleDeleteAccount(acc);
                }, 100);
              }}
              className="py-3.5 px-4 rounded-2xl bg-red-50 border border-red-100 items-center justify-center active:bg-red-100/50"
            >
              <Text className="text-red-600 font-bold text-sm">Delete Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAccountOptionsOpen(false)}
              className="py-3.5 px-4 rounded-2xl bg-slate-50 border border-slate-200/60 items-center justify-center active:bg-slate-100"
            >
              <Text className="text-slate-600 font-bold text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        );
      })()}
    </Dialog>

    {/* Delete Account Confirmation Dialog */}
    <Dialog
      open={deleteConfirmOpen}
      onClose={() => {
        setDeleteConfirmOpen(false);
        setAccountToDelete(null);
      }}
      title="Delete Account"
    >
      {accountToDelete && (
        <View className="flex-col gap-3 py-1">
          <Text className="text-slate-500 text-sm text-center leading-relaxed">
            Are you sure you want to delete <Text className="font-extrabold text-slate-800">{accountToDelete.name.trim()}</Text>? All associated transactions will also be permanently deleted.
          </Text>

          <TouchableOpacity
            onPress={executeDeleteAccount}
            className="py-3.5 px-4 rounded-2xl bg-red-500 border border-red-500 items-center justify-center active:bg-red-600"
          >
            <Text className="text-white font-bold text-sm">Delete Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setDeleteConfirmOpen(false);
              setAccountToDelete(null);
            }}
            className="py-3.5 px-4 rounded-2xl bg-slate-50 border border-slate-200/60 items-center justify-center active:bg-slate-100"
          >
            <Text className="text-slate-600 font-bold text-sm">Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </Dialog>

    {/* Add Savings Goal Dialog */}
    <Dialog
      open={goalModalOpen}
      onClose={() => setGoalModalOpen(false)}
      title="Create Savings Goal"
    >
      <View className="flex-col gap-4 text-left py-1">
        <Input
          label="Goal Name"
          placeholder="e.g. Emergency Fund, New Laptop"
          value={goalName}
          onChangeText={setGoalName}
        />
        <Input
          label="Target Amount (₹)"
          placeholder="e.g. 50000"
          keyboardType="numeric"
          value={goalTargetAmount}
          onChangeText={setGoalTargetAmount}
        />
        <TouchableOpacity 
          onPress={() => !goalSaving && setShowGoalDatePicker(true)}
          activeOpacity={0.7}
        >
          <View pointerEvents="none">
            <Input
              label="Target Date"
              placeholder="YYYY-MM-DD"
              value={goalTargetDate}
              editable={false}
            />
          </View>
        </TouchableOpacity>
        {showGoalDatePicker && (
          <DateTimePicker
            value={new Date(goalTargetDate)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleGoalDateChange}
          />
        )}
        <Button
          onPress={handleSaveGoal}
          loading={goalSaving}
          className="bg-primary py-3.5 mt-2"
        >
          Create Goal
        </Button>
      </View>
    </Dialog>

    {/* Manage Savings Goal Progress Dialog */}
    <Dialog
      open={goalProgressModalOpen}
      onClose={() => {
        setGoalProgressModalOpen(false);
        setSelectedGoal(null);
      }}
      title="Update Goal Progress"
    >
      {selectedGoal && (
        <View className="flex-col gap-4 py-1 text-left">
          <View className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-2">
            <Text className="text-slate-800 font-bold text-sm mb-1">{selectedGoal.name}</Text>
            <Text className="text-slate-400 text-xs">
              Target: {formatCurrency(selectedGoal.targetAmount).replace(/\.00$/, "")}
            </Text>
          </View>
          
          <Input
            label="Current Saved Amount (₹)"
            placeholder="e.g. 15000"
            keyboardType="numeric"
            value={goalProgressAmount}
            onChangeText={setGoalProgressAmount}
          />
          
          <TouchableOpacity 
            onPress={() => setShowGoalProgressDatePicker(true)}
            activeOpacity={0.7}
          >
            <View pointerEvents="none">
              <Input
                label="Target Date"
                placeholder="YYYY-MM-DD"
                value={goalProgressDate}
                editable={false}
              />
            </View>
          </TouchableOpacity>
          {showGoalProgressDatePicker && (
            <DateTimePicker
              value={new Date(goalProgressDate || new Date())}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleGoalProgressDateChange}
            />
          )}
          
          <Button
            onPress={handleUpdateGoalProgress}
            className="bg-primary py-3.5 mt-2"
          >
            Save Progress
          </Button>

          <Button
            variant="destructive"
            onPress={() => handleDeleteGoal(selectedGoal.id)}
            className="py-3.5 border border-red-200/50"
          >
            Delete Goal
          </Button>
        </View>
      )}
    </Dialog>

    {/* Attach Receipt Options Dialog */}
    <Dialog
      open={attachReceiptOpen}
      onClose={() => {
        setAttachReceiptOpen(false);
        setTransactionModalOpen(true);
      }}
      title="Attach Receipt"
    >
      <View className="flex-col gap-3 py-1">
        <Text className="text-slate-500 text-sm text-center mb-1 leading-relaxed">
          Choose a source to scan or attach receipt
        </Text>

        <TouchableOpacity
          onPress={() => handleAttachSource("library")}
          className="py-3.5 px-4 rounded-2xl bg-primary border border-primary items-center justify-center active:bg-primary/95"
        >
          <Text className="text-white font-bold text-sm">Choose from Library</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleAttachSource("camera")}
          className="py-3.5 px-4 rounded-2xl bg-[#32484F]/5 border border-[#32484F]/10 items-center justify-center active:bg-[#32484F]/10"
        >
          <Text className="text-primary font-bold text-sm">Take Photo (Camera)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setAttachReceiptOpen(false);
            setTransactionModalOpen(true);
          }}
          className="py-3.5 px-4 rounded-2xl bg-slate-50 border border-slate-200/60 items-center justify-center active:bg-slate-100"
        >
          <Text className="text-slate-600 font-bold text-sm">Cancel</Text>
        </TouchableOpacity>
      </View>
    </Dialog>
    </>
  );
}
