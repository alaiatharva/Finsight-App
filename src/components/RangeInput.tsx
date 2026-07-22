import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Input } from "./ui/input";
import { FilterChip } from "./FilterChip";

interface RangeInputProps {
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}

const QUICK_AMOUT_CHIPS = [
  { label: "Below ₹100", min: null, max: 100 },
  { label: "₹100–₹500", min: 100, max: 500 },
  { label: "₹500–₹1,000", min: 500, max: 1000 },
  { label: "₹1,000–₹5,000", min: 1000, max: 5000 },
  { label: "Above ₹5,000", min: 5000, max: null },
];

export function RangeInput({ min, max, onChange }: RangeInputProps) {
  const handleQuickChipPress = (chipMin: number | null, chipMax: number | null) => {
    onChange(chipMin, chipMax);
  };

  const isChipActive = (chipMin: number | null, chipMax: number | null) => {
    return min === chipMin && max === chipMax;
  };

  return (
    <View style={{ width: "100%", flexDirection: "column", gap: 12 }}>
      {/* Min and Max Manual Inputs */}
      <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
        <View style={{ flex: 1 }}>
          <Input
            label="Min Amount (₹)"
            placeholder="Min"
            keyboardType="numeric"
            value={min !== null ? min.toString() : ""}
            onChangeText={(text) => {
              const val = text.trim() === "" ? null : parseFloat(text);
              onChange(isNaN(val as number) ? null : val, max);
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Max Amount (₹)"
            placeholder="Max"
            keyboardType="numeric"
            value={max !== null ? max.toString() : ""}
            onChangeText={(text) => {
              const val = text.trim() === "" ? null : parseFloat(text);
              onChange(min, isNaN(val as number) ? null : val);
            }}
          />
        </View>
      </View>

      {/* Quick Amount Chips */}
      <View style={{ flexDirection: "column", gap: 6, marginTop: 4 }}>
        <Text style={{ color: "#6E858B", fontSize: 11, fontWeight: "600", textTransform: "uppercase" }}>
          Quick Ranges
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {QUICK_AMOUT_CHIPS.map((chip, idx) => {
            const active = isChipActive(chip.min, chip.max);
            return (
              <FilterChip
                key={idx}
                label={chip.label}
                selected={active}
                onPress={() => handleQuickChipPress(chip.min, chip.max)}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}
