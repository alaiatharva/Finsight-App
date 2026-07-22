import { View, Text, Pressable } from "react-native";
import React from "react";

interface TabsProps {
  tabs: string[];
  activeTab: string;
  onTabPress: (tab: string) => void;
  className?: string;
}

export function SegmentedTabs({ tabs, activeTab, onTabPress, className = "" }: TabsProps) {
  return (
    <View 
      style={{
        flexDirection: "row",
        backgroundColor: "#f1f5f9", // bg-slate-100
        padding: 6, // p-1.5
        borderRadius: 16, // rounded-2xl
        width: "100%", // w-full
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => onTabPress(tab)}
            style={[
              {
                flex: 1,
                paddingVertical: 8, // py-2
                borderRadius: 12, // rounded-xl
                backgroundColor: isActive ? "#ffffff" : "transparent",
              },
              isActive ? {
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              } : {}
            ]}
          >
            <Text
              style={{
                textAlign: "center",
                fontSize: 12, // text-xs
                fontWeight: isActive ? "bold" : "600", // font-semibold / font-bold
                color: isActive ? "#059669" : "#64748b", // text-emerald-600 / text-slate-500
              }}
            >
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
