import { View, Text, TextInput, type KeyboardTypeOptions } from "react-native";
import React from "react";

export interface InputProps {
  label?: string;
  error?: string;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
}

export function Input({
  label,
  error,
  className = "",
  inputClassName = "",
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  editable = true,
}: InputProps) {
  return (
    <View className={`flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <Text className="text-slate-700 text-xs font-semibold">
          {label}
        </Text>
      )}
      <View
        className={`w-full flex-row items-center border rounded-xl bg-white px-3 py-2 ${
          error 
            ? "border-red-500" 
            : "border-slate-200"
        } ${!editable ? "opacity-50" : ""}`}
      >
        <TextInput
          className={`flex-1 text-slate-900 text-sm h-8 p-0 ${inputClassName}`}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
        />
      </View>
      {error && (
        <Text className="text-red-500 text-2xs font-medium mt-0.5">
          {error}
        </Text>
      )}
    </View>
  );
}
