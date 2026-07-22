import { useSmsStore } from '../../store/useSmsStore';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-expo';
import { resolveApiBaseUrl } from '../apiResolver';

export const useSmsSyncService = () => {
  const { drafts, updateDraftStatus } = useSmsStore();
  const { getToken } = useAuth();

  const syncDrafts = async () => {
    const pendingDrafts = drafts.filter((d: any) => d.status === 'CONFIRMED' || d.parseConfidence === 'HIGH');
    
    if (pendingDrafts.length === 0) return;

    try {
      const API_BASE_URL = resolveApiBaseUrl();

      const token = await getToken();
      if (!token) throw new Error("No auth token");

      const response = await axios.post(`${API_BASE_URL}/transactions/batch-import`, {
        smsDrafts: pendingDrafts
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        // Mark as synced or remove from local queue
        pendingDrafts.forEach((draft: any) => {
           updateDraftStatus(draft.id, 'CONFIRMED');
        });
      }
    } catch (error) {
      console.error("Failed to sync SMS drafts", error);
    }
  };

  return { syncDrafts };
};

