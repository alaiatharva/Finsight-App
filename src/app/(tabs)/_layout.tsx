import { Tabs, useRouter } from "expo-router";
import { View, Text, Pressable, useColorScheme } from "react-native";
import React, { useState, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  CreditCard, 
  PieChart, 
  Target, 
  Settings,
  Check,
  Home,
  LogOut,
  MessageSquare,
  Bot
} from "lucide-react-native";
import { AccountRepository, TransactionRepository, BudgetRepository, GoalRepository } from "@/services/db-repositories";
import { ChatMessage } from "@/types";
import { MOCK_CATEGORIES } from "@/lib/mock-data";
import { AnimatedScale } from "@/components/ui/animated-entry";
import { useAppAuth } from "@/components/auth-provider";
import { ChatSheet } from "@/components/ChatSheet";
import { parseSafeDate } from "@/lib/dateUtils";

// Contextual AI chatbot parser
const generateAIResponse = async (userText: string): Promise<string> => {
  const text = userText.toLowerCase().trim();
  
  try {
    const accounts = await AccountRepository.getAll();
    const transactions = await TransactionRepository.getAll();
    const budgets = await BudgetRepository.getAll();
    const goals = await GoalRepository.getAll();
    
    if (text.includes("net worth") || text.includes("balance") || text.includes("wallet") || text.includes("how much money")) {
      const total = accounts.reduce((sum, a) => sum + a.balance, 0);
      const breakdown = accounts
        .map((a) => `${a.name}: ₹${a.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        .join("\n• ");
      return `Your aggregate Net Worth is currently **₹${total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**.\n\nHere is the balance breakdown:\n• ${breakdown}`;
    }
    
    if (text.includes("spend") || text.includes("expense") || text.includes("transaction") || text.includes("spent")) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      const monthExpenses = transactions.filter((t) => {
        if (t.type !== "EXPENSE") return false;
        const tDate = parseSafeDate(t.date);
        return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
      });
      
      const totalSpent = monthExpenses.reduce((sum, t) => sum + t.amount, 0);
      
      if (totalSpent === 0) {
        return "You have not recorded any expenditures for the current calendar month yet!";
      }
      
      const topTrans = [...monthExpenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
      const topList = topTrans
        .map((t) => `${t.description} (₹${t.amount.toFixed(2)})`)
        .join("\n• ");
      
      return `This month, your combined expenses total **₹${totalSpent.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**.\n\nYour highest expenditures were:\n• ${topList}`;
    }
    
    if (text.includes("budget") || text.includes("limit") || text.includes("over budget")) {
      if (budgets.length === 0) {
        return "You haven't configured any category budgets yet! Head over to the Budgets tab to set up spending limits.";
      }
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      const lines = budgets.map((b) => {
        const cat = MOCK_CATEGORIES.find((c) => c.id === b.categoryId);
        const spent = transactions
          .filter((t) => t.categoryId === b.categoryId && t.type === "EXPENSE" && parseSafeDate(t.date).getFullYear() === currentYear && parseSafeDate(t.date).getMonth() === currentMonth)
          .reduce((sum, t) => sum + t.amount, 0);
        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        return `${cat?.name || "Limit"}: ₹${spent.toFixed(2)} / ₹${b.amount.toFixed(2)} (${pct.toFixed(0)}% consumed)`;
      }).join("\n• ");
      
      const breachedCount = budgets.filter((b) => {
        const spent = transactions
          .filter((t) => t.categoryId === b.categoryId && t.type === "EXPENSE" && parseSafeDate(t.date).getFullYear() === currentYear && parseSafeDate(t.date).getMonth() === currentMonth)
          .reduce((sum, t) => sum + t.amount, 0);
        return spent >= b.amount * 0.8;
      }).length;
      
      return `Here is your current monthly budget review:\n\n• ${lines}\n\n${
        breachedCount > 0 
          ? `⚠️ Warning: You have ${breachedCount} category limits exceeding the critical 80% threshold!` 
          : "✅ Excellent: All categories are well within budget limits."
      }`;
    }
    
    if (text.includes("save") || text.includes("savings") || text.includes("goal")) {
      if (goals.length === 0) {
        return "You have not set any savings goals yet! Start listing targets on the Goals tab screen.";
      }
      
      const lines = goals
        .map((g) => {
          const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
          return `${g.name}: ₹${g.currentAmount.toLocaleString("en-IN")} saved of ₹${g.targetAmount.toLocaleString("en-IN")} (${pct.toFixed(1)}% complete)`;
        })
        .join("\n• ");
      
      return `Here is your savings targets overview:\n\n• ${lines}`;
    }
  } catch (err) {
    console.error("Chatbot query error", err);
  }
  
  const adviceList = [
    "I'm here to help you manage your money. Try asking me:\n\n1. 'What is my net worth?'\n2. 'How much did I spend this month?'\n3. 'How are my budget limits looking?'\n4. 'Show my savings goals progress'",
    "Tip: You can reduce credit card balances by making incremental weekly deposits rather than waiting for the end of the statement cycle.",
    "Did you know? Setting up category budgets and keeping track of transaction tags cuts down impulsive spend habits by up to 20%!",
  ];
  
  return adviceList[Math.floor(Math.random() * adviceList.length)];
};

export default function TabLayout() {
  const router = useRouter();
  const { signOut } = useAppAuth();
  const insets = useSafeAreaInsets();

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      role: "assistant",
      content: "Hi! I'm your FinSight AI Assistant. I can analyze your balances, list top spending, check budgets, and track savings progress. What can I do for you today?",
      timestamp: new Date().toISOString(),
    }
  ]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    const text = messageText.trim();
    if (!text) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);

    // Simulate thinking delay, then generate AI response
    setTimeout(async () => {
      const responseText = await generateAIResponse(text);
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: responseText,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setTyping(false);
    }, 800);
  }, []);

  // Harmonic color palette matching our web application
  const activeColor = "#1B2D36"; // Primary Dark Slate Blue
  const inactiveColor = "#94A3B8"; // Muted Grey
  const tabBgColor = "#ffffff"; // White
  const borderBottomColor = "#DDE4E5"; // Light border

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: inactiveColor,
          headerShown: true,
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center", paddingRight: 20 }}>
              <Pressable 
                onPress={() => router.push("/welcome?from=home")}
                style={({ pressed }) => ({
                  padding: 4,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Home size={22} color="#1B2D36" />
              </Pressable>
            </View>
          ),
          headerStyle: {
            backgroundColor: tabBgColor,
            borderBottomWidth: 1,
            borderBottomColor: borderBottomColor,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTitleStyle: {
            fontWeight: "bold",
            fontSize: 18,
            color: "#1B2D36",
          },
          tabBarStyle: {
            backgroundColor: tabBgColor,
            borderTopWidth: 1,
            borderTopColor: borderBottomColor,
            height: 52 + Math.max(insets.bottom, 12),
            paddingBottom: Math.max(insets.bottom, 12),
            paddingTop: 10,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarLabel: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <LayoutDashboard size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: "Transactions",
            tabBarLabel: "Transactions",
            tabBarIcon: ({ color, size }) => (
              <ArrowLeftRight size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="sms"
          options={{
            title: "SMS Sync",
            tabBarLabel: "SMS Sync",
            tabBarIcon: ({ color, size }) => (
              <MessageSquare size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: "Reports",
            tabBarLabel: "Reports",
            tabBarIcon: ({ color, size }) => (
              <PieChart size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarLabel: "Settings",
            tabBarIcon: ({ color, size }) => (
              <Settings size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* Floating absolute AI Assistant Bubble */}
      <AnimatedScale delay={500} className="absolute bottom-24 right-5 z-50">
        <Pressable 
          onPress={() => setChatOpen(true)}
          className="h-14 w-14 rounded-full bg-primary active:bg-[#1B2D36e6] flex items-center justify-center shadow-lg shadow-[#1B2D364d] transition-all active:scale-95"
        >
          <Bot size={24} color="white" />
        </Pressable>
      </AnimatedScale>

      {/* AI Chat Assistant Sheet */}
      <ChatSheet
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={messages}
        typing={typing}
        onSendMessage={handleSendMessage}
      />
    </View>
  );
}
