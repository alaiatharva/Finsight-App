import React from "react";
import { View, Text } from "react-native";
import { FilterChip } from "./FilterChip";

interface MultiSelectItem {
  id: string;
  label: string;
}

interface MultiSelectListProps {
  items: MultiSelectItem[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  allowAllOption?: boolean;
}

export function MultiSelectList({
  items,
  selectedValues,
  onChange,
  allowAllOption = false,
}: MultiSelectListProps) {
  const isSelected = (id: string) => {
    if (id === "all") return selectedValues.length === 0 || selectedValues.includes("All");
    return selectedValues.includes(id);
  };

  const handlePress = (id: string) => {
    if (id === "all") {
      onChange(allowAllOption ? ["All"] : []);
      return;
    }

    let nextSelected = [...selectedValues].filter((val) => val !== "All");

    if (nextSelected.includes(id)) {
      nextSelected = nextSelected.filter((val) => val !== id);
    } else {
      nextSelected.push(id);
    }

    onChange(nextSelected);
  };

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", width: "100%" }}>
      {allowAllOption && (
        <FilterChip
          label="All"
          selected={isSelected("all")}
          onPress={() => handlePress("all")}
        />
      )}
      {items.map((item) => (
        <FilterChip
          key={item.id}
          label={item.label}
          selected={isSelected(item.id)}
          onPress={() => handlePress(item.id)}
        />
      ))}
    </View>
  );
}
