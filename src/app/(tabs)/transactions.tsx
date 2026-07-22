import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Image, Alert, ActivityIndicator, TextInput, TouchableOpacity, Platform } from "react-native";
import { Plus, Trash2, Wallet, Tag, Check, AlertTriangle, Info, Camera, X, SlidersHorizontal } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";
import { resolveApiBaseUrl } from "@/services/apiResolver";
import { scanReceipt } from "@/services/ocrService";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Table, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { SegmentedTabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionRepository, AccountRepository } from "@/services/db-repositories";
import { TransactionSchema } from "@/lib/validations";
import { Transaction, Account } from "@/types";
import { MOCK_CATEGORIES } from "@/lib/mock-data";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useTransactionFilters } from "@/hooks/useTransactionFilters";
import { TransactionFilterModal } from "@/components/TransactionFilterModal";
import { FilterChip } from "@/components/FilterChip";
import { useCategoryStore } from "@/store/useCategoryStore";
import DateTimePicker from "@react-native-community/datetimepicker";
import { parseSafeDate } from "@/lib/dateUtils";

export default function TransactionsScreen() {
  const { showToast } = useToast();
  const { defaultBankAccountId } = useSettingsStore();
  const { getToken } = useAuth();
  
  // Data States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter state & modal
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  
  const {
    filters,
    setFilters,
    resetFilters,
    filteredTransactions,
    activeChips,
  } = useTransactionFilters(transactions, accounts);

  const filter = useMemo(() => {
    const transactionType = filters?.transactionType || [];
    if (transactionType.includes("Income") || transactionType.includes("INCOME")) return "Income";
    if (transactionType.includes("Expense") || transactionType.includes("EXPENSE")) return "Expense";
    return "All";
  }, [filters?.transactionType]);

  const handleTabPress = (tabName: string) => {
    if (tabName === "All") {
      setFilters({ transactionType: [] });
    } else {
      setFilters({ transactionType: [tabName] });
    }
  };

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

  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDate(selectedDate.toISOString().split("T")[0]);
      setLowConfidenceFields(prev => prev.filter(f => f !== "date"));
    }
  };

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  // Form States
  const [modalOpen, setModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [ocrStage, setOcrStage] = useState("");
  const [attachReceiptOpen, setAttachReceiptOpen] = useState(false);
  const [lowConfidenceFields, setLowConfidenceFields] = useState<string[]>([]);

  // Selection sub-modals
  const [categorySelectorOpen, setCategorySelectorOpen] = useState(false);
  const [accountSelectorOpen, setAccountSelectorOpen] = useState(false);

  // Detail & Delete Modals
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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

  const handleAttachReceiptPress = () => {
    setModalOpen(false);
    setAttachReceiptOpen(true);
  };

  const handleAttachSource = async (source: "camera" | "library") => {
    setAttachReceiptOpen(false);
    try {
      if (source === "camera") {
        const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPerm.granted) {
          showToast("Camera permission is required to take photos.", "error");
          setModalOpen(true);
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.7,
        });

        if (!result.canceled && result.assets.length > 0) {
          const selectedUri = result.assets[0].uri;
          setReceiptUri(selectedUri);
          setModalOpen(true);
          await handleProcessReceiptOCR(selectedUri);
        } else {
          setModalOpen(true);
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
          setModalOpen(true);
          await handleProcessReceiptOCR(selectedUri);
        } else {
          setModalOpen(true);
        }
      }
    } catch (err) {
      console.error(`[DEBUG] ${source} access error:`, err);
      showToast(`Failed to access ${source === "camera" ? "camera" : "image library"}.`, "error");
      setModalOpen(true);
    }
  };

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const transData = await TransactionRepository.getAll();
      const accountsData = await AccountRepository.getAll();
      setTransactions(transData);
      setAccounts(accountsData);
      
      // Auto pre-fill default account if available
      if (accountsData.length > 0 && !accountId) {
        const hasDefault = defaultBankAccountId && accountsData.some(a => a.id === defaultBankAccountId);
        setAccountId(hasDefault ? defaultBankAccountId : accountsData[0].id);
      }
    } catch (err) {
      showToast("Failed to load records", "error");
    } finally {
      setLoading(false);
    }
  };

  // Safe data synchronization when screen becomes focused
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [accountId])
  );

  const handleAddTransaction = async () => {
    setFormErrors({});
    const numAmount = parseFloat(amount) || 0;

    // Validate using Zod schema
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
      setFormErrors(errors);
      const errorMsg = validationResult.error.issues.map((i) => i.message).join(", ");
      showToast(errorMsg || "Please fill in form details correctly", "error");
      return;
    }

    setSaving(true);
    try {
      if (isEditing && editingTransactionId) {
        const updatedTrans: Transaction = {
          id: editingTransactionId,
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

        await TransactionRepository.update(updatedTrans);
        showToast("Transaction updated successfully!", "success");
      } else {
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
      }
      
      // Clear & Refresh
      setDescription("");
      setAmount("");
      setCategoryId("");
      setReceiptUri(null);
      setDate(new Date().toISOString().split("T")[0]);
      setIsRecurring(false);
      setIsEditing(false);
      setEditingTransactionId(null);
      setLowConfidenceFields([]);
      setModalOpen(false);
      
      // Reload list
      loadData();
    } catch (err) {
      showToast("Failed to save transaction", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await TransactionRepository.delete(id);
      showToast("Transaction deleted successfully", "success");
      setConfirmDeleteOpen(false);
      setDetailsModalOpen(false);
      setSelectedTransaction(null);
      loadData();
    } catch (err) {
      showToast("Failed to delete transaction", "error");
    }
  };

  // Safe Currency Formatter for Hermes
  const formatCurrency = useCallback((amount: number) => {
    const isNegative = amount < 0;
    const formatted = Math.abs(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${isNegative ? "-" : ""}₹${formatted}`;
  }, []);

  // Filter logic handled in hook

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FBFC" }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 24 }}>
        
        {/* Header */}
        <View style={{ marginBottom: 20, flexDirection: "column" }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#32484F" }}>All Transactions</Text>
          <Text style={{ color: "#6E858B", fontSize: 12, marginTop: 4 }}>Manage and analyze your financial history</Text>
        </View>

        {/* Filter Toolbar & Actions */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <SegmentedTabs
              tabs={["All", "Income", "Expense"]}
              activeTab={filter}
              onTabPress={handleTabPress}
            />
          </View>
          <Pressable 
            onPress={() => setFilterModalOpen(true)}
            style={{ 
              backgroundColor: "white", 
              borderWidth: 1, 
              borderColor: "#DDE4E5", 
              borderRadius: 12, 
              padding: 10, 
              marginRight: 8, 
              alignItems: "center", 
              justifyContent: "center",
              minHeight: 44,
              minWidth: 44,
            }}
            accessibilityRole="button"
            accessibilityLabel="Open filters selector"
          >
            <SlidersHorizontal size={16} color="#32484F" />
          </Pressable>
          <Pressable 
            onPress={() => {
              setIsEditing(false);
              setEditingTransactionId(null);
              setDescription("");
              setAmount("");
              setCategoryId("");
              setReceiptUri(null);
              setDate(new Date().toISOString().split("T")[0]);
              setIsRecurring(false);
              setFormErrors({});
              setLowConfidenceFields([]);

              const hasDefault = defaultBankAccountId && accounts.some(a => a.id === defaultBankAccountId);
              setAccountId(hasDefault ? defaultBankAccountId : (accounts[0]?.id || ""));

              setModalOpen(true);
            }}
            style={{ 
              backgroundColor: "#CAA166", 
              borderRadius: 12, 
              paddingHorizontal: 16, 
              paddingVertical: 10, 
              flexDirection: "row", 
              alignItems: "center", 
              justifyContent: "center",
              minHeight: 44,
            }}
            accessibilityRole="button"
            accessibilityLabel="Add new transaction"
          >
            <Plus size={16} color="white" style={{ marginRight: 4 }} />
            <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>Add</Text>
          </Pressable>
        </View>

        {/* Active Filter Chips */}
        {activeChips.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
            style={{ flexDirection: "row", marginBottom: 4 }}
          >
            {activeChips.map((chip) => (
              <FilterChip
                key={chip.id}
                label={chip.label}
                selected={true}
                onRemove={() => chip.remove()}
              />
            ))}
          </ScrollView>
        ) : null}

        {/* Loading Skeletons */}
        {loading ? (
          <View style={{ flexDirection: "column", gap: 12, marginBottom: 24 }}>
            <Skeleton style={{ height: 48, width: "100%" }} />
            <Skeleton style={{ height: 48, width: "100%" }} />
            <Skeleton style={{ height: 48, width: "100%" }} />
            <Skeleton style={{ height: 48, width: "100%" }} />
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View style={{ 
            alignItems: "center", 
            justifyContent: "center", 
            paddingVertical: 60, 
            backgroundColor: "white", 
            borderWidth: 1, 
            borderColor: "#DDE4E5", 
            borderRadius: 24,
            paddingHorizontal: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 1
          }}>
            <AlertTriangle size={36} color="#94a3b8" style={{ marginBottom: 8 }} />
            <Text style={{ color: "#64748b", fontSize: 14, fontWeight: "600", textAlign: "center" }}>
              No transactions match the selected filters.
            </Text>
            <Button 
              variant="secondary" 
              onPress={() => resetFilters()} 
              style={{ marginTop: 12 }}
            >
              Clear Filters
            </Button>
          </View>
        ) : (
          /* Ledger Grid Table */
          <View style={{ 
            backgroundColor: "white", 
            borderWidth: 1, 
            borderColor: "#DDE4E5", 
            borderRadius: 24, 
            padding: 16, 
            marginBottom: 48,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 1
          }}>
            <Table>
              <TableHeader>
                <TableCell flex={1.8} isHeader>Item</TableCell>
                <TableCell flex={1.2} isHeader>Amount</TableCell>
                <TableCell flex={1.0} isHeader>Wallet</TableCell>
              </TableHeader>
              {filteredTransactions.map((trans) => {
                const cat = MOCK_CATEGORIES.find((c) => c.id === trans.categoryId);
                const acc = accounts.find((a) => a.id === trans.accountId);
                const isIncome = trans.type === "INCOME";
                
                return (
                  <TableRow 
                    key={trans.id}
                    onPress={() => {
                      setSelectedTransaction(trans);
                      setDetailsModalOpen(true);
                    }}
                  >
                    <TableCell flex={1.8}>
                      <View style={{ flexDirection: "column" }}>
                        <Text style={{ color: "#32484F", fontWeight: "bold", fontSize: 12 }} numberOfLines={1}>
                          {trans.description}
                        </Text>
                        <Text style={{ color: "#94a3b8", fontSize: 9, marginTop: 2 }} numberOfLines={1}>
                          {cat?.name || "Uncategorized"} • {parseSafeDate(trans.date).toLocaleDateString()}
                        </Text>
                      </View>
                    </TableCell>
                    <TableCell flex={1.2}>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: isIncome ? "#32484F" : "#0f172a" }}>
                        {isIncome ? "+" : ""}{formatCurrency(trans.amount)}
                      </Text>
                    </TableCell>
                    <TableCell flex={1.0}>
                      <Text style={{ color: "#64748b", fontSize: 9 }} numberOfLines={1}>
                        {acc?.name?.replace("Checking", "")?.replace("Savings", "")?.trim() || "Card"}
                      </Text>
                    </TableCell>
                  </TableRow>
                );
              })}
            </Table>
          </View>
        )}
      </ScrollView>

      {/* Add Transaction Modal */}
      <Dialog 
        open={modalOpen} 
        onClose={() => !saving && setModalOpen(false)}
        title={isEditing ? "Edit Transaction" : "Add Transaction"}
      >
        <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingBottom: 16 }}>
          <View style={{ flexDirection: "column", gap: 16 }}>
            {accounts.length === 0 ? (
              <View style={{ 
                backgroundColor: "#fffbeb", 
                borderWidth: 1, 
                borderColor: "#fef3c7", 
                padding: 12, 
                borderRadius: 16, 
                flexDirection: "row",
                gap: 8
              }}>
                <Info size={16} color="#d97706" style={{ marginTop: 2 }} />
                <Text style={{ color: "#b45309", fontSize: 11, fontWeight: "600", flex: 1 }}>
                  Notice: You must link an account card first in the Accounts tab to record transactions.
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
              error={formErrors.description}
              editable={!saving && !scanningReceipt}
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
              error={formErrors.amount}
              editable={!saving && !scanningReceipt}
            />
            {lowConfidenceFields.includes("amount") && (
              <Text style={{ color: "#d97706", fontSize: 11, fontWeight: "600", marginTop: -6, marginBottom: 8, paddingHorizontal: 4 }}>
                ⚠️ Verify amount (AI was uncertain about this value)
              </Text>
            )}
            
            <View style={{ flexDirection: "column", gap: 4, width: "100%" }}>
              <Text style={{ color: "#334155", fontSize: 12, fontWeight: "600" }}>
                Type
              </Text>
              <SegmentedTabs
                tabs={["EXPENSE", "INCOME"]}
                activeTab={type}
                onTabPress={(tab) => !saving && !scanningReceipt && setType(tab as "EXPENSE" | "INCOME")}
              />
            </View>

            {/* Account Picker Trigger */}
            <View style={{ flexDirection: "column", gap: 4, width: "100%" }}>
              <Text style={{ color: "#334155", fontSize: 12, fontWeight: "600" }}>Account / Card</Text>
              <Pressable 
                onPress={() => accounts.length > 0 && !saving && !scanningReceipt && setAccountSelectorOpen(true)}
                style={{ 
                  width: "100%", 
                  flexDirection: "row", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  borderWidth: 1, 
                  borderColor: "#DDE4E5", 
                  borderRadius: 12, 
                  backgroundColor: "white", 
                  paddingHorizontal: 12, 
                  paddingVertical: 12 
                }}
              >
                <Text style={{ color: "#0f172a", fontSize: 12 }}>
                  {accountId ? accounts.find((a) => a.id === accountId)?.name : "Select account..."}
                </Text>
                <Wallet size={14} color="#94a3b8" />
              </Pressable>
              {formErrors.accountId ? (
                <Text style={{ color: "#ef4444", fontSize: 10, fontWeight: "500", marginTop: 2 }}>{formErrors.accountId}</Text>
              ) : null}
            </View>

            {/* Category Picker Trigger */}
            <View style={{ flexDirection: "column", gap: 4, width: "100%" }}>
              <Text style={{ color: "#334155", fontSize: 12, fontWeight: "600" }}>Category</Text>
              <Pressable 
                onPress={() => !saving && !scanningReceipt && setCategorySelectorOpen(true)}
                style={{ 
                  width: "100%", 
                  flexDirection: "row", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  borderWidth: 1, 
                  borderColor: "#DDE4E5", 
                  borderRadius: 12, 
                  backgroundColor: "white", 
                  paddingHorizontal: 12, 
                  paddingVertical: 12 
                }}
              >
                <Text style={{ color: "#0f172a", fontSize: 12 }}>
                  {categoryId ? MOCK_CATEGORIES.find((c) => c.id === categoryId)?.name : "Select category..."}
                </Text>
                <Tag size={14} color="#94a3b8" />
              </Pressable>
              {formErrors.categoryId ? (
                <Text style={{ color: "#ef4444", fontSize: 10, fontWeight: "500", marginTop: 2 }}>{formErrors.categoryId}</Text>
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
                onChangeText={setDate}
                error={formErrors.date}
                editable={!saving && !scanningReceipt}
              />
            ) : (
              <>
                <TouchableOpacity 
                  onPress={() => !saving && !scanningReceipt && setShowDatePicker(true)}
                  activeOpacity={0.7}
                  style={{ width: "100%" }}
                >
                  <View pointerEvents="none">
                    <Input 
                      label="Transaction Date"
                      placeholder="YYYY-MM-DD"
                      value={date}
                      error={formErrors.date}
                      editable={false}
                    />
                  </View>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={new Date(date)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleDateChange}
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

            {/* Recurring Custom Checkbox */}
            <Pressable 
              onPress={() => !saving && !scanningReceipt && setIsRecurring(!isRecurring)}
              style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}
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
                  justifyContent: "center" 
                }}
              >
                {isRecurring ? <Check size={11} color="white" /> : null}
              </View>
              <Text style={{ color: "#334155", fontSize: 12, fontWeight: "600" }}>
                Is Recurring Transaction?
              </Text>
            </Pressable>

            <Button 
              variant="default" 
              onPress={handleAddTransaction} 
              loading={saving || scanningReceipt}
              disabled={accounts.length === 0 || scanningReceipt}
              className="mt-2 bg-[#32484F]"
            >
              Submit Record
            </Button>
          </View>
        </ScrollView>
      </Dialog>

      {/* Account Selector Dialog Sub-Modal */}
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
              style={{ 
                flexDirection: "row", 
                alignItems: "center", 
                justifyContent: "space-between", 
                paddingVertical: 12, 
                borderBottomWidth: 1, 
                borderBottomColor: "#f1f5f9" 
              }}
            >
              <View>
                <Text style={{ color: "#0f172a", fontSize: 14, fontWeight: "600" }}>{acc.name}</Text>
                <Text style={{ color: "#94a3b8", fontSize: 9, textTransform: "uppercase", marginTop: 2 }}>
                  {acc.type} • {formatCurrency(acc.balance)}
                </Text>
              </View>
              {accountId === acc.id ? <Check size={16} color="#059669" /> : null}
            </Pressable>
          ))}
        </ScrollView>
      </Dialog>

      {/* Category Selector Dialog Sub-Modal */}
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
              style={{ 
                flexDirection: "row", 
                alignItems: "center", 
                justifyContent: "space-between", 
                paddingVertical: 12, 
                borderBottomWidth: 1, 
                borderBottomColor: "#f1f5f9" 
              }}
            >
              <Text style={{ color: "#0f172a", fontSize: 14, fontWeight: "600" }}>{cat.name}</Text>
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

      {/* Transaction Details Modal */}
      <Dialog
        open={detailsModalOpen}
        onClose={() => !confirmDeleteOpen && setDetailsModalOpen(false)}
        title="Transaction Details"
      >
        {selectedTransaction && (
          <View style={{ flexDirection: "column", gap: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", alignItems: "center" }}>
              <Text style={{ color: "#64748b", fontSize: 12, flex: 0.4 }}>Description</Text>
              <Text style={{ color: "#0f172a", fontSize: 12, fontWeight: "bold", textAlign: "right", flex: 0.6 }}>{selectedTransaction.description}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", alignItems: "center" }}>
              <Text style={{ color: "#64748b", fontSize: 12, flex: 0.4 }}>Amount</Text>
              <Text style={{ fontSize: 12, fontWeight: "800", color: selectedTransaction.type === "INCOME" ? "#059669" : "#0f172a", textAlign: "right", flex: 0.6 }}>
                {selectedTransaction.type === "INCOME" ? "+" : ""}{formatCurrency(selectedTransaction.amount)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", alignItems: "center" }}>
              <Text style={{ color: "#64748b", fontSize: 12, flex: 0.4 }}>Account</Text>
              <Text style={{ color: "#0f172a", fontSize: 12, fontWeight: "600", textAlign: "right", flex: 0.6 }}>
                {accounts.find((a) => a.id === selectedTransaction.accountId)?.name || "Unknown"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", alignItems: "center" }}>
              <Text style={{ color: "#64748b", fontSize: 12, flex: 0.4 }}>Category</Text>
              <Text style={{ color: "#0f172a", fontSize: 12, fontWeight: "600", textAlign: "right", flex: 0.6 }}>
                {MOCK_CATEGORIES.find((c) => c.id === selectedTransaction.categoryId)?.name || "Uncategorized"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", alignItems: "center" }}>
              <Text style={{ color: "#64748b", fontSize: 12, flex: 0.4 }}>Date</Text>
              <Text style={{ color: "#0f172a", fontSize: 12, textAlign: "right", flex: 0.6 }}>
                {new Date(selectedTransaction.date).toLocaleDateString()}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", alignItems: "center" }}>
              <Text style={{ color: "#64748b", fontSize: 12, flex: 0.4 }}>Recurring</Text>
              <Text style={{ color: "#0f172a", fontSize: 12, textAlign: "right", flex: 0.6 }}>
                {selectedTransaction.isRecurring ? "Yes" : "No"}
              </Text>
            </View>

            {/* Receipt Preview */}
            {selectedTransaction.receiptUrl ? (
              <View style={{ flexDirection: "column", gap: 6, paddingTop: 4 }}>
                <Text style={{ color: "#64748b", fontSize: 12 }}>Receipt</Text>
                <Image
                  source={{ uri: selectedTransaction.receiptUrl }}
                  style={{ width: "100%", height: 176, borderRadius: 12 }}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: 12, marginTop: 8, width: "100%" }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#32484F",
                  borderRadius: 12,
                  paddingVertical: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 44
                }}
                onPress={() => {
                  if (selectedTransaction) {
                    setIsEditing(true);
                    setEditingTransactionId(selectedTransaction.id);
                    setDescription(selectedTransaction.description);
                    setAmount(selectedTransaction.amount.toString());
                    setType(selectedTransaction.type);
                    setCategoryId(selectedTransaction.categoryId);
                    setAccountId(selectedTransaction.accountId);
                    setDate(selectedTransaction.date.split("T")[0]);
                    setIsRecurring(selectedTransaction.isRecurring === 1 || selectedTransaction.isRecurring === true);
                    setReceiptUri(selectedTransaction.receiptUrl || null);
                    
                    setDetailsModalOpen(false);
                    setModalOpen(true);
                  }
                }}
              >
                <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#dc2626",
                  borderRadius: 12,
                  paddingVertical: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 44
                }}
                onPress={() => setConfirmDeleteOpen(true)}
              >
                <Trash2 size={14} color="white" style={{ marginRight: 4 }} />
                <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Dialog>

      {/* Confirm Delete Alert Dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Confirm Deletion"
      >
        <View style={{ alignItems: "center", paddingVertical: 8, flexDirection: "column", gap: 12 }}>
          <AlertTriangle size={32} color="#ef4444" />
          <Text style={{ color: "#1e293b", fontSize: 14, fontWeight: "600", textAlign: "center" }}>
            Are you sure you want to delete this transaction record?
          </Text>
          <Text style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", marginBottom: 12 }}>
            Deleting this record will restore the transaction value back to the balance of the linked account.
          </Text>
          <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
            <Button variant="outline" style={{ flex: 1 }} onPress={() => setConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              style={{ flex: 1 }} 
              onPress={() => selectedTransaction && handleDeleteTransaction(selectedTransaction.id)}
            >
              Confirm Delete
            </Button>
          </View>
        </View>
      </Dialog>

      <TransactionFilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        transactions={transactions}
        accounts={accounts}
        currentFilters={filters}
        onApply={(updatedFilters) => setFilters(updatedFilters)}
        onReset={resetFilters}
      />

      {/* Attach Receipt Options Dialog */}
      <Dialog
        open={attachReceiptOpen}
        onClose={() => {
          setAttachReceiptOpen(false);
          setModalOpen(true);
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
              setModalOpen(true);
            }}
            className="py-3.5 px-4 rounded-2xl bg-slate-50 border border-slate-200/60 items-center justify-center active:bg-slate-100"
          >
            <Text className="text-slate-600 font-bold text-sm">Cancel</Text>
          </TouchableOpacity>
        </View>
      </Dialog>
    </View>
  );
}
