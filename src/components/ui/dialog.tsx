import { Modal, View, Text, Pressable, type GestureResponderEvent, KeyboardAvoidingView, Platform } from "react-native";
import { X } from "lucide-react-native";
import React from "react";
import { Button } from "./button";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
}

export function Dialog({ open, onClose, title, children }: DialogProps) {
  const handleContentPress = (e: GestureResponderEvent) => {
    e.stopPropagation();
  };

  return (
    <Modal
      transparent
      visible={open}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Pressable 
          onPress={onClose}
          className="flex-1 bg-[#00000099] items-center justify-center p-4"
        >
          <Pressable 
            onPress={handleContentPress}
            className="w-full max-w-sm bg-white border border-[#e2e8f080] rounded-3xl overflow-hidden shadow"
          >
            {/* Header */}
            <View className="flex-row items-center justify-between p-5 border-b border-slate-100">
              {title ? (
                <Text className="text-slate-900 text-base font-bold tracking-tight">{title}</Text>
              ) : (
                <View />
              )}
              <Button variant="ghost" size="sm" onPress={onClose} className="p-1 rounded-full">
                <X size={18} className="text-slate-500" />
              </Button>
            </View>
            
            {/* Content */}
            <View className="p-5">
              {children}
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
