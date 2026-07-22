import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSmsStore } from '../../store/useSmsStore';
import { SmsDraftCard } from '../../components/sms/SmsDraftCard';
import { useSmsSyncService } from '../../services/sms/smsSyncService';
import { readDeviceSmsInbox } from '../../services/sms/deviceSmsService';
import { Inbox, RefreshCw, Trash2 } from 'lucide-react-native';
import { TransactionRepository, AccountRepository } from '../../services/db-repositories';
import { useToast } from '../../components/ui/toast';
import { Transaction } from '../../types';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function SmsReviewScreen() {
  const { drafts, updateDraftStatus, clearAll } = useSmsStore();
  const { syncDrafts } = useSmsSyncService();
  const [isSyncing, setIsSyncing] = React.useState(false);
  const { showToast } = useToast();
  const { defaultBankAccountId } = useSettingsStore();

  const pendingDrafts = drafts.filter(d => d.status === 'PENDING');

  const handleClearHistory = () => {
    Alert.alert(
      "Clear Sync History",
      "Are you sure you want to clear all SMS transaction drafts (including confirmed and rejected history)? This allows you to re-scan your inbox and fetch all transactions again.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear History", 
          style: "destructive",
          onPress: () => {
            clearAll();
            showToast("SMS Sync history cleared successfully.", "success");
          }
        }
      ]
    );
  };

  const handleApprove = async (id: string) => {
    const draft = pendingDrafts.find((d) => d.id === id);
    if (!draft) return;

    try {
      const accounts = await AccountRepository.getAll();
      if (accounts.length === 0) {
        showToast("You must link a wallet account card first before approving transactions.", "error");
        return;
      }

      let chosenAccountId = (defaultBankAccountId && accounts.some((a) => a.id === defaultBankAccountId))
        ? defaultBankAccountId
        : accounts[0].id;
      const searchStr = `${draft.smsSender} ${draft.rawSmsText}`.toLowerCase();
      for (const acc of accounts) {
        const accName = acc.name.toLowerCase();
        if (searchStr.includes(accName) || accName.includes(draft.smsSender.toLowerCase())) {
          chosenAccountId = acc.id;
          break;
        }
      }

      let resolvedCategoryId = "cat-7"; // default to Shopping
      if (draft.parsedType === "income") {
        resolvedCategoryId = "cat-1";
      } else {
        const textToMatch = `${draft.parsedMerchant || ""} ${draft.rawSmsText}`.toLowerCase();
        if (
          textToMatch.includes("swiggy") ||
          textToMatch.includes("zomato") ||
          textToMatch.includes("starbucks") ||
          textToMatch.includes("coffee") ||
          textToMatch.includes("food") ||
          textToMatch.includes("restaurant") ||
          textToMatch.includes("pizza") ||
          textToMatch.includes("dining") ||
          textToMatch.includes("cafe")
        ) {
          resolvedCategoryId = "cat-2";
        } else if (
          textToMatch.includes("rent") ||
          textToMatch.includes("house") ||
          textToMatch.includes("lease") ||
          textToMatch.includes("apartment") ||
          textToMatch.includes("housing")
        ) {
          resolvedCategoryId = "cat-3";
        } else if (
          textToMatch.includes("power") ||
          textToMatch.includes("electricity") ||
          textToMatch.includes("water") ||
          textToMatch.includes("bill") ||
          textToMatch.includes("internet") ||
          textToMatch.includes("wifi") ||
          textToMatch.includes("phone") ||
          textToMatch.includes("utility") ||
          textToMatch.includes("recharge")
        ) {
          resolvedCategoryId = "cat-4";
        } else if (
          textToMatch.includes("uber") ||
          textToMatch.includes("ola") ||
          textToMatch.includes("taxi") ||
          textToMatch.includes("petrol") ||
          textToMatch.includes("fuel") ||
          textToMatch.includes("gas") ||
          textToMatch.includes("transport") ||
          textToMatch.includes("metro") ||
          textToMatch.includes("train")
        ) {
          resolvedCategoryId = "cat-5";
        } else if (
          textToMatch.includes("netflix") ||
          textToMatch.includes("spotify") ||
          textToMatch.includes("prime") ||
          textToMatch.includes("disney") ||
          textToMatch.includes("movie") ||
          textToMatch.includes("cinema") ||
          textToMatch.includes("concert") ||
          textToMatch.includes("show") ||
          textToMatch.includes("entertainment") ||
          textToMatch.includes("play") ||
          textToMatch.includes("game")
        ) {
          resolvedCategoryId = "cat-6";
        }
      }

      const newTrans: Transaction = {
        id: `t-${Math.random().toString(36).substring(2, 9)}`,
        amount: draft.parsedAmount || 0,
        date: draft.parsedDate ? new Date(draft.parsedDate).toISOString() : new Date().toISOString(),
        description: draft.parsedMerchant || draft.smsSender || "SMS Auto-tracked Payment",
        type: draft.parsedType === "income" ? "INCOME" : "EXPENSE",
        categoryId: resolvedCategoryId,
        accountId: chosenAccountId,
        isRecurring: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await TransactionRepository.create(newTrans);
      
      updateDraftStatus(id, 'CONFIRMED');
      showToast("SMS transaction logged successfully!", "success");
    } catch (err) {
      console.error("[DEBUG] Failed to log SMS transaction:", err);
      showToast("Failed to record SMS transaction.", "error");
    }
  };

  const handleReject = (id: string) => {
    updateDraftStatus(id, 'REJECTED');
    showToast("SMS import rejected.", "info");
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // 1. Scan the device's inbox for new transaction SMS
      const scanResult = await readDeviceSmsInbox();
      if (scanResult.success) {
        showToast(scanResult.message, scanResult.count > 0 ? "success" : "info");
      } else {
        showToast(scanResult.message, "info");
      }

      // 2. Sync approved SMS drafts to the cloud
      await syncDrafts();
    } catch (err) {
      console.error("[SMS] Sync/Scan error:", err);
      showToast("SMS Sync completed with warnings.", "info");
    } finally {
      setIsSyncing(false);
    }
  };

  if (pendingDrafts.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
        <View className="w-24 h-24 bg-blue-50 rounded-full items-center justify-center mb-6">
          <Inbox size={40} color="#3b82f6" />
        </View>
        <Text className="text-2xl font-bold text-gray-900 mb-2">All Caught Up!</Text>
        <Text className="text-center text-gray-500 mb-8">
          You have reviewed all your SMS transactions. New transactions will appear here automatically.
        </Text>
        <View className="flex-col w-full gap-3 max-w-[280px]">
          <TouchableOpacity 
            onPress={handleSync}
            className="bg-gray-900 py-4 rounded-xl flex-row items-center justify-center gap-2"
          >
            {isSyncing ? <ActivityIndicator color="#fff" /> : <RefreshCw size={20} color="#fff" />}
            <Text className="text-white font-bold text-lg">Sync to Cloud</Text>
          </TouchableOpacity>
          
          {drafts.length > 0 && (
            <TouchableOpacity 
              onPress={handleClearHistory}
              disabled={isSyncing}
              className="border border-red-200 py-3.5 rounded-xl flex-row items-center justify-center gap-2 active:bg-red-50"
            >
              <Trash2 size={16} color="#ef4444" />
              <Text className="text-red-500 font-bold text-sm">Clear Sync History</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="p-4 bg-white border-b border-gray-200 flex-row justify-between items-center">
        <View>
          <Text className="text-xl font-bold text-gray-900">Review Transactions</Text>
          <Text className="text-sm text-gray-500">{pendingDrafts.length} pending imports</Text>
        </View>
        <View className="flex-row items-center gap-2">
          {drafts.length > 0 && (
            <TouchableOpacity 
              onPress={handleClearHistory}
              disabled={isSyncing}
              className="p-2 bg-red-50 rounded-full"
            >
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={handleSync}
            disabled={isSyncing}
            className="p-2 bg-blue-50 rounded-full"
          >
            {isSyncing ? <ActivityIndicator color="#3b82f6" /> : <RefreshCw size={20} color="#3b82f6" />}
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1 px-4 pt-4">
        <FlashList
          data={pendingDrafts}
          renderItem={({ item }: { item: any }) => (
            <SmsDraftCard 
              draft={item} 
              onApprove={handleApprove} 
              onReject={handleReject} 
            />
          )}
          // @ts-ignore
          estimatedItemSize={150}
          keyExtractor={(item: any) => item.id}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}
