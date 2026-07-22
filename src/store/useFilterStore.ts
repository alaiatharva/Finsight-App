import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FilterState, INITIAL_FILTER_STATE } from "@/types/filter";

interface FilterStore {
  filters: FilterState;
  setFilters: (filters: Partial<FilterState> | ((prev: FilterState) => FilterState)) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterStore>()(
  persist(
    (set) => ({
      filters: { ...INITIAL_FILTER_STATE },
      setFilters: (update) => set((state) => {
        const nextFilters = typeof update === "function" ? update(state.filters) : { ...state.filters, ...update };
        return { filters: nextFilters };
      }),
      resetFilters: () => set({ filters: { ...INITIAL_FILTER_STATE } }),
    }),
    {
      name: "finsight-transaction-filters",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
