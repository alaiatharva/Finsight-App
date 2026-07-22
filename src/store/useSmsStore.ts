import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ParsedSMS } from '../services/sms/smsParserService';

interface SmsDraft extends ParsedSMS {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
}

interface SmsStore {
  drafts: SmsDraft[];
  addDraft: (draft: Omit<SmsDraft, 'id' | 'status'>) => void;
  updateDraftStatus: (id: string, status: 'CONFIRMED' | 'REJECTED') => void;
  removeDraft: (id: string) => void;
  clearAll: () => void;
}

export const useSmsStore = create<SmsStore>()(
  persist(
    (set) => ({
      drafts: [],
      addDraft: (draft) => set((state) => ({
        drafts: [{ ...draft, id: Math.random().toString(36).substring(7), status: 'PENDING' }, ...state.drafts]
      })),
      updateDraftStatus: (id, status) => set((state) => ({
        drafts: state.drafts.map(d => d.id === id ? { ...d, status } : d)
      })),
      removeDraft: (id) => set((state) => ({
        drafts: state.drafts.filter(d => d.id !== id)
      })),
      clearAll: () => set({ drafts: [] }),
    }),
    {
      name: 'sms-draft-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
