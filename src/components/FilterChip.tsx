import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { X } from "lucide-react-native";

interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}

export function FilterChip({ label, selected = false, onPress, onRemove }: FilterChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: selected ? "#32484F" : "white",
        borderWidth: 1,
        borderColor: selected ? "#32484F" : "#DDE4E5",
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 10, // Generates a comfortable touch target (min 40-44px total height)
        marginRight: 8,
        marginBottom: 8,
        minHeight: 44, // Strict accessibility guideline target
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label} filter chip`}
    >
      <Text
        style={{
          color: selected ? "white" : "#32484F",
          fontSize: 12,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      {onRemove && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            marginLeft: 6,
            padding: 2,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel={`Remove ${label} filter`}
        >
          <X size={12} color={selected ? "white" : "#6E858B"} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
