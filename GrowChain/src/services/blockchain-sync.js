/**
 * Blockchain Sync Service - DEPRECATED
 * 
 * This file is kept for backward compatibility but its functionality has been removed
 * to reduce costs associated with continuous blockchain synchronization.
 */

// Placeholder constants maintained for backward compatibility
export const SYNC_START_EVENT = 'blockchain:sync:start';
export const SYNC_COMPLETE_EVENT = 'blockchain:sync:complete';

// Placeholder functions that do nothing
export function startBlockchainSyncService() {
  console.warn('Blockchain sync service has been disabled to reduce costs');
  return Promise.resolve(false);
}

export function stopBlockchainSyncService() {
  return Promise.resolve(true);
}

export function getLastSyncTime() {
  return null;
}

export function manualSync() {
  console.warn('Blockchain sync service has been disabled to reduce costs');
  return Promise.resolve(false);
} 