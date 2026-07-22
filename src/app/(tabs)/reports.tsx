import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, ScrollView, Pressable, TouchableOpacity } from "react-native";
import { Settings, Download, FileText, PieChart, Mail } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useFocusEffect } from "expo-router";
import { BarChart } from "react-native-gifted-charts";
import { AccountRepository, TransactionRepository } from "@/services/db-repositories";
import { Account, Transaction } from "@/types";
import { useAppAuth } from "@/components/auth-provider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@clerk/clerk-expo";
import { MOCK_CATEGORIES } from "@/lib/mock-data";
import Constants from "expo-constants";
import { useSettingsStore } from "@/store/useSettingsStore";
import { resolveApiBaseUrl } from "@/services/apiResolver";
import { parseSafeDate } from "@/lib/dateUtils";

export default function ReportsScreen() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // App Authentication User Context
  const { user } = useAppAuth();
  
  // Data States
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reportHistory, setReportHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportsActive, setReportsActive] = useState(false);
  const [spendingHistoryPeriod, setSpendingHistoryPeriod] = useState<"7D" | "30D" | "3M" | "6M" | "1Y">("6M");

  const loadReportHistory = async () => {
    try {
      const historyVal = await AsyncStorage.getItem("report_history_list");
      if (historyVal) {
        setReportHistory(JSON.parse(historyVal));
      }
    } catch (err) {
      console.error("Failed to load report history", err);
    }
  };

  // Load Reports Configuration settings and Database Records
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const val = await AsyncStorage.getItem("reports_activated");
        if (val !== null) {
          setReportsActive(val === "true");
        }
      } catch (err) {
        console.error("Failed to load reports settings", err);
      }
    };
    loadSettings();
  }, []);

  const handleToggleReports = async () => {
    try {
      const nextVal = !reportsActive;
      setReportsActive(nextVal);
      await AsyncStorage.setItem("reports_activated", String(nextVal));
    } catch (err) {
      console.error("Failed to save reports settings", err);
    }
  };

  const loadReportsData = useCallback(async () => {
    try {
      const accountsData = await AccountRepository.getAll();
      const transactionsData = await TransactionRepository.getAll();
      setAccounts(accountsData);
      setTransactions(transactionsData);
      await loadReportHistory();
    } catch (err) {
      console.error("Failed to load reports data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReportsData();
    }, [loadReportsData])
  );

  // Format currency helper
  const formatCurrency = useCallback((amount: number) => {
    const isNegative = amount < 0;
    const formatted = Math.abs(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${isNegative ? "-" : ""}₹${formatted}`;
  }, []);

  // Current calendar month details
  const currentMonthName = useMemo(() => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return months[new Date().getMonth()];
  }, []);

  const { currentMonthIncome, currentMonthExpense, currentMonthNet } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    let inc = 0;
    let exp = 0;
    
    transactions.forEach((t) => {
      const tDate = parseSafeDate(t.date);
      if (tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth) {
        if (t.type === "INCOME") {
          inc += t.amount;
        } else {
          exp += t.amount;
        }
      }
    });

    return {
      currentMonthIncome: inc,
      currentMonthExpense: exp,
      currentMonthNet: inc - exp
    };
  }, [transactions]);

  // Compute historical spending trends based on selected period
  const historicalBarData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    if (spendingHistoryPeriod === "7D") {
      const daysLabel = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        d.setHours(0, 0, 0, 0);
        
        const start = d.getTime();
        const end = start + 86400000;
        const label = daysLabel[d.getDay()];
        
        const spent = transactions
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
    else if (spendingHistoryPeriod === "30D") {
      // Group by 5-day intervals (6 bars total)
      for (let i = 5; i >= 0; i--) {
        const startD = new Date();
        startD.setDate(now.getDate() - (i * 5 + 4));
        startD.setHours(0, 0, 0, 0);
        
        const endD = new Date();
        endD.setDate(now.getDate() - (i * 5));
        endD.setHours(23, 59, 59, 999);
        
        const start = startD.getTime();
        const end = endD.getTime();
        const label = `${startD.getDate()}/${startD.getMonth() + 1}`;
        
        const spent = transactions
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
      const monthsCount = spendingHistoryPeriod === "3M" ? 3 : spendingHistoryPeriod === "6M" ? 6 : 12;
      
      for (let i = monthsCount - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        
        const startD = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
        const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        
        const start = startD.getTime();
        const end = endD.getTime();
        const label = `${monthsLabel[startD.getMonth()]} ${startD.getFullYear().toString().slice(-2)}`;
        
        const spent = transactions
          .filter((t) => {
            if (t.type !== "EXPENSE") return false;
            const tDate = parseSafeDate(t.date);
            return tDate.getFullYear() === startD.getFullYear() && tDate.getMonth() === startD.getMonth();
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
  }, [transactions, spendingHistoryPeriod]);

  const chartLayoutConfig = useMemo(() => {
    switch (spendingHistoryPeriod) {
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
  }, [spendingHistoryPeriod]);

  const { getToken } = useAuth();
  const { showToast } = useToast();

  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    return transactions
      .filter((t) => {
        const tDate = parseSafeDate(t.date);
        return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
      })
      .map((t) => {
        const cat = MOCK_CATEGORIES.find((c) => c.id === t.categoryId);
        return {
          category: cat?.name || "Uncategorized",
          description: t.description,
          type: t.type,
          amount: t.amount,
          date: t.date,
        };
      });
  }, [transactions]);

  const lastMonthData = useMemo(() => {
    const now = new Date();
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth() - 1;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    }
    
    let inc = 0;
    let exp = 0;
    const transList: any[] = [];
    
    transactions.forEach((t) => {
      const tDate = parseSafeDate(t.date);
      if (tDate.getFullYear() === targetYear && tDate.getMonth() === targetMonth) {
        if (t.type === "INCOME") {
          inc += t.amount;
        } else {
          exp += t.amount;
        }
        const cat = MOCK_CATEGORIES.find((c) => c.id === t.categoryId);
        transList.push({
          category: cat?.name || "Uncategorized",
          description: t.description,
          type: t.type,
          amount: t.amount,
          date: t.date,
        });
      }
    });

    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    return {
      monthName: months[targetMonth],
      income: inc,
      expense: exp,
      net: inc - exp,
      transactions: transList,
    };
  }, [transactions]);

  const [sendingEmail, setSendingEmail] = useState<"last-month" | "current-progress" | null>(null);

  const handleSendReport = async (reportType: "last-month" | "current-progress") => {
    if (!user?.email) {
      showToast("User email address not found.", "error");
      return;
    }
    
    setSendingEmail(reportType);
    try {
      const token = await getToken();
      if (!token) {
        showToast("Authentication token is missing. Please log in again.", "error");
        return;
      }
      
      let dataPayload = {
        monthName: currentMonthName,
        income: currentMonthIncome,
        expense: currentMonthExpense,
        net: currentMonthNet,
        transactions: currentMonthTransactions,
      };
      
      if (reportType === "last-month") {
        dataPayload = {
          monthName: lastMonthData.monthName,
          income: lastMonthData.income,
          expense: lastMonthData.expense,
          net: lastMonthData.net,
          transactions: lastMonthData.transactions,
        };
      }
      
      const API_BASE_URL = resolveApiBaseUrl();
      
      console.log(`[DEBUG] Attempting to send report via URL: ${API_BASE_URL}/send-report`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn(`[DEBUG] Request to ${API_BASE_URL}/send-report timed out after 15 seconds`);
        controller.abort();
      }, 15000);
      
      const response = await fetch(`${API_BASE_URL}/send-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: user.email,
          userName: user.fullName || "User",
          reportType,
          reportData: dataPayload,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        showToast(`Email report sent to ${user.email}!`, "success");
        try {
          const newHistoryItem = {
            id: Date.now().toString(),
            reportType,
            monthName: dataPayload.monthName,
            dateSent: new Date().toISOString(),
            email: user.email,
          };
          const historyVal = await AsyncStorage.getItem("report_history_list");
          const existingHistory = historyVal ? JSON.parse(historyVal) : [];
          const updatedHistory = [newHistoryItem, ...existingHistory];
          setReportHistory(updatedHistory);
          await AsyncStorage.setItem("report_history_list", JSON.stringify(updatedHistory));
        } catch (err) {
          console.error("Failed to save report history item", err);
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        showToast(errJson.error || "Failed to send email report.", "error");
      }
    } catch (err: any) {
      console.error("[DEBUG] Error sending email report:", err);
      if (err.name === 'AbortError') {
        showToast("Request timed out. The server took too long to respond.", "error");
      } else {
        showToast("Failed to connect to report server.", "error");
      }
    } finally {
      setSendingEmail(null);
    }
  };

  return (
    <View className="flex-1 bg-[#F8FBFC]">
      <ScrollView className="flex-1 px-4 py-6" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View className="mb-6">
          <View className="flex-row justify-between items-start mb-2">
            <View>
              <Text className="text-primary text-2xl font-bold">Financial Reports</Text>
              <Text className="text-slate-500 text-xs mt-1">
                Comprehensive history of your automated email summaries
              </Text>
            </View>
            <Pressable
              onPress={() => setSettingsOpen(true)}
              className="bg-primary active:bg-[#233A41] rounded-xl px-3 py-2 flex-row items-center space-x-1"
            >
              <Settings size={14} color="white" />
              <Text className="text-white text-xs font-bold ml-1">Report Settings</Text>
            </Pressable>
          </View>
        </View>

        {/* Monthly Summary Card */}
        <View className="bg-white border border-[#DDE4E5] rounded-3xl p-5 shadow-sm mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-primary font-bold text-lg">Monthly Summary - {currentMonthName}</Text>
              <Text className="text-slate-500 text-xs mt-0.5">Real-time financial performance overview</Text>
            </View>
            <PieChart size={24} color="#CAA166" />
          </View>

          <View className="flex-row flex-wrap gap-2 mb-6">
            <TouchableOpacity 
              onPress={() => !sendingEmail && handleSendReport("last-month")}
              disabled={sendingEmail !== null}
              activeOpacity={0.7}
            >
              <Badge variant="success">
                {sendingEmail === "last-month" ? "Sending..." : "Last Month"}
              </Badge>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => !sendingEmail && handleSendReport("current-progress")}
              disabled={sendingEmail !== null}
              activeOpacity={0.7}
            >
              <Badge variant="info">
                {sendingEmail === "current-progress" ? "Sending..." : "Current Progress"}
              </Badge>
            </TouchableOpacity>
          </View>

          <View className="bg-[#F8FBFC] rounded-2xl p-4 flex-col gap-3">
            <View className="flex-row justify-between items-center py-1">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />
                <Text className="text-slate-600 text-sm font-semibold">Total Income</Text>
              </View>
              <Text className="text-primary font-bold text-base">{formatCurrency(currentMonthIncome)}</Text>
            </View>
            
            <View className="h-px bg-[#DDE4E5]/50 w-full" />
            
            <View className="flex-row justify-between items-center py-1">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2" />
                <Text className="text-slate-600 text-sm font-semibold">Total Expenses</Text>
              </View>
              <Text className="text-primary font-bold text-base">{formatCurrency(currentMonthExpense)}</Text>
            </View>
            
            <View className="h-px bg-[#DDE4E5]/50 w-full" />
            
            <View className="flex-row justify-between items-center py-1">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-sky-500 mr-2" />
                <Text className="text-slate-600 text-sm font-semibold">Net Balance</Text>
              </View>
              <Text className="text-[#CAA166] font-extrabold text-base">{formatCurrency(currentMonthNet)}</Text>
            </View>
          </View>
        </View>

        {/* Spending History Card */}
        <View className="bg-white border border-[#DDE4E5] rounded-3xl p-5 shadow-sm mb-6">
          <Text className="text-primary font-bold text-lg mb-1">
            {spendingHistoryPeriod === "7D" && "7-Day Spending History"}
            {spendingHistoryPeriod === "30D" && "30-Day Spending History"}
            {spendingHistoryPeriod === "3M" && "3-Month Spending History"}
            {spendingHistoryPeriod === "6M" && "6-Month Spending History"}
            {spendingHistoryPeriod === "1Y" && "1-Year Spending History"}
          </Text>
          <Text className="text-slate-500 text-xs mb-4">
            {spendingHistoryPeriod === "7D" && "Tracking daily outflow for the past week"}
            {spendingHistoryPeriod === "30D" && "Tracking outflow for the past month"}
            {spendingHistoryPeriod === "3M" && "Tracking monthly outflow for the past quarter"}
            {spendingHistoryPeriod === "6M" && "Tracking monthly outflow for the past half-year"}
            {spendingHistoryPeriod === "1Y" && "Tracking monthly outflow for the past year"}
          </Text>

          {/* Time Period Selector Tabs (Inline style to avoid css-interop printUpgradeWarning crashes) */}
          <View className="flex-row gap-1 mb-4 bg-slate-50 p-1 rounded-xl border border-slate-100">
            {(["7D", "30D", "3M", "6M", "1Y"] as const).map((period) => {
              const isActive = spendingHistoryPeriod === period;
              return (
                <TouchableOpacity
                  key={period}
                  onPress={() => setSpendingHistoryPeriod(period)}
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
            <View className="h-44 justify-center items-center">
              <Text className="text-slate-400 text-xs">Loading historical data...</Text>
            </View>
          ) : (
            <View className="items-center justify-center h-44 mt-2">
              <BarChart
                data={historicalBarData}
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

        {/* Report History List */}
        <View className="mt-2">
          <Text className="text-primary font-bold text-lg mb-4">Report History</Text>
          {reportHistory.length > 0 ? (
            reportHistory.map((item) => (
              <View 
                key={item.id} 
                className="bg-white border border-[#DDE4E5] rounded-2xl p-4 mb-3 flex-row items-center justify-between shadow-sm"
              >
                <View className="flex-row items-center flex-1 pr-2">
                  <View className="w-10 h-10 rounded-full bg-slate-50 justify-center items-center mr-3">
                    <Mail size={18} color="#32484F" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-primary font-bold text-sm">
                      {item.reportType === "last-month" ? "Monthly Report" : "Summary Progress"} - {item.monthName}
                    </Text>
                    <Text className="text-slate-400 text-[10px] mt-0.5">
                      {new Date(item.dateSent).toLocaleDateString("en-IN", { 
                        day: "numeric", 
                        month: "short", 
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </Text>
                    <Text className="text-slate-500 text-[10px] mt-0.5" numberOfLines={1}>
                      To: {item.email}
                    </Text>
                  </View>
                </View>
                
                <View className="bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex-row items-center">
                  <Text className="text-emerald-600 text-[10px] font-bold">Sent</Text>
                </View>
              </View>
            ))
          ) : (
            <View className="items-center justify-center py-16 bg-white border border-[#DDE4E5] rounded-3xl shadow-sm">
              <FileText size={36} color="#94a3b8" style={{ marginBottom: 12 }} />
              <Text className="text-slate-500 text-sm font-medium">No report emails have been sent yet.</Text>
              <Text className="text-slate-400 text-xs mt-1 text-center px-8">
                Enable reports in settings to start receiving automated summaries.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Report Settings Drawer */}
      <Drawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Report Settings"
      >
        <Text className="text-slate-500 text-sm mb-6">
          Enable or disable monthly financial report emails
        </Text>
        
        <View className="flex-col gap-6 mb-8">
          <View className="flex-row items-center justify-between">
            <Text className="text-primary font-semibold">Reports activated</Text>
            <Pressable
              onPress={handleToggleReports}
              style={{
                width: 48,
                height: 24,
                backgroundColor: reportsActive ? "#32484F" : "#cbd5e1",
                borderRadius: 9999,
                padding: 2,
                justifyContent: "center",
                alignItems: reportsActive ? "flex-end" : "flex-start",
              }}
            >
              <View className="w-5 h-5 bg-white rounded-full" />
            </Pressable>
          </View>
          
          <View>
            <Text className="text-primary font-semibold mb-1">Receiving Email</Text>
            <Text className="text-slate-500 text-xs mb-3">
              Reports are sent to your verified primary email address.
            </Text>
            <Input 
              label=""
              value={user?.email || "tester12345@gmail.com"}
              editable={false}
              placeholder="Email address"
            />
          </View>
          
          <View>
            <Text className="text-primary font-semibold mb-1">Repeat On</Text>
            <View className="border border-[#DDE4E5] rounded-xl px-4 py-3 bg-[#F8FBFC] mb-2">
              <Text className="text-primary font-medium">Monthly</Text>
            </View>
            <Text className="text-slate-500 text-xs">
              Schedule Summary - Report will be sent once a month on the 1st day of the next month.
            </Text>
          </View>
        </View>
        
        <Button
          variant="default"
          onPress={() => setSettingsOpen(false)}
          className="w-full bg-primary py-3"
        >
          Save changes
        </Button>
      </Drawer>
    </View>
  );
}
