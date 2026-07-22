import { Modal, View, Text, Pressable, ScrollView, type GestureResponderEvent, Platform, Keyboard } from "react-native";
import { X } from "lucide-react-native";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "./button";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  scrollable?: boolean;
}

export function Drawer({ open, onClose, title, children, scrollable = true }: DrawerProps) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardVisibleRef = useRef(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      keyboardVisibleRef.current = true;
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardVisibleRef.current = false;
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleContentPress = (e: GestureResponderEvent) => {
    e.stopPropagation();
  };

  const handleRequestClose = () => {
    if (keyboardVisibleRef.current) {
      Keyboard.dismiss();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      transparent
      visible={open}
      animationType="slide"
      onRequestClose={handleRequestClose}
      statusBarTranslucent={true}
    >
      <View 
        style={{ flex: 1, paddingBottom: keyboardHeight }}
        className="justify-end bg-[#00000080]"
      >
        <Pressable 
          className="absolute top-0 left-0 right-0 bottom-0" 
          onPress={onClose} 
        />
        <Pressable 
          onPress={handleContentPress}
          className="bg-white border-t border-[#e2e8f080] rounded-t-3xl max-h-[85%] pb-4 shadow z-10 w-full"
        >
          {/* Header Handle Bar */}
          <View className="items-center py-3">
            <View className="w-12 h-1.5 rounded-full bg-slate-300" />
          </View>

          {/* Drawer Header */}
          <View className="flex-row items-center justify-between px-5 pb-4 border-b border-slate-100">
            {title ? (
              <Text className="text-slate-900 text-lg font-bold tracking-tight">{title}</Text>
            ) : (
              <View />
            )}
            <Button variant="ghost" size="sm" onPress={onClose} className="p-1 rounded-full bg-slate-100">
              <X size={18} className="text-slate-500" />
            </Button>
          </View>
          
          {/* Drawer Content */}
          {scrollable ? (
            <ScrollView 
              className="px-5 pt-4"
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                {children}
              </Pressable>
            </ScrollView>
          ) : (
            <Pressable onPress={(e) => e.stopPropagation()} className="px-5 pt-4 pb-6 shrink">
              {children}
            </Pressable>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}
