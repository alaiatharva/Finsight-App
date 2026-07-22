import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsStore {
  isDarkMode: boolean;
  dailyReminder: boolean;
  smsSync: boolean;
  defaultBankAccountId: string | null;
  apiUrl: string | null;
  setDarkMode: (val: boolean) => void;
  setDailyReminder: (val: boolean) => void;
  setSmsSync: (val: boolean) => void;
  setDefaultBankAccountId: (val: string | null) => void;
  setApiUrl: (val: string | null) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      isDarkMode: false,
      dailyReminder: false,
      smsSync: false,
      defaultBankAccountId: null,
      apiUrl: null,
      setDarkMode: (val) => set({ isDarkMode: val }),
      setDailyReminder: (val) => set({ dailyReminder: val }),
      setSmsSync: (val) => set({ smsSync: val }),
      setDefaultBankAccountId: (val) => set({ defaultBankAccountId: val }),
      setApiUrl: (val) => set({ apiUrl: val }),
    }),
    {
      name: 'finsight-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
