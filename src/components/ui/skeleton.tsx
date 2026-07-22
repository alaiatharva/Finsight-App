import { View } from "react-native";
import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <View className={`bg-slate-200 rounded-xl animate-pulse ${className}`} />
  );
}
