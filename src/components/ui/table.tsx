import { View, Text, Pressable } from "react-native";
import React from "react";

export interface TableProps {
  className?: string;
  children?: React.ReactNode;
}

export function Table({ className = "", children }: TableProps) {
  return (
    <View className={`w-full bg-white border border-[#e2e8f080] rounded-2xl overflow-hidden ${className}`}>
      {children}
    </View>
  );
}

export function TableHeader({ className = "", children }: TableProps) {
  return (
    <View className={`flex-row bg-slate-50 border-b border-[#e2e8f080] px-4 py-3 ${className}`}>
      {children}
    </View>
  );
}

export interface TableRowProps extends TableProps {
  onPress?: () => void;
}

export function TableRow({ className = "", children, onPress }: TableRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center border-b border-slate-100 px-4 py-3.5 ${className}`}
    >
      {children}
    </Pressable>
  );
}

export interface TableCellProps extends TableProps {
  flex?: number;
  isHeader?: boolean;
}

export function TableCell({ className = "", children, flex = 1, isHeader = false }: TableCellProps) {
  return (
    <View style={{ flex }} className={`justify-center pr-2 ${className}`}>
      {typeof children === "string" ? (
        <Text
          className={`${
            isHeader
              ? "text-slate-500 text-xs font-semibold uppercase tracking-wider"
              : "text-slate-800 text-sm font-medium"
          }`}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
