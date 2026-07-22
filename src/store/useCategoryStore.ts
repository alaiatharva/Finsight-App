import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Category, TransactionType } from "@/types";
import { MOCK_CATEGORIES } from "@/lib/mock-data";

interface CategoryStore {
  customCategories: Category[];
  addCategory: (name: string, type: TransactionType) => Category;
  hydrateCategories: () => void;
}

export const useCategoryStore = create<CategoryStore>()(
  persist(
    (set, get) => ({
      customCategories: [],
      addCategory: (name, type) => {
        const newCat: Category = {
          id: `cat-custom-${Date.now()}`,
          name: name.trim(),
          type,
          icon: "Tag", // Default Lucide tag icon
          color: "#32484F", // Primary theme color
        };

        // Add to store
        set((state) => ({
          customCategories: [...state.customCategories, newCat],
        }));

        // Append to in-memory MOCK_CATEGORIES globally
        if (!MOCK_CATEGORIES.some((c) => c.id === newCat.id)) {
          MOCK_CATEGORIES.push(newCat);
        }

        return newCat;
      },
      hydrateCategories: () => {
        const { customCategories } = get();
        customCategories.forEach((cat) => {
          if (!MOCK_CATEGORIES.some((c) => c.id === cat.id)) {
            MOCK_CATEGORIES.push(cat);
          }
        });
      },
    }),
    {
      name: "finsight-custom-categories",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrateCategories();
        }
      },
    }
  )
);
