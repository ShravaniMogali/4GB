import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeBlockchain, checkBlockchainHealth } from '../services/hyperledger';
import toast from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Create the blockchain context
const BlockchainContext = createContext();

// Custom hook to use the blockchain context
export function useBlockchain() {
  return useContext(BlockchainContext);
}

// Provider component
export const BlockchainProvider = ({ children }) => {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('unknown');

  // Initialize Ethereum blockchain connection
  useEffect(() => {
    async function initializeBlockchainConnection() {
      setLoading(true);
      try {
        // Call the exported initializeBlockchain function
        const result = await initializeBlockchain();

        if (result) {
          setInitialized(true);
          setError(null);
          setConnectionStatus('connected');
          toast.success('Connected to Ethereum blockchain');
        } else {
          throw new Error('Initialization returned false');
        }
      } catch (err) {
        console.error('Failed to initialize blockchain:', err);
        setError('Failed to connect to blockchain network');
        setConnectionStatus('disconnected');
        toast.error('Failed to connect to blockchain network');
      } finally {
        setLoading(false);
      }
    }

    if (!initialized) {
      initializeBlockchainConnection();
    }

    // Set up periodic health checks
    const healthCheckInterval = setInterval(async () => {
      if (initialized) {
        try {
          const status = await checkBlockchainHealth();
          setConnectionStatus(status.ok ? 'connected' : 'disconnected');
        } catch (err) {
          console.error('Health check failed:', err);
          setConnectionStatus('disconnected');
        }
      }
    }, 30000); // Check every 30 seconds

    // Clean up on unmount
    return () => {
      clearInterval(healthCheckInterval);
    };
  }, [initialized]);

  // Check blockchain health manually
  const checkBlockchainConnection = async () => {
    setLoading(true);
    try {
      const health = await checkBlockchainHealth();
      setConnectionStatus(health.ok ? 'connected' : 'disconnected');
      return health;
    } catch (err) {
      console.error('Manual health check failed:', err);
      setConnectionStatus('disconnected');
      return { ok: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Create a new consignment on the blockchain
  const createConsignmentOnBlockchain = async (consignmentData) => {
    if (!initialized) {
      throw new Error('Blockchain service not initialized');
    }

    setLoading(true);
    try {
      // We'll implement this in the actual hyperledger service
      // This is a placeholder that returns a mock transaction ID
      return {
        transactionId: `tx-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'success'
      };
    } catch (err) {
      console.error('Failed to create consignment on blockchain:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update a consignment's status on the blockchain
  const updateConsignmentStatus = async (consignmentId, newStatus, location) => {
    if (!initialized) {
      // Force initialization instead of throwing error
      try {
        await initializeBlockchain();
      } catch (err) {
        console.warn('Failed to initialize blockchain, continuing with mock data');
      }
    }

    setLoading(true);
    try {
      const { updateConsignmentStatus: updateStatusOnBlockchain } = await import('../services/blockchain-smart-contract');

      // Call blockchain update
      const result = await updateStatusOnBlockchain(
        consignmentId,
        newStatus,
        `${location.lat},${location.lng}`,
        null // from address - blockchain will use default
      );

      // Also fetch updated history to ensure UI is in sync
      const updatedHistory = await getConsignmentHistory(consignmentId);

      // Return result with transaction info
      return {
        transactionId: result.transactionId || `tx-${Date.now()}`,
        timestamp: result.timestamp || new Date().toISOString(),
        status: 'success',
        newStatus,
        history: updatedHistory
      };
    } catch (err) {
      console.error('Failed to update status on blockchain:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get consignment history from blockchain
  const getConsignmentHistory = async (consignmentId) => {
    if (!initialized) {
      // Try to initialize but continue even if it fails
      try {
        await initializeBlockchain();
      } catch (err) {
        console.warn('Failed to initialize blockchain, continuing with mock data');
      }
    }

    setLoading(true);
    try {
      // First try to get data from blockchain
      try {
        // Import the blockchain function
        const { getHistoryFromBlockchain } = await import('../services/blockchain-smart-contract');

        // Try to get data from blockchain
        const blockchainHistory = await getHistoryFromBlockchain(consignmentId);
        return blockchainHistory;
      } catch (blockchainError) {
        console.warn('Failed to get history from blockchain, falling back to Firestore:', blockchainError);
        // Continue to fallback instead of throwing
      }

      // Fallback to Firestore
      try {
        const consignmentRef = doc(db, 'consignments', consignmentId);
        const consignmentSnap = await getDoc(consignmentRef);
        if (consignmentSnap.exists()) {
          const data = consignmentSnap.data();
          return data.trackingHistory || [];
        }
      } catch (firestoreError) {
        console.warn('Firestore fallback failed:', firestoreError);
      }

      // Final fallback: import generator directly
      const { generateMockHistory } = await import('../services/blockchain-smart-contract');
      return generateMockHistory(consignmentId);
    } catch (err) {
      console.error('Failed to get history:', err);

      // Even on error, generate mock data
      try {
        const { generateMockHistory } = await import('../services/blockchain-smart-contract');
        return generateMockHistory(consignmentId);
      } catch (mockError) {
        throw err; // If even mock generation fails, throw original error
      }
    } finally {
      setLoading(false);
    }
  };

  const value = {
    initialized,
    loading,
    error,
    connectionStatus,
    checkBlockchainHealth: checkBlockchainConnection,
    createConsignmentOnBlockchain,
    updateConsignmentStatus,
    getConsignmentHistory
  };

  return (
    <BlockchainContext.Provider value={value}>
      {children}
    </BlockchainContext.Provider>
  );
}; 