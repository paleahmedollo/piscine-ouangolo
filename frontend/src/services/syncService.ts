import api from './api';
import { offlineStorage, PendingTransaction } from './offlineStorage';

class SyncService {
  private isSyncing = false;
  private syncListeners: Array<(status: SyncStatus) => void> = [];

  async init(): Promise<void> {
    await offlineStorage.init();

    // Listen for online status
    window.addEventListener('online', () => {
      console.log('Back online - starting sync');
      this.syncPendingTransactions();
    });

    // Initial sync if online
    if (navigator.onLine) {
      this.syncPendingTransactions();
    }
  }

  // Subscribe to sync status updates
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  private notifySyncStatus(status: SyncStatus): void {
    this.syncListeners.forEach(callback => callback(status));
  }

  // Sync all pending transactions
  async syncPendingTransactions(): Promise<SyncResult> {
    if (this.isSyncing || !navigator.onLine) {
      return { success: false, synced: 0, failed: 0, pending: 0 };
    }

    this.isSyncing = true;
    this.notifySyncStatus({ isSyncing: true, message: 'Synchronisation en cours...' });

    const result: SyncResult = { success: true, synced: 0, failed: 0, pending: 0 };

    try {
      const pendingTransactions = await offlineStorage.getPendingTransactions();
      result.pending = pendingTransactions.length;

      for (const transaction of pendingTransactions) {
        try {
          await this.syncTransaction(transaction);
          await offlineStorage.markAsSynced(transaction.id);
          result.synced++;
        } catch (error) {
          console.error('Failed to sync transaction:', transaction.id, error);
          await offlineStorage.incrementRetryCount(transaction.id);
          result.failed++;

          // Remove transactions that failed too many times
          if (transaction.retryCount >= 5) {
            console.warn('Transaction exceeded retry limit:', transaction.id);
          }
        }
      }

      // Cleanup synced transactions
      await offlineStorage.cleanupSyncedTransactions();

      this.notifySyncStatus({
        isSyncing: false,
        message: result.failed > 0
          ? `Synchronisation partielle: ${result.synced} réussies, ${result.failed} échouées`
          : `Synchronisation terminée: ${result.synced} transactions`
      });

    } catch (error) {
      console.error('Sync error:', error);
      result.success = false;
      this.notifySyncStatus({
        isSyncing: false,
        message: 'Erreur de synchronisation'
      });
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  // Sync single transaction
  private async syncTransaction(transaction: PendingTransaction): Promise<void> {
    const { endpoint, method, data } = transaction;

    switch (method) {
      case 'POST':
        await api.post(endpoint, data);
        break;
      case 'PUT':
        await api.put(endpoint, data);
        break;
      case 'DELETE':
        await api.delete(endpoint);
        break;
    }
  }

  // Save transaction for offline sync
  async saveOfflineTransaction(
    type: PendingTransaction['type'],
    endpoint: string,
    method: PendingTransaction['method'],
    data: Record<string, unknown>
  ): Promise<string> {
    return offlineStorage.addPendingTransaction(type, endpoint, method, data);
  }

  // Get pending count
  async getPendingCount(): Promise<number> {
    return offlineStorage.getPendingCount();
  }

  // Check if we're online and can sync
  canSync(): boolean {
    return navigator.onLine && !this.isSyncing;
  }
}

interface SyncStatus {
  isSyncing: boolean;
  message: string;
}

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  pending: number;
}

export const syncService = new SyncService();
export type { SyncStatus, SyncResult };
