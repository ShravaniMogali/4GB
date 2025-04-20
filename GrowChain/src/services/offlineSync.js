import { openDB } from 'idb';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

const DB_NAME = 'agriLedgerOfflineDB';
const DB_VERSION = 1;
const SYNC_QUEUE_STORE = 'syncQueue';
const CONSIGNMENTS_STORE = 'consignments';

/**
 * Initialize the IndexedDB database
 */
async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create a store for the sync queue
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }
      // Create a store for offline consignment data
      if (!db.objectStoreNames.contains(CONSIGNMENTS_STORE)) {
        db.createObjectStore(CONSIGNMENTS_STORE, { keyPath: 'id' });
      }
    },
  });
}

/**
 * Add an update operation to the sync queue
 * @param {string} consignmentId - The ID of the consignment to update
 * @param {Object} updateData - The data to update
 */
export async function queueStatusUpdate(consignmentId, updateData) {
  const db = await initDB();
  await db.add(SYNC_QUEUE_STORE, {
    operation: 'update',
    consignmentId,
    updateData,
    timestamp: new Date().toISOString(),
    retryCount: 0
  });
}

/**
 * Store consignment data for offline access
 * @param {Object} consignment - The consignment data to store
 */
export async function storeConsignmentOffline(consignment) {
  const db = await initDB();
  await db.put(CONSIGNMENTS_STORE, consignment);
}

/**
 * Get stored offline consignment data
 * @param {string} consignmentId - The ID of the consignment to retrieve
 */
export async function getOfflineConsignment(consignmentId) {
  const db = await initDB();
  return await db.get(CONSIGNMENTS_STORE, consignmentId);
}

/**
 * Process the sync queue when online
 */
export async function processSyncQueue() {
  const db = await initDB();
  const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
  const store = tx.objectStore(SYNC_QUEUE_STORE);
  const queue = await store.getAll();

  for (const item of queue) {
    try {
      if (item.operation === 'update') {
        await updateDoc(doc(db, 'consignments', item.consignmentId), item.updateData);
        await store.delete(item.id);
      }
    } catch (error) {
      console.error('Error processing sync queue item:', error);
      // Update retry count and timestamp
      item.retryCount += 1;
      item.lastRetry = new Date().toISOString();
      if (item.retryCount < 5) { // Max 5 retry attempts
        await store.put(item);
      } else {
        await store.delete(item.id);
        console.error('Max retry attempts reached for sync item:', item);
      }
    }
  }
}

/**
 * Listen for online/offline status changes
 */
export function initOfflineSync() {
  window.addEventListener('online', async () => {
    console.log('Back online - processing sync queue...');
    await processSyncQueue();
  });

  window.addEventListener('offline', () => {
    console.log('Gone offline - updates will be queued');
  });
}

// Initialize offline sync when the module is imported
initOfflineSync(); 