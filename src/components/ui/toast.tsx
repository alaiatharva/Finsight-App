import React, { createContext, useContext, useState, useEffect } from "react";
import { View, Text, Modal } from "react-native";
import { Info, CheckCircle, AlertCircle } from "lucide-react-native";

export type ToastType = "info" | "success" | "error";

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("info");

  const showToast = (msg: string, t: ToastType = "info") => {
    setMessage(msg);
    setType(t);
    setVisible(true);
  };

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Toast icons
  const typeIcons: Record<ToastType, React.ReactNode> = {
    info: <Info size={16} color="#3b82f6" />,
    success: <CheckCircle size={16} color="#10b981" />,
    error: <AlertCircle size={16} color="#ef4444" />,
  };

  // Toast theme backgrounds
  const typeBgs: Record<ToastType, string> = {
    info: "border-[#3b82f633] bg-blue-50",
    success: "border-[#10b98133] bg-emerald-50",
    error: "border-[#ef444433] bg-red-50",
  };

  // Toast theme texts
  const typeTexts: Record<ToastType, string> = {
    info: "text-blue-700",
    success: "text-emerald-700",
    error: "text-red-700",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <View className="absolute top-0 left-0 right-0 bottom-0 justify-end items-center pb-24 px-4 pointer-events-none z-50" pointerEvents="none">
          <View
            className={`flex-row items-center space-x-2 px-4 py-3 rounded-2xl border ${typeBgs[type]} shadow-lg`}
          >
            {typeIcons[type]}
            <Text className={`text-sm font-semibold ${typeTexts[type]}`}>{message}</Text>
          </View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
