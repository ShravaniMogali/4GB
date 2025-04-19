import React, { createContext, useContext, useState, useEffect } from 'react';
import hyperledgerService from '../services/hyperledger';
import toast from 'react-hot-toast';

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

  // Initialize Hyperledger Fabric connection
  useEffect(() => {
    async function initializeBlockchain() {
      setLoading(true);
      try {
        await hyperledgerService.initialize();
        setInitialized(true);
        setError(null);
        setConnectionStatus('connected');
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
      initializeBlockchain();
    }

    // Set up periodic health checks
    const healthCheckInterval = setInterval(async () => {
      if (initialized) {
        try {
          const status = await hyperledgerService.checkHealth();
          setConnectionStatus(status.ok ? 'connected' : 'disconnected');
        } catch (err) {
          console.error('Health check failed:', err);
          setConnectionStatus('disconnected');
        }
      }
    }, 30000); // Check every 30 seconds

    // Disconnect when component unmounts
    return () => {
      clearInterval(healthCheckInterval);
      if (initialized) {
        hyperledgerService.disconnect();
      }
    };
  }, [initialized]);

  // Check blockchain health
  const checkBlockchainHealth = async () => {
    try {
      if (!initialized) {
        throw new Error('Blockchain service not initialized');
      }
      const status = await hyperledgerService.checkHealth();
      setConnectionStatus(status.ok ? 'connected' : 'disconnected');
      return { status: status.ok ? 'ok' : 'error' };
    } catch (err) {
      console.error('Health check failed:', err);
      setConnectionStatus('disconnected');
      return { status: 'error' };
    }
  };

  // Create consignment on blockchain
  const createConsignmentOnBlockchain = async (consignmentData) => {
    if (!initialized) {
      throw new Error('Blockchain service not initialized');
    }

    setLoading(true);
    try {
      const result = await hyperledgerService.createConsignment(consignmentData);
      return result;
    } catch (err) {
      console.error('Blockchain transaction failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update consignment status on blockchain
  const updateConsignmentStatus = async (consignmentId, status, location) => {
    if (!initialized) {
      throw new Error('Blockchain service not initialized');
    }

    setLoading(true);
    try {
      const result = await hyperledgerService.updateConsignmentStatus(
        consignmentId,
        status,
        location
      );
      return result;
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
      throw new Error('Blockchain service not initialized');
    }

    setLoading(true);
    try {
      const result = await hyperledgerService.getConsignmentHistory(consignmentId);
      return result;
    } catch (err) {
      console.error('Failed to get history from blockchain:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    initialized,
    loading,
    error,
    connectionStatus,
    checkBlockchainHealth,
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