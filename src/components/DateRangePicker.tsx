import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Input } from "./ui/input";
import { FilterChip } from "./FilterChip";

interface DateRangePickerProps {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
}

const DATE_OPTIONS = [
  { label: "Today", id: "today" },
  { label: "Yesterday", id: "yesterday" },
  { label: "Last 7 Days", id: "7d" },
  { label: "Last 30 Days", id: "30d" },
  { label: "This Month", id: "this_month" },
  { label: "Last Month", id: "last_month" },
  { label: "This Year", id: "this_year" },
  { label: "Custom Date Range", id: "custom" },
];

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [selectedOption, setSelectedOption] = React.useState<string>("all");

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const handleOptionPress = (optionId: string) => {
    setSelectedOption(optionId);
    
    if (optionId === "all") {
      onChange(null, null);
      return;
    }

    const today = new Date();
    today.setHours(12, 0, 0, 0); // avoid timezone issues

    if (optionId === "today") {
      const dateStr = formatDate(today);
      onChange(dateStr, dateStr);
    } else if (optionId === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const dateStr = formatDate(yesterday);
      onChange(dateStr, dateStr);
    } else if (optionId === "7d") {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      onChange(formatDate(start), formatDate(today));
    } else if (optionId === "30d") {
      const start = new Date(today);
      start.setDate(today.getDate() - 30);
      onChange(formatDate(start), formatDate(today));
    } else if (optionId === "this_month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0, 0);
      onChange(formatDate(start), formatDate(today));
    } else if (optionId === "last_month") {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1, 12, 0, 0, 0);
      const end = new Date(today.getFullYear(), today.getMonth(), 0, 12, 0, 0, 0);
      onChange(formatDate(start), formatDate(end));
    } else if (optionId === "this_year") {
      const start = new Date(today.getFullYear(), 0, 1, 12, 0, 0, 0);
      onChange(formatDate(start), formatDate(today));
    } else if (optionId === "custom") {
      // Leave dates untouched or initialize with current dates
      if (!from && !to) {
        onChange(formatDate(today), formatDate(today));
      }
    }
  };

  // Sync selectedOption state based on changes to from/to from outside (e.g. on Reset)
  React.useEffect(() => {
    if (!from && !to) {
      setSelectedOption("all");
    }
  }, [from, to]);

  const isOptionActive = (optionId: string) => {
    if (optionId === "all") return !from && !to;
    if (optionId === "custom") return selectedOption === "custom";

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayStr = formatDate(today);

    if (optionId === "today") {
      return from === todayStr && to === todayStr;
    }
    if (optionId === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = formatDate(yesterday);
      return from === yesterdayStr && to === yesterdayStr;
    }
    if (optionId === "7d") {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      return from === formatDate(start) && to === todayStr;
    }
    if (optionId === "30d") {
      const start = new Date(today);
      start.setDate(today.getDate() - 30);
      return from === formatDate(start) && to === todayStr;
    }
    if (optionId === "this_month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0, 0);
      return from === formatDate(start) && to === todayStr;
    }
    if (optionId === "last_month") {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1, 12, 0, 0, 0);
      const end = new Date(today.getFullYear(), today.getMonth(), 0, 12, 0, 0, 0);
      return from === formatDate(start) && to === formatDate(end);
    }
    if (optionId === "this_year") {
      const start = new Date(today.getFullYear(), 0, 1, 12, 0, 0, 0);
      return from === formatDate(start) && to === todayStr;
    }

    return false;
  };

  return (
    <View style={{ width: "100%", flexDirection: "column", gap: 12 }}>
      {/* Date Options Selection */}
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <FilterChip
          label="All Time"
          selected={isOptionActive("all")}
          onPress={() => handleOptionPress("all")}
        />
        {DATE_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.id}
            label={opt.label}
            selected={isOptionActive(opt.id)}
            onPress={() => handleOptionPress(opt.id)}
          />
        ))}
      </View>

      {/* Manual Inputs for Custom Date Range */}
      {(selectedOption === "custom" || (!isOptionActive("all") && !DATE_OPTIONS.some(o => isOptionActive(o.id) && o.id !== "custom"))) && (
        <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
          <View style={{ flex: 1 }}>
            <Input
              label="From Date"
              placeholder="YYYY-MM-DD"
              value={from || ""}
              onChangeText={(text) => onChange(text, to)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="To Date"
              placeholder="YYYY-MM-DD"
              value={to || ""}
              onChangeText={(text) => onChange(from, text)}
            />
          </View>
        </View>
      )}
    </View>
  );
}
