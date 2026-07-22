import React from "react";
import { View, Text } from "react-native";

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
}

export function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <View style={{ marginBottom: 20, width: "100%" }}>
      <Text
        style={{
          color: "#32484F",
          fontSize: 14,
          fontWeight: "700",
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {title}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {children}
      </View>
    </View>
  );
}
