/**
 * Ethereum Service for Farm-to-Table Application
 * 
 * This service integrates with the Ethereum blockchain network
 * for tracking farm-to-table supply chain data.
 */

import { 
  ensureBlockchainSetup, 
  getContractAddress, 
  getDeploymentTimestamp 
} from './blockchain-setup';
import { 
  createConsignment as createConsignmentOnBlockchain,
  updateConsignmentStatus as updateStatusOnBlockchain,
  getConsignment as getConsignmentFromBlockchain,
  getConsignmentHistory as getHistoryFromBlockchain
} from './blockchain-smart-contract';
import { getAccounts, getWeb3, isBlockchainConnected } from './blockchain-init';

// Development/production switch
const DEV_MODE = process.env.NODE_ENV !== 'production';

/**
 * Main Ethereum Service class
 */
class EthereumService {
  constructor() {
    this.initialized = false;
    this.accounts = [];
    this.contractAddress = null;
    this.deploymentTimestamp = null;
  }

  async initialize() {
    if (this.initialized) return true;
    
    try {
      console.log('Initializing Ethereum blockchain service...');
      
      // Set up the blockchain and smart contract
      const setupSuccess = await ensureBlockchainSetup();
      if (!setupSuccess) {
        throw new Error('Failed to set up blockchain connection');
      }
      
      // Get contract information
      this.contractAddress = getContractAddress();
      this.deploymentTimestamp = getDeploymentTimestamp();
      
      // Get accounts
      this.accounts = await getAccounts();
      
      console.log(`Initialized blockchain service with contract at ${this.contractAddress}`);
      console.log(`Available accounts: ${this.accounts.length}`);
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  async checkHealth() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const isConnected = isBlockchainConnected();
      const hasContract = !!this.contractAddress;
      const hasAccounts = this.accounts.length > 0;
      
      const ok = isConnected && hasContract && hasAccounts;
      
      return {
        ok,
        contractAddress: this.contractAddress,
        accountCount: this.accounts.length
      };
    } catch (error) {
      console.error('Blockchain health check failed:', error);
      return { ok: false, error: error.message };
    }
  }

  async setAuthToken(token) {
    // Ethereum doesn't use auth tokens in the same way as Hyperledger
    // This method is kept for API compatibility with the original service
    return true;
  }

  async createConsignment(consignmentData) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Use the first account as the sender
      const fromAddress = this.accounts[0];
      
      // Call the contract method through our service
      const result = await createConsignmentOnBlockchain(consignmentData, fromAddress);
      
      return {
        transactionId: result.transactionHash,
        timestamp: new Date().toISOString(),
        status: result.status
      };
    } catch (error) {
      console.error('Failed to create consignment:', error);
      throw error;
    }
  }

  async updateConsignmentStatus(consignmentId, status, location) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Use the first account as the sender
      const fromAddress = this.accounts[0];
      
      // Call the contract method through our service
      const result = await updateStatusOnBlockchain(consignmentId, status, location, fromAddress);
      
      return {
        transactionId: result.transactionHash,
        timestamp: new Date().toISOString(),
        status: result.status
      };
    } catch (error) {
      console.error('Failed to update consignment status:', error);
      throw error;
    }
  }

  async getConsignmentHistory(consignmentId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Get historical updates from the blockchain
      return await getHistoryFromBlockchain(consignmentId);
    } catch (error) {
      console.error('Failed to get consignment history:', error);
      throw error;
    }
  }

  async getConsignmentDetails(consignmentId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Get consignment details from the blockchain
      return await getConsignmentFromBlockchain(consignmentId);
    } catch (error) {
      console.error('Failed to get consignment details:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.initialized) {
        this.initialized = false;
        this.accounts = [];
        
        console.log('Disconnected from blockchain');
      }
      return true;
    } catch (error) {
      console.error('Error disconnecting from blockchain:', error);
      return false;
    }
  }
}

// Singleton instance
let serviceInstance = null;

/**
 * Initialize the blockchain service
 */
export async function initializeBlockchain() {
  try {
    if (!serviceInstance) {
      serviceInstance = new EthereumService();
    }
    
    return await serviceInstance.initialize();
  } catch (error) {
    console.error('Failed to initialize blockchain:', error);
    return false;
  }
}

/**
 * Check the health of the blockchain service
 */
export async function checkBlockchainHealth() {
  try {
    if (!serviceInstance) {
      await initializeBlockchain();
      if (!serviceInstance) {
        return { ok: false, error: 'Blockchain service not initialized' };
      }
    }
    
    // Try to get current block number from Ganache to verify connection
    try {
      const { getWeb3 } = await import('./blockchain-init');
      const web3 = getWeb3();
      
      if (web3) {
        const blockNumber = await web3.eth.getBlockNumber();
        return { 
          ok: true, 
          blockchainType: 'Ganache/Ethereum',
          blockNumber,
          nodeInfo: await web3.eth.getNodeInfo(),
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.warn('Could not get Ganache info:', error);
      // Continue with basic check
    }
    
    return await serviceInstance.checkHealth();
  } catch (error) {
    console.error('Blockchain health check failed:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Get the blockchain service instance
 */
export function getBlockchainService() {
  if (!serviceInstance) {
    serviceInstance = new EthereumService();
  }
  
  return serviceInstance;
}

export default {
  initializeBlockchain,
  checkBlockchainHealth,
  getBlockchainService
}; 