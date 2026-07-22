import { View, Text } from "react-native";
import React from "react";

export type BadgeVariant = "default" | "success" | "warning" | "destructive" | "info";

export interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: string;
}

export function Badge({ variant = "default", className = "", children }: BadgeProps) {
  const containerStyles: Record<BadgeVariant, string> = {
    default: "bg-slate-100 border-transparent",
    success: "bg-[#10b9811a] border-transparent",
    warning: "bg-[#f59e0b1a] border-transparent",
    destructive: "bg-[#ef44441a] border-transparent",
    info: "bg-[#3b82f61a] border-transparent",
  };

  const textStyles: Record<BadgeVariant, string> = {
    default: "text-slate-700",
    success: "text-emerald-700",
    warning: "text-amber-700",
    destructive: "text-red-700",
    info: "text-blue-700",
  };

  return (
    <View
      className={`px-2.5 py-0.5 rounded-full border self-start ${containerStyles[variant]} ${className}`}
    >
      <Text className={`text-2xs font-semibold uppercase tracking-wider text-center ${textStyles[variant]}`}>{children}</Text>
    </View>
  );
}
