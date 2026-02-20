// IndexedDB wrapper for offline storage
const DB_NAME = 'ouangolo_offline_db';
const DB_VERSION = 1;

interface PendingTransaction {
  id: string;
  type: 'ticket' | 'sale' | 'reservation' | 'event' | 'cash_register';
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  data: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
  retryCount: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Pending transactions store
        if (!db.objectStoreNames.contains('pendingTransactions')) {
          const store = db.createObjectStore('pendingTransactions', { keyPath: 'id' });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Cache store for offline data
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('expiry', 'expiry', { unique: false });
        }
      };
    });
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add pending transaction
  async addPendingTransaction(
    type: PendingTransaction['type'],
    endpoint: string,
    method: PendingTransaction['method'],
    data: Record<string, unknown>
  ): Promise<string> {
    if (!this.db) await this.init();

    const transaction: PendingTransaction = {
      id: this.generateId(),
      type,
      endpoint,
      method,
      data,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pendingTransactions', 'readwrite');
      const store = tx.objectStore('pendingTransactions');

      const request = store.add(transaction);

      request.onsuccess = () => {
        console.log('Transaction saved offline:', transaction.id);
        resolve(transaction.id);
      };

      request.onerror = () => {
        console.error('Failed to save transaction offline');
        reject(request.error);
      };
    });
  }

  // Get all pending (unsynced) transactions
  async getPendingTransactions(): Promise<PendingTransaction[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pendingTransactions', 'readonly');
      const store = tx.objectStore('pendingTransactions');
      const index = store.index('synced');

      const request = index.getAll(IDBKeyRange.only(false));

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Mark transaction as synced
  async markAsSynced(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pendingTransactions', 'readwrite');
      const store = tx.objectStore('pendingTransactions');

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const transaction = getRequest.result;
        if (transaction) {
          transaction.synced = true;
          const updateRequest = store.put(transaction);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Increment retry count
  async incrementRetryCount(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pendingTransactions', 'readwrite');
      const store = tx.objectStore('pendingTransactions');

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const transaction = getRequest.result;
        if (transaction) {
          transaction.retryCount++;
          const updateRequest = store.put(transaction);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Delete synced transactions (cleanup)
  async cleanupSyncedTransactions(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pendingTransactions', 'readwrite');
      const store = tx.objectStore('pendingTransactions');
      const index = store.index('synced');

      const request = index.openCursor(IDBKeyRange.only(true));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Cache data for offline use
  async cacheData(key: string, data: unknown, ttlMinutes: number = 60): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');

      const cacheEntry = {
        key,
        data,
        expiry: Date.now() + ttlMinutes * 60 * 1000,
        timestamp: Date.now()
      };

      const request = store.put(cacheEntry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get cached data
  async getCachedData<T>(key: string): Promise<T | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');

      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.expiry > Date.now()) {
          resolve(result.data as T);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Get pending transaction count
  async getPendingCount(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pendingTransactions', 'readonly');
      const store = tx.objectStore('pendingTransactions');
      const index = store.index('synced');

      const request = index.count(IDBKeyRange.only(false));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();
export type { PendingTransaction };
