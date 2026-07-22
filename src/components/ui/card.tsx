import { View, Text } from "react-native";
import React from "react";

export interface CardProps {
  className?: string;
  children?: React.ReactNode;
}

export function Card({ className = "", children }: CardProps) {
  return (
    <View className={`bg-white border border-[#e2e8f080] rounded-2xl shadow-xs ${className}`}>
      {children}
    </View>
  );
}

export function CardHeader({ className = "", children }: CardProps) {
  return (
    <View className={`p-4 border-b border-slate-100 flex-col gap-1 ${className}`}>
      {children}
    </View>
  );
}

export function CardTitle({ className = "", children }: CardProps) {
  return (
    <Text className={`text-slate-900 text-base font-bold tracking-tight ${className}`}>
      {children}
    </Text>
  );
}

export function CardDescription({ className = "", children }: CardProps) {
  return (
    <Text className={`text-slate-500 text-xs ${className}`}>
      {children}
    </Text>
  );
}

export function CardContent({ className = "", children }: CardProps) {
  return (
    <View className={`p-4 ${className}`}>
      {children}
    </View>
  );
}

export function CardFooter({ className = "", children }: CardProps) {
  return (
    <View className={`p-4 border-t border-slate-100 flex-row items-center justify-end ${className}`}>
      {children}
    </View>
  );
}
