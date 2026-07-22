import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Switch, Alert, Platform, TouchableOpacity } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAppAuth } from "@/components/auth-provider";
import { useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useToast } from "@/components/ui/toast";
import { Drawer } from "@/components/ui/drawer";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  User, 
  LogOut, 
  ChevronRight, 
  Globe,
  Moon, 
  Sun, 
  Shield, 
  HelpCircle,
  Sparkles,
  Bell,
  Coins,
  Sliders,
  Trash2,
  Download,
  Mail,
  Phone,
  Wallet,
  Check
} from "lucide-react-native";
import { BudgetRepository, TransactionRepository, SystemRepository, AccountRepository } from "@/services/db-repositories";
import { Account } from "@/types";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useSmsStore } from "@/store/useSmsStore";
import { requestSmsPermission } from "@/services/sms/smsPermissions";
import { PermissionsAndroid } from "react-native";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, isSignedIn } = useAppAuth();
  const { user: clerkUser } = useUser();
  const { showToast } = useToast();

  // Profile data states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(user?.fullName || "");
  const [profilePhone, setProfilePhone] = useState("");
  const [displayName, setDisplayName] = useState(user?.fullName || "Guest User");
  const [savingProfile, setSavingProfile] = useState(false);

  // Financial Preference states
  const [financialDrawerOpen, setFinancialDrawerOpen] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState("2000");
  const [alertThreshold, setAlertThreshold] = useState("80");
  const [tempMonthlyBudget, setTempMonthlyBudget] = useState("");
  const [tempAlertThreshold, setTempAlertThreshold] = useState("80");
  const [savingFinancials, setSavingFinancials] = useState(false);

  // App Toggles from Zustand persisted store
  const { 
    isDarkMode, 
    dailyReminder, 
    smsSync, 
    defaultBankAccountId,
    apiUrl,
    setDarkMode, 
    setDailyReminder, 
    setSmsSync,
    setDefaultBankAccountId,
    setApiUrl
  } = useSettingsStore();

  const [apiUrlModalOpen, setApiUrlModalOpen] = useState(false);
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl || "");

  useEffect(() => {
    setTempApiUrl(apiUrl || "");
  }, [apiUrl]);

  // Default Bank Select States
  const [bankDrawerOpen, setBankDrawerOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Help & Support drawer
  const [supportDrawerOpen, setSupportDrawerOpen] = useState(false);

  // Load all settings and accounts on start/focus
  useFocusEffect(
    useCallback(() => {
      const loadSettings = async () => {
        try {
          // 1. Profile Data
          const storedPhone = await AsyncStorage.getItem("user_phone_number");
          if (storedPhone) {
            setProfilePhone(storedPhone);
          }
          
          const storedName = await AsyncStorage.getItem("user_custom_name");
          if (storedName) {
            setDisplayName(storedName);
            setProfileName(storedName);
          } else if (user?.fullName) {
            setDisplayName(user.fullName);
            setProfileName(user.fullName);
          }

          // 2. Financial Settings
          const storedThreshold = await AsyncStorage.getItem("setting_alert_threshold");
          if (storedThreshold) {
            setAlertThreshold(storedThreshold);
            setTempAlertThreshold(storedThreshold);
          } else {
            setAlertThreshold("80");
            setTempAlertThreshold("80");
          }

          const budgetsData = await BudgetRepository.getAll();
          const globalBudget = budgetsData.find((b) => b.id === "global-budget" || b.categoryId === "global");
          if (globalBudget) {
            const amountStr = globalBudget.amount.toString();
            setMonthlyBudget(amountStr);
            setTempMonthlyBudget(amountStr);
          } else {
            setMonthlyBudget("2000");
            setTempMonthlyBudget("2000");
          }

          // 3. Linked Accounts
          const accountsData = await AccountRepository.getAll();
          setAccounts(accountsData);
        } catch (err) {
          console.error("Failed to load settings data", err);
        }
      };
      loadSettings();
    }, [user])
  );

  const handleLogout = async () => {
    console.log("Settings: Logging out");
    await signOut();
  };

  const handleSaveProfile = async () => {
    const cleanName = profileName.trim();
    if (!cleanName) {
      showToast("Full Name is required.", "error");
      return;
    }

    setSavingProfile(true);
    try {
      // 1. Save mobile number and name persistently to AsyncStorage
      await AsyncStorage.setItem("user_phone_number", profilePhone.trim());
      await AsyncStorage.setItem("user_custom_name", cleanName);
      setDisplayName(cleanName);

      // 2. If Clerk authenticated session is active, update Clerk database
      if (clerkUser) {
        const nameParts = cleanName.split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";
        
        await clerkUser.update({
          firstName,
          lastName,
        });
      }

      showToast("Profile settings updated successfully!", "success");
      setEditProfileOpen(false);
    } catch (err: any) {
      console.error("Failed to update profile settings:", err);
      showToast(err?.message || "Failed to update profile.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveFinancials = async () => {
    const budgetVal = parseFloat(tempMonthlyBudget);
    if (isNaN(budgetVal) || budgetVal <= 0) {
      showToast("Please enter a valid monthly budget amount", "error");
      return;
    }
    const thresholdVal = parseInt(tempAlertThreshold);
    if (isNaN(thresholdVal) || thresholdVal < 1 || thresholdVal > 100) {
      showToast("Please enter an alert threshold between 1 and 100", "error");
      return;
    }

    setSavingFinancials(true);
    try {
      // Save budget to SQLite database
      await BudgetRepository.setLimit({
        id: "global-budget",
        amount: budgetVal,
        categoryId: "global",
        period: "MONTHLY",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Save threshold to AsyncStorage
      await AsyncStorage.setItem("setting_alert_threshold", tempAlertThreshold);
      
      setMonthlyBudget(tempMonthlyBudget);
      setAlertThreshold(tempAlertThreshold);
      setFinancialDrawerOpen(false);
      showToast("Financial preferences updated!", "success");
    } catch (err) {
      console.error("Failed to save financials settings", err);
      showToast("Failed to save budget settings.", "error");
    } finally {
      setSavingFinancials(false);
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: "Daily Reminders Notification Permission",
            message: "FinSight needs access to send you daily notifications to log your transactions.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        }

        // Fallback for denied/unavailable notifications permission (e.g. Expo Go)
        return new Promise<boolean>((resolve) => {
          Alert.alert(
            "Notification Permission Request",
            "Real notifications permission could not be granted. Would you like to enable Mock/Simulated Daily Reminders anyway for testing?",
            [
              {
                text: "Cancel",
                onPress: () => resolve(false),
                style: "cancel",
              },
              {
                text: "Enable Mock Mode",
                onPress: () => resolve(true),
              },
            ],
            { cancelable: false }
          );
        });
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // Auto-grant/simulate on iOS/Web
  };

  const handleToggleReminder = async (val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        showToast("Notification permission denied. Cannot enable reminders.", "error");
        return;
      }
      setDailyReminder(true);
      showToast("Daily logs reminders scheduled for 8:00 PM!", "success");
    } else {
      setDailyReminder(false);
      showToast("Daily reminders deactivated.", "success");
    }
  };

  const handleToggleSmsSync = async (val: boolean) => {
    if (val) {
      const granted = await requestSmsPermission();
      if (!granted) {
        showToast("SMS permission denied. Cannot enable automatic sync.", "error");
        return;
      }
      setSmsSync(true);
      showToast("SMS Automatic Sync activated!", "success");
      
      // Seed two mock SMS drafts into useSmsStore if drafts are currently empty
      const { drafts, addDraft } = useSmsStore.getState();
      const pendingCount = drafts.filter(d => d.status === 'PENDING').length;
      if (pendingCount === 0) {
        addDraft({
          rawSmsText: "Alert: Rs 1,250.00 debited from card ending in 4921 at Swiggy",
          smsSender: "HDFCBK",
          parsedAmount: 1250,
          parsedMerchant: "Swiggy",
          parsedDate: new Date().toISOString(),
          parsedType: "expense",
          upiReference: "492138402931",
          parseConfidence: "HIGH"
        });
        addDraft({
          rawSmsText: "Transaction: INR 450.00 debited from Account XX7721 for Uber India",
          smsSender: "SBI-IN",
          parsedAmount: 450,
          parsedMerchant: "Uber India",
          parsedDate: new Date().toISOString(),
          parsedType: "expense",
          upiReference: "772198402923",
          parseConfidence: "HIGH"
        });
        showToast("SMS Sync scanning finished! 2 new drafts added to SMS Sync screen.", "success");
      }
    } else {
      setSmsSync(false);
      showToast("SMS Automatic Sync deactivated.", "success");
    }
  };


  const handleExportCSV = async () => {
    try {
      const transactions = await TransactionRepository.getAll();
      if (transactions.length === 0) {
        showToast("No transactions found to export.", "error");
        return;
      }

      // Generate CSV string
      const headers = "ID,Amount,Date,Description,Type,Category,Account,Recurring,Created At\n";
      const rows = transactions.map(t => {
        const cleanDesc = t.description ? t.description.replace(/"/g, '""') : "";
        return `"${t.id}",${t.amount},"${t.date}","${cleanDesc}","${t.type}","${t.categoryId}","${t.accountId}",${t.isRecurring ? 1 : 0},"${t.createdAt}"`;
      }).join("\n");

      const csvContent = headers + rows;

      // Temporary file path in document directory
      const filename = `FinSight_Transactions_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Write string to file
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share file using expo-sharing
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Export Transactions CSV",
          UTI: "public.comma-separated-values-text"
        });
        showToast("CSV report exported successfully!", "success");
      } else {
        showToast("Sharing not available on this device", "error");
      }
    } catch (err) {
      console.error("Failed to export transactions CSV", err);
      showToast("Failed to export data.", "error");
    }
  };

  const handleResetData = () => {
    Alert.alert(
      "Reset All Data",
      "Are you absolutely sure you want to delete all transactions, budgets, savings goals, and accounts? This action is permanent and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset Everything", 
          style: "destructive",
          onPress: async () => {
            try {
              // Clear SQLite database tables
              await SystemRepository.clearAllData();
              
              // Clear SMS store drafts history
              useSmsStore.getState().clearAll();
              
              // Clear custom settings keys
              await AsyncStorage.removeItem("user_phone_number");
              await AsyncStorage.removeItem("user_custom_name");
              await AsyncStorage.removeItem("setting_daily_reminder");
              await AsyncStorage.removeItem("setting_sms_sync");
              await AsyncStorage.removeItem("setting_dark_theme");
              await AsyncStorage.removeItem("setting_alert_threshold");
              await AsyncStorage.removeItem("quick_add_shortcuts");
              
              // Reset local UI state
              setProfilePhone("");
              setDisplayName("Guest User");
              setProfileName("");
              setDailyReminder(false);
              setSmsSync(false);
              setDarkMode(false);
              setMonthlyBudget("2000");
              setAlertThreshold("80");
              setTempMonthlyBudget("2000");
              setTempAlertThreshold("80");

              showToast("All data has been reset successfully.", "success");
            } catch (err) {
              console.error("Reset data error", err);
              showToast("Failed to clear database.", "error");
            }
          }
        }
      ]
    );
  };

  const formattedBudget = parseFloat(monthlyBudget).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  const themeBg = isDarkMode ? "bg-slate-950" : "bg-[#F8FBFC]";
  const themeCardBg = isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-[#DDE4E5]";
  const themeText = isDarkMode ? "text-slate-100" : "text-slate-900";
  const themeSubtext = isDarkMode ? "text-slate-400" : "text-slate-500";
  const themeLightBg = isDarkMode ? "bg-slate-800" : "bg-lightBg";
  const themeBorder = isDarkMode ? "border-slate-800" : "border-slate-100";

  return (
    <View className={`flex-1 ${themeBg}`}>
      <ScrollView className="flex-1 px-4 py-6" contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Profile Card Section */}
        <View className={`${themeCardBg} border rounded-3xl p-5 shadow-sm mb-6 items-center`}>
          <View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-4">
            <Text className="text-white text-2xl font-bold">
              {displayName ? displayName.charAt(0).toUpperCase() : "U"}
            </Text>
          </View>
          <Text className={`${themeText} text-xl font-bold tracking-tight mb-1`}>
            {displayName}
          </Text>
          <Text className={`${themeSubtext} text-sm mb-1`}>
            {user?.email || "No email available"}
          </Text>
          {profilePhone ? (
            <Text className="text-slate-400 text-xs mb-3 font-semibold">
              {profilePhone}
            </Text>
          ) : (
            <Text className="text-slate-400 text-xs mb-3 italic">
              No mobile number configured
            </Text>
          )}
          <View className="flex-row gap-2">
            <View className={`${themeLightBg} px-3 py-1.5 rounded-full border ${isDarkMode ? 'border-slate-700' : 'border-cardBorder'}`}>
              <Text className="text-primary text-xs font-semibold">
                {isSignedIn ? "Authenticated Session" : "Guest Mode"}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setEditProfileOpen(true)}
              className="bg-primary active:bg-[#233A41] px-3.5 py-1.5 rounded-full shadow-sm"
            >
              <Text className="text-white text-xs font-bold">Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Profile Details */}
        <View className={`${themeCardBg} border rounded-3xl p-2 shadow-sm mb-6`}>
          <Text className="text-primary font-bold text-sm px-4 pt-3 pb-1 uppercase tracking-wider">
            Personal Information
          </Text>

          <TouchableOpacity 
            onPress={() => setEditProfileOpen(true)}
            className={`flex-row items-center justify-between p-4 border-b ${themeBorder}`}
          >
            <View className="flex-row items-center space-x-3">
              <View className={`w-10 h-10 rounded-2xl ${themeLightBg} items-center justify-center`}>
                <User size={20} color="#32484F" />
              </View>
              <View className="ml-3">
                <Text className={`${themeSubtext} text-3xs font-bold uppercase tracking-wider`}>Full Name</Text>
                <Text className={`${themeText} font-bold text-sm`}>{displayName}</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setEditProfileOpen(true)}
            className={`flex-row items-center justify-between p-4 border-b ${themeBorder}`}
          >
            <View className="flex-row items-center space-x-3">
              <View className={`w-10 h-10 rounded-2xl ${themeLightBg} items-center justify-center`}>
                <Phone size={18} color="#32484F" />
              </View>
              <View className="ml-3">
                <Text className={`${themeSubtext} text-3xs font-bold uppercase tracking-wider`}>Mobile Number</Text>
                <Text className={`${themeText} font-bold text-sm`}>
                  {profilePhone || "Click to add number"}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center space-x-3">
              <View className={`w-10 h-10 rounded-2xl ${themeLightBg} items-center justify-center`}>
                <Mail size={18} color="#32484F" />
              </View>
              <View className="ml-3">
                <Text className={`${themeSubtext} text-3xs font-bold uppercase tracking-wider`}>Email Address</Text>
                <Text className={`${themeText} font-bold text-sm`}>{user?.email || "N/A"}</Text>
              </View>
            </View>
            <View className={`mr-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} px-2.5 py-1 rounded-full border`}>
              <Text className={`${themeSubtext} text-4xs font-bold uppercase`}>Read-only</Text>
            </View>
          </View>
        </View>

        {/* Section: Financial Preferences */}
        <View className={`${themeCardBg} border rounded-3xl p-2 shadow-sm mb-6`}>
          <Text className="text-primary font-bold text-sm px-4 pt-3 pb-1 uppercase tracking-wider">
            Financial Preferences
          </Text>

          <TouchableOpacity 
            onPress={() => {
              setTempMonthlyBudget(monthlyBudget);
              setTempAlertThreshold(alertThreshold);
              setFinancialDrawerOpen(true);
            }}
            className={`flex-row items-center justify-between p-4 border-b ${themeBorder}`}
          >
            <View className="flex-row items-center space-x-3">
              <View className={`w-10 h-10 rounded-2xl ${themeLightBg} items-center justify-center`}>
                <Coins size={20} color="#32484F" />
              </View>
              <View className="ml-3">
                <Text className={`${themeSubtext} text-3xs font-bold uppercase tracking-wider`}>Monthly Budget</Text>
                <Text className={`${themeText} font-bold text-sm`}>₹{formattedBudget}</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => {
              setTempMonthlyBudget(monthlyBudget);
              setTempAlertThreshold(alertThreshold);
              setFinancialDrawerOpen(true);
            }}
            className={`flex-row items-center justify-between p-4 border-b ${themeBorder}`}
          >
            <View className="flex-row items-center space-x-3">
              <View className={`w-10 h-10 rounded-2xl ${themeLightBg} items-center justify-center`}>
                <Sliders size={18} color="#32484F" />
              </View>
              <View className="ml-3">
                <Text className={`${themeSubtext} text-3xs font-bold uppercase tracking-wider`}>Alert Threshold</Text>
                <Text className={`${themeText} font-bold text-sm`}>{alertThreshold}% of budget</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => {
              setBankDrawerOpen(true);
            }}
            className={`flex-row items-center justify-between p-4 border-b ${themeBorder}`}
          >
            <View className="flex-row items-center space-x-3">
              <View className={`w-10 h-10 rounded-2xl ${themeLightBg} items-center justify-center`}>
                <Wallet size={18} color="#32484F" />
              </View>
              <View className="ml-3">
                <Text className={`${themeSubtext} text-3xs font-bold uppercase tracking-wider`}>Default Bank Select</Text>
                <Text className={`${themeText} font-bold text-sm`}>
                  {defaultBankAccountId 
                    ? accounts.find((a) => a.id === defaultBankAccountId)?.name || "Not selected"
                    : "First Account (Fallback)"}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center space-x-3">
              <View className={`w-10 h-10 rounded-2xl ${themeLightBg} items-center justify-center`}>
                <Text className="text-primary font-bold text-base">₹</Text>
              </View>
              <View className="ml-3">
                <Text className={`${themeSubtext} text-3xs font-bold uppercase tracking-wider`}>Base Currency</Text>
                <Text className={`${themeText} font-bold text-sm`}>Indian Rupee (INR)</Text>
              </View>
            </View>
            <View className={`mr-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-amber-50 border-amber-200'} px-2.5 py-1 rounded-full border`}>
              <Text className={`${isDarkMode ? 'text-slate-400' : 'text-amber-700'} text-4xs font-bold uppercase`}>Locked</Text>
            </View>
          </View>
        </View>

        {/* Section: App Settings */}
        <View className={`${themeCardBg} border rounded-3xl p-2 shadow-sm mb-6`}>
          <Text className="text-primary font-bold text-sm px-4 pt-3 pb-1 uppercase tracking-wider">
            App Preferences
          </Text>


          <View className={`flex-row items-center justify-between p-4 border-b ${themeBorder}`}>
            <View className="flex-row items-center space-x-3">
              <View className={`w-10 h-10 rounded-2xl ${themeLightBg} items-center justify-center`}>
                <Bell size={20} color="#32484F" />
              </View>
              <View className="ml-3">
                <Text className={`${themeText} font-bold text-sm`}>Daily Logs Reminder</Text>
                <Text className={`${themeSubtext} text-xs`}>Remind me to update entries daily</Text>
              </View>
            </View>
            <Switch
              value={dailyReminder}
              onValueChange={handleToggleReminder}
              trackColor={{ false: "#e2e8f0", true: "#32484F" }}
              thumbColor={Platform.OS === "ios" ? undefined : "#ffffff"}
            />
          </View>

          <View className={`flex-row items-center justify-between p-4 border-b ${themeBorder}`}>
            <View className="flex-row items-center space-x-3">
              <View className={`w-10 h-10 rounded-2xl ${themeLightBg} items-center justify-center`}>
                <Sparkles size={20} color="#32484F" />
              </View>
              <View className="ml-3">
                <Text className={`${themeText} font-bold text-sm`}>SMS Automatic Sync</Text>
                <Text className={`${themeSubtext} text-xs`}>Notify when drafts are pending review</Text>
              </View>
            </View>
            <Switch
              value={smsSync}
              onValueChange={handleToggleSmsSync}
              trackColor={{ false: "#e2e8f0", true: "#32484F" }}
              thumbColor={Platform.OS === "ios" ? undefined : "#ffffff"}
            />
          </View>

          <TouchableOpacity 
            onPress={() => {
              setTempApiUrl(apiUrl || "");
              setApiUrlModalOpen(true);
            }}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center space-x-3">
              <View className={`w-10 h-10 rounded-2xl ${themeLightBg} items-center justify-center`}>
                <Globe size={18} color="#32484F" />
              </View>
              <View className="ml-3">
                <Text className={`${themeText} font-bold text-sm`}>Backend Server API URL</Text>
                <Text className={`${themeSubtext} text-xs`}>
                  {apiUrl || "Not configured (Using Localhost)"}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Section: Support & Security */}
        <View className={`${themeCardBg} border rounded-3xl p-2 shadow-sm mb-6`}>
          <Text className="text-primary font-bold text-sm px-4 pt-3 pb-1 uppercase tracking-wider">
            Security & Support
          </Text>

          <TouchableOpacity 
            onPress={() => {
              Alert.alert("Passcode Setup", "Local Security App-Lock PIN setup is currently automated under authentication profiles.");
            }}
            className={`flex-row items-center justify-between p-4 border-b ${themeBorder}`}
          >
            <View className="flex-row items-center space-x-3">
              <View className={`w-10 h-10 rounded-2xl ${themeLightBg} items-center justify-center`}>
                <Shield size={20} color="#32484F" />
              </View>
              <View className="ml-3">
                <Text className={`${themeText} font-bold text-sm`}>Security PIN & biometric</Text>
                <Text className={`${themeSubtext} text-xs`}>Setup local app-lock protection</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setSupportDrawerOpen(true)}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center space-x-3">
              <View className={`w-10 h-10 rounded-2xl ${themeLightBg} items-center justify-center`}>
                <HelpCircle size={20} color="#32484F" />
              </View>
              <View className="ml-3">
                <Text className={`${themeText} font-bold text-sm`}>Help & FAQs</Text>
                <Text className={`${themeSubtext} text-xs`}>Contact support team or view guidelines</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Section: Data Operations */}
        <View className={`${themeCardBg} border rounded-3xl p-2 shadow-sm mb-6`}>
          <Text className="text-primary font-bold text-sm px-4 pt-3 pb-1 uppercase tracking-wider">
            Data Control
          </Text>

          <TouchableOpacity 
            onPress={handleExportCSV}
            className={`flex-row items-center justify-between p-4 border-b ${themeBorder} active:bg-slate-50`}
          >
            <View className="flex-row items-center space-x-3">
              <View className={`w-10 h-10 rounded-2xl ${isDarkMode ? 'bg-sky-950' : 'bg-sky-50'} items-center justify-center`}>
                <Download size={20} color={isDarkMode ? "#38bdf8" : "#0284c7"} />
              </View>
              <View className="ml-3">
                <Text className={`${isDarkMode ? 'text-sky-400' : 'text-sky-900'} font-bold text-sm`}>Export Data to CSV</Text>
                <Text className={`${themeSubtext} text-xs`}>Download all recorded transactions</Text>
              </View>
            </View>
            <ChevronRight size={18} color={isDarkMode ? "#38bdf8" : "#0284c7"} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleResetData}
            className="flex-row items-center justify-between p-4 active:bg-red-50"
          >
            <View className="flex-row items-center space-x-3">
              <View className={`w-10 h-10 rounded-2xl ${isDarkMode ? 'bg-red-950' : 'bg-red-50'} items-center justify-center`}>
                <Trash2 size={20} color={isDarkMode ? "#f87171" : "#dc2626"} />
              </View>
              <View className="ml-3">
                <Text className="text-red-700 font-bold text-sm">Reset App Database</Text>
                <Text className={`${themeSubtext} text-xs`}>Permanently delete all tables data</Text>
              </View>
            </View>
            <ChevronRight size={18} color={isDarkMode ? "#f87171" : "#dc2626"} />
          </TouchableOpacity>
        </View>

        {/* Log out Button */}
        <TouchableOpacity 
          onPress={handleLogout}
          className={`border ${isDarkMode ? 'bg-red-950/20 border-red-900/50' : 'bg-red-50 border-red-200'} rounded-3xl p-4 flex-row items-center justify-center space-x-2 mb-12 active:bg-red-100`}
        >
          <LogOut size={20} color="#ef4444" />
          <Text className="text-red-600 font-bold text-base ml-2">Sign Out Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Drawer */}
      <Drawer
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        title="Edit Personal Information"
      >
        <View className="flex-col gap-5 mb-8">
          <Input 
            label="Full Name"
            value={profileName}
            onChangeText={setProfileName}
            placeholder="Enter your full name"
            autoCapitalize="words"
          />
          <Input 
            label="Mobile Number"
            value={profilePhone}
            onChangeText={setProfilePhone}
            placeholder="Enter mobile number"
            keyboardType="phone-pad"
          />
        </View>
        
        <Button
          variant="default"
          onPress={handleSaveProfile}
          loading={savingProfile}
          className="w-full bg-primary py-3.5"
        >
          Save Details
        </Button>
      </Drawer>

      {/* Edit Financial Preferences Drawer */}
      <Drawer
        open={financialDrawerOpen}
        onClose={() => setFinancialDrawerOpen(false)}
        title="Financial Settings"
      >
        <View className="flex-col gap-5 mb-8">
          <Input 
            label="Monthly Spending Budget (₹)"
            value={tempMonthlyBudget}
            onChangeText={setTempMonthlyBudget}
            placeholder="e.g. 50000"
            keyboardType="numeric"
          />
          <Input 
            label="Spending Alert Threshold (%)"
            value={tempAlertThreshold}
            onChangeText={setTempAlertThreshold}
            placeholder="e.g. 80"
            keyboardType="numeric"
          />
          <View className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex-row items-start gap-2">
            <Text className="text-amber-700 font-semibold text-sm">⚠️</Text>
            <Text className="text-amber-700 text-xs flex-1 leading-relaxed">
              When category expenses reach the threshold percentage of your monthly budget, alert indicators will turn amber/red across the dashboard.
            </Text>
          </View>
        </View>
        
        <Button
          variant="default"
          onPress={handleSaveFinancials}
          loading={savingFinancials}
          className="w-full bg-primary py-3.5"
        >
          Save Preferences
        </Button>
      </Drawer>

      {/* Help & Support Drawer */}
      <Drawer
        open={supportDrawerOpen}
        onClose={() => setSupportDrawerOpen(false)}
        title="Help & Support Guidelines"
      >
        <ScrollView className="max-h-[350px] mb-6 pr-1">
          <View className="flex-col gap-4">
            <View className="bg-lightBg border border-cardBorder p-4 rounded-2xl">
              <Text className="text-primary font-bold text-xs mb-1">How do I record transactions?</Text>
              <Text className="text-slate-600 text-2xs leading-relaxed">
                Head over to the Dashboard or Transactions tab, click the plus (+) button, enter details (amount, category, description), and click Save.
              </Text>
            </View>
            <View className="bg-lightBg border border-cardBorder p-4 rounded-2xl">
              <Text className="text-primary font-bold text-xs mb-1">What is SMS Automatic Sync?</Text>
              <Text className="text-slate-600 text-2xs leading-relaxed">
                When enabled, FinSight will scan and analyze text message drafts that contain transaction metadata, making it easy to log debit/credit card records.
              </Text>
            </View>
            <View className="bg-lightBg border border-cardBorder p-4 rounded-2xl">
              <Text className="text-primary font-bold text-xs mb-1">How do I change currency symbol?</Text>
              <Text className="text-slate-600 text-2xs leading-relaxed">
                FinSight is optimized for local Indian Rupee (₹) calculations to support precise tracking parameters.
              </Text>
            </View>
            <View className="bg-lightBg border border-cardBorder p-4 rounded-2xl">
              <Text className="text-primary font-bold text-xs mb-1">Contact Email Support</Text>
              <Text className="text-slate-600 text-2xs leading-relaxed">
                For complex queries or technical bugs, feel free to email our team directly at alaiatharva2004@gmail.com
              </Text>
            </View>
          </View>
        </ScrollView>
        <Button
          variant="secondary"
          onPress={() => setSupportDrawerOpen(false)}
          className="w-full py-3.5"
        >
          Close Drawer
        </Button>
      </Drawer>

      {/* Default Bank Selector Drawer */}
      <Drawer
        open={bankDrawerOpen}
        onClose={() => setBankDrawerOpen(false)}
        title="Select Default Bank"
      >
        <View className="flex-col gap-3 mb-6">
          <Text className={`${themeSubtext} text-xs mb-2 leading-relaxed`}>
            Choose a default bank account to pre-fill the transaction creation forms and to use as a fallback for SMS automatic sync.
          </Text>

          {/* Option: No Default (Fallback to first account) */}
          <TouchableOpacity
            onPress={() => {
              setDefaultBankAccountId(null);
              setBankDrawerOpen(false);
              showToast("Default bank reset to fallback.", "success");
            }}
            className={`flex-row items-center justify-between p-4 rounded-2xl border ${
              !defaultBankAccountId 
                ? (isDarkMode ? "bg-slate-800 border-primary" : "bg-slate-50 border-primary") 
                : (isDarkMode ? "border-slate-800" : "border-slate-100")
            }`}
          >
            <View>
              <Text className={`${themeText} font-bold text-sm`}>No default bank</Text>
              <Text className={`${themeSubtext} text-3xs uppercase mt-1`}>
                Fallback to the first available account
              </Text>
            </View>
            {!defaultBankAccountId && <Check size={18} color="#059669" />}
          </TouchableOpacity>

          {/* User's actual accounts */}
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              onPress={() => {
                setDefaultBankAccountId(acc.id);
                setBankDrawerOpen(false);
                showToast(`Default bank set to ${acc.name}.`, "success");
              }}
              className={`flex-row items-center justify-between p-4 rounded-2xl border ${
                defaultBankAccountId === acc.id
                  ? (isDarkMode ? "bg-slate-800 border-primary" : "bg-slate-50 border-primary")
                  : (isDarkMode ? "border-slate-800" : "border-slate-100")
              }`}
            >
              <View>
                <Text className={`${themeText} font-bold text-sm`}>{acc.name}</Text>
                <Text className={`${themeSubtext} text-3xs uppercase mt-1`}>
                  {acc.type} • ₹{acc.balance.toLocaleString("en-IN")}
                </Text>
              </View>
              {defaultBankAccountId === acc.id && <Check size={18} color="#059669" />}
            </TouchableOpacity>
          ))}

          {accounts.length === 0 && (
            <View className="p-4 items-center">
              <Text className={`${themeSubtext} text-xs italic`}>No linked bank accounts found.</Text>
            </View>
          )}
        </View>
        <Button
          variant="secondary"
          onPress={() => setBankDrawerOpen(false)}
          className="w-full py-3.5"
        >
          Close Drawer
        </Button>
      </Drawer>

      {/* Edit API URL Dialog */}
      <Dialog
        open={apiUrlModalOpen}
        onClose={() => setApiUrlModalOpen(false)}
        title="Backend Server API URL"
      >
        <View className="flex-col gap-4 text-left">
          <Input
            label="Server API URL"
            placeholder="e.g. http://192.168.1.100:3000/api"
            value={tempApiUrl}
            onChangeText={setTempApiUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button
            onPress={() => {
              setApiUrl(tempApiUrl.trim() || null);
              setApiUrlModalOpen(false);
              showToast("Server API URL updated successfully!", "success");
            }}
            className="bg-[#32484F]"
          >
            Save Changes
          </Button>
        </View>
      </Dialog>
    </View>
  );
}
