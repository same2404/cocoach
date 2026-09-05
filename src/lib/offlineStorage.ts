import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

let quotaExceeded = false;

// Helper to determine if an error is a Firebase Firestore Quota error
export function isQuotaError(err: any): boolean {
  if (!err) return false;
  const errStr = String(err.message || err.code || err.details || err).toLowerCase();
  return (
    errStr.includes('quota') ||
    errStr.includes('resource_exhausted') ||
    errStr.includes('resource-exhausted') ||
    (err.code && typeof err.code === 'string' && err.code.toLowerCase().includes('resource-exhausted')) ||
    err.code === 8 ||
    err.code === '8'
  );
}

// Helper to mark quota as exceeded globally and in module state
export function markQuotaExceeded() {
  quotaExceeded = true;
  if (typeof window !== 'undefined') {
    (window as any).fca_firestore_quota_exceeded = true;
  }
}

// Helper to check if quota is currently exceeded
export function isQuotaExceededActive(): boolean {
  return quotaExceeded || (typeof window !== 'undefined' && !!(window as any).fca_firestore_quota_exceeded);
}

const DB_NAME = 'FCAuggenOfflineDB';
const DB_VERSION = 1;

export interface SyncOperation {
  id?: number;
  collectionName: string;
  idField: string;
  operation: 'SET' | 'DELETE';
  itemId: string;
  data?: any;
  timestamp: number;
}

// Global DB instance cache
let dbInstance: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;

export function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('collections')) {
          db.createObjectStore('collections', { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = (event: any) => {
        const db = event.target.result as IDBDatabase;
        dbInstance = db;
        initPromise = null;

        // Reset connection cache if database gets closed or version changes
        db.onversionchange = () => {
          db.close();
          if (dbInstance === db) {
            dbInstance = null;
          }
          initPromise = null;
        };

        db.onclose = () => {
          if (dbInstance === db) {
            dbInstance = null;
          }
          initPromise = null;
        };

        resolve(db);
      };

      request.onerror = (event: any) => {
        console.error('IndexedDB open error:', event.target.error);
        initPromise = null;
        reject(event.target.error);
      };
    } catch (err) {
      console.error('IndexedDB initialization error:', err);
      initPromise = null;
      reject(err);
    }
  });

  return initPromise;
}

// Low-level executor that runs a callback inside a transaction block
function executeWithDb<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest | Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      
      let requestOrPromise: any;
      try {
        requestOrPromise = callback(store);
      } catch (err) {
        reject(err);
        return;
      }

      if (requestOrPromise instanceof Promise) {
        requestOrPromise.then(resolve).catch(reject);
      } else {
        requestOrPromise.onsuccess = (event: any) => {
          resolve(event.target.result);
        };
        requestOrPromise.onerror = (event: any) => {
          reject(event.target.error);
        };
      }
    } catch (err) {
      reject(err);
    }
  });
}

// Safe wrapper to execute operations on IndexedDB with automatic retry if connection is closed/closing
async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest | Promise<T>
): Promise<T> {
  let db = await initDB();
  try {
    return await executeWithDb(db, storeName, mode, callback);
  } catch (err: any) {
    const errName = err?.name || '';
    const errMsg = String(err?.message || err).toLowerCase();

    // Check if the transaction failed because the database was closing or closed
    if (
      errName === 'InvalidStateError' ||
      errMsg.includes('closing') ||
      errMsg.includes('closed') ||
      errMsg.includes('connection is closing')
    ) {
      if (dbInstance === db) {
        console.warn('IndexedDB connection was closed or closing. Resetting connection and retrying...', err);
        dbInstance = null; // Invalidate cache
        initPromise = null; // Invalidate pending promise
      } else {
        console.warn('IndexedDB connection was closed or closing, but a new connection has already been set up. Retrying with new connection...', err);
      }
      db = await initDB(); // Force re-opening or getting the new connection
      return executeWithDb(db, storeName, mode, callback); // Retry execution once
    }
    throw err;
  }
}

// Retrieve cached collection
export async function getLocalCollection(collectionName: string): Promise<any[] | null> {
  try {
    const record: any = await withStore('collections', 'readonly', (store) => store.get(collectionName));
    if (record && Array.isArray(record.items)) {
      return record.items;
    }
    return null;
  } catch (err) {
    console.warn(`Failed to read collection "${collectionName}" from IndexedDB:`, err);
    return null;
  }
}

// Cache collection to IndexedDB
export async function saveLocalCollection(collectionName: string, items: any[]): Promise<void> {
  try {
    await withStore('collections', 'readwrite', (store) => {
      return store.put({
        name: collectionName,
        items,
        updatedAt: Date.now()
      });
    });
  } catch (err) {
    console.warn(`Failed to write collection "${collectionName}" to IndexedDB:`, err);
  }
}

// Queue modification when offline/quota block
export async function enqueueSyncOperation(
  collectionName: string,
  idField: string,
  operation: 'SET' | 'DELETE',
  itemId: string,
  data: any
): Promise<void> {
  try {
    // Clean data from system fields before queueing
    let cleanedData = data;
    if (data && typeof data === 'object') {
      const { [idField]: _, _dirty, ...rest } = data;
      cleanedData = rest;
    }

    const op: SyncOperation = {
      collectionName,
      idField,
      operation,
      itemId,
      data: cleanedData,
      timestamp: Date.now()
    };

    // Optimization: if there is already a SET or DELETE operation for this item in the queue, 
    // we can consolidate them to prevent redundant network calls during sync.
    const queue = await getSyncQueue();
    const existingIdx = queue.findIndex(
      (x) => x.collectionName === collectionName && x.itemId === itemId
    );

    if (existingIdx !== -1) {
      const existing = queue[existingIdx];
      if (operation === 'DELETE') {
        // If we are deleting, we remove any previous queue entries and just keep the delete
        await withStore('syncQueue', 'readwrite', (store) => store.delete(existing.id!));
        await withStore('syncQueue', 'readwrite', (store) => store.add(op));
      } else {
        // If we are writing a SET, we can overwrite the previous SET's data
        if (existing.operation === 'SET') {
          existing.data = { ...existing.data, ...cleanedData };
          existing.timestamp = Date.now();
          await withStore('syncQueue', 'readwrite', (store) => store.put(existing));
        } else {
          // If previous was a DELETE and now a SET, just queue the SET
          await withStore('syncQueue', 'readwrite', (store) => store.delete(existing.id!));
          await withStore('syncQueue', 'readwrite', (store) => store.add(op));
        }
      }
    } else {
      await withStore('syncQueue', 'readwrite', (store) => store.add(op));
    }

    console.log(`Enqueued sync operation for ${collectionName}/${itemId}: ${operation}`);
    
    // Dispatch custom event to notify background worker to try and run sync
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fca_sync_queue_added'));
    }
  } catch (err) {
    console.error('Failed to enqueue sync operation:', err);
  }
}

// Get all operations in queue
export async function getSyncQueue(): Promise<SyncOperation[]> {
  try {
    const queue: any[] = await withStore('syncQueue', 'readonly', (store) => store.getAll());
    return queue.sort((a, b) => a.id - b.id);
  } catch (err) {
    console.error('Failed to read sync queue:', err);
    return [];
  }
}

// Dequeue operation by ID
export async function dequeueSyncOperation(id: number): Promise<void> {
  try {
    await withStore('syncQueue', 'readwrite', (store) => store.delete(id));
  } catch (err) {
    console.error(`Failed to delete sync operation ${id}:`, err);
  }
}

// Clear sync queue entirely
export async function clearSyncQueue(): Promise<void> {
  try {
    await withStore('syncQueue', 'readwrite', (store) => store.clear());
  } catch (err) {
    console.error('Failed to clear sync queue:', err);
  }
}

// Background sync controller state
let isSyncing = false;

// Attempt to replay the sync queue onto Firestore
export async function processSyncQueue(firestoreInstance: any): Promise<boolean> {
  if (isSyncing) return false;
  if (!navigator.onLine) {
    console.log('Background sync skipped: Device is offline.');
    return false;
  }

  const queue = await getSyncQueue();
  if (queue.length === 0) {
    return true;
  }

  isSyncing = true;
  console.log(`Processing sync queue, found ${queue.length} pending operations...`);
  
  let successCount = 0;
  let quotaHit = false;

  for (const op of queue) {
    try {
      const docRef = doc(firestoreInstance, op.collectionName, op.itemId);
      if (op.operation === 'SET') {
        await setDoc(docRef, op.data, { merge: true });
      } else if (op.operation === 'DELETE') {
        await deleteDoc(docRef);
      }

      // Success! Remove from IndexedDB queue
      await dequeueSyncOperation(op.id!);
      successCount++;
    } catch (err: any) {
      console.warn(`Sync operation failed for ${op.collectionName}/${op.itemId}:`, err);
      
      if (isQuotaError(err)) {
        quotaHit = true;
        markQuotaExceeded();
        break; // Stop replaying the queue to prevent repetitive quota limit blocks
      }
      
      // If it's a non-quota error (e.g., permission denied or other structural errors), 
      // we log it but continue processing other items to prevent queue blockages,
      // or we can break depending on the error type. Let's keep it in the queue for safety 
      // but break to try later unless we're sure it's an unrecoverable request structure.
      break; 
    }
  }

  isSyncing = false;
  
  if (successCount > 0) {
    console.log(`Background sync: successfully replayed ${successCount} operations.`);
    
    // If we managed to successfully write to Firestore and didn't hit a quota error, 
    // we can clear the quotaExceeded flag globally!
    if (!quotaHit && isQuotaExceededActive()) {
      console.log('Successfully replayed operations. Clearing quota limitation flag.');
      if (typeof window !== 'undefined') {
        (window as any).fca_firestore_quota_exceeded = false;
        // Trigger UI event to notify the App component that quota has been reset
        window.dispatchEvent(new CustomEvent('fca_sync_error', { detail: { error: null } }));
      }
    }
  }

  return successCount === queue.length;
}

// Setup a periodic background synchronizer
export function setupBackgroundSync(firestoreInstance: any, intervalMs = 20000) {
  const triggerSync = () => {
    processSyncQueue(firestoreInstance).catch((e) => {
      console.warn('Error in background sync interval:', e);
    });
  };

  // Run on online event
  window.addEventListener('online', triggerSync);

  // Run when a new item is queued
  window.addEventListener('fca_sync_queue_added', () => {
    // Small delay to allow consecutive operations to cluster
    setTimeout(triggerSync, 1000);
  });

  // Run periodically
  const intervalId = setInterval(triggerSync, intervalMs);

  // Run initially
  setTimeout(triggerSync, 2000);

  return () => {
    window.removeEventListener('online', triggerSync);
    clearInterval(intervalId);
  };
}
