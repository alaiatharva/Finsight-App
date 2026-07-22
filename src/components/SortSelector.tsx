import React from "react";
import { View } from "react-native";
import { FilterChip } from "./FilterChip";
import { SortOption } from "@/types/filter";

interface SortSelectorProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Latest First", value: "latest" },
  { label: "Oldest First", value: "oldest" },
  { label: "Highest Amount", value: "highest" },
  { label: "Lowest Amount", value: "lowest" },
  { label: "A-Z", value: "a-z" },
  { label: "Z-A", value: "z-a" },
];

export function SortSelector({ value, onChange }: SortSelectorProps) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", width: "100%" }}>
      {SORT_OPTIONS.map((opt) => (
        <FilterChip
          key={opt.value}
          label={opt.label}
          selected={value === opt.value}
          onPress={() => onChange(opt.value)}
        />
      ))}
    </View>
  );
}
