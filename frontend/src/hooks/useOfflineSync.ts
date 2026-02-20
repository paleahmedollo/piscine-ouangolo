import { useState, useEffect, useCallback } from 'react';
import { syncService, SyncStatus } from '../services/syncService';
import { useOnlineStatus } from './useOnlineStatus';

interface UseOfflineSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncStatus: SyncStatus | null;
  syncNow: () => Promise<void>;
}

export const useOfflineSync = (): UseOfflineSyncReturn => {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  // Initialize sync service
  useEffect(() => {
    syncService.init().catch(console.error);

    // Subscribe to sync status changes
    const unsubscribe = syncService.onSyncStatusChange((status) => {
      setIsSyncing(status.isSyncing);
      setSyncStatus(status);
    });

    // Update pending count periodically
    const updatePendingCount = async () => {
      const count = await syncService.getPendingCount();
      setPendingCount(count);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 10000); // Every 10 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Update pending count when online status changes
  useEffect(() => {
    const updateCount = async () => {
      const count = await syncService.getPendingCount();
      setPendingCount(count);
    };
    updateCount();
  }, [isOnline]);

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    if (isOnline && !isSyncing) {
      await syncService.syncPendingTransactions();
      const count = await syncService.getPendingCount();
      setPendingCount(count);
    }
  }, [isOnline, isSyncing]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncStatus,
    syncNow
  };
};

export default useOfflineSync;
