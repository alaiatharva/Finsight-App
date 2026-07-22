import { Pressable, Text, ActivityIndicator, View } from "react-native";
import React from "react";

export type ButtonVariant = "default" | "secondary" | "outline" | "destructive" | "ghost";
export type ButtonSize = "sm" | "default" | "lg";

export interface ButtonProps {
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  textClassName?: string;
  disabled?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}

export function Button({
  onPress,
  variant = "default",
  size = "default",
  className = "",
  textClassName = "",
  disabled = false,
  loading = false,
  children,
}: ButtonProps) {
  // Variant styling
  const variantStyles: Record<ButtonVariant, string> = {
    default: "bg-emerald-600 active:bg-emerald-700 border-transparent",
    secondary: "bg-slate-200 active:bg-slate-300 border-transparent",
    outline: "bg-transparent border-slate-300 hover:bg-slate-100",
    destructive: "bg-red-600 active:bg-red-700 border-transparent",
    ghost: "bg-transparent border-transparent active:bg-slate-100",
  };

  // Text variant styling
  const textVariantStyles: Record<ButtonVariant, string> = {
    default: "text-white font-bold",
    secondary: "text-slate-900 font-semibold",
    outline: "text-slate-700 font-semibold",
    destructive: "text-white font-bold",
    ghost: "text-slate-700 font-medium",
  };

  // Size styling
  const sizeStyles: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 rounded-lg text-xs",
    default: "px-4 py-2.5 rounded-xl text-sm",
    lg: "px-6 py-3.5 rounded-2xl text-base",
  };

  const isOutline = variant === "outline";
  const borderClass = isOutline ? "border" : "";

  return (
    <Pressable
      onPress={!disabled && !loading ? onPress : undefined}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center ${borderClass} ${variantStyles[variant]} ${sizeStyles[size]} ${
        disabled || loading ? "opacity-50" : ""
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "default" || variant === "destructive" ? "#ffffff" : "#10b981"}
        />
      ) : (
        <View className="flex-row items-center justify-center">
          {typeof children === "string" ? (
            <Text className={`${textVariantStyles[variant]} text-center ${textClassName}`}>
              {children}
            </Text>
          ) : (
            children
          )}
        </View>
      )}
    </Pressable>
  );
}
