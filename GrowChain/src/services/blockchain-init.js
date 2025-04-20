/**
 * Blockchain Initialization Service
 * 
 * This service initializes our Ethereum blockchain connection using Ganache and Web3
 */

import { Web3 } from 'web3';

// Default connection settings
const DEFAULT_BLOCKCHAIN_URL = 'http://localhost:8546';

// Store singleton web3 instance
let web3Instance = null;
let accounts = [];
let isConnected = false;

/**
 * Initialize the connection to the blockchain
 * @param {string} url - URL of the blockchain provider (optional)
 * @returns {Promise<boolean>} - Connection success status
 */
export async function initializeBlockchain(url = DEFAULT_BLOCKCHAIN_URL) {
  try {
    console.log(`Connecting to blockchain at ${url}...`);
    
    // Create Web3 instance (Web3 v4.x syntax)
    web3Instance = new Web3(url);
    
    // Test the connection
    try {
      // In Web3 v4, we can use getNodeInfo() to test connection
      const nodeInfo = await web3Instance.eth.getNodeInfo();
      console.log(`Connected to node: ${nodeInfo}`);
    } catch (err) {
      console.error('Connection test failed:', err);
      throw new Error('Could not connect to blockchain network');
    }
    
    // Get network information
    try {
      // In Web3 v4.x, use getChainId() instead of net.getId()
      const chainId = await web3Instance.eth.getChainId();
      console.log(`Connected to blockchain network with chain ID: ${chainId}`);
    } catch (err) {
      console.warn('Could not get chain ID:', err);
      // Continue anyway
    }
    
    // Get accounts
    try {
      accounts = await web3Instance.eth.getAccounts();
      console.log(`Found ${accounts.length} accounts on the blockchain`);
    } catch (err) {
      console.error('Could not get accounts:', err);
      accounts = [];
    }
    
    isConnected = true;
    
    return true;
  } catch (error) {
    console.error('Blockchain initialization failed:', error);
    web3Instance = null;
    accounts = [];
    isConnected = false;
    return false;
  }
}

/**
 * Get the Web3 instance
 * @returns {Web3|null} - Web3 instance or null if not initialized
 */
export function getWeb3() {
  return web3Instance;
}

/**
 * Get the blockchain accounts
 * @returns {Array} - Array of account addresses
 */
export function getAccounts() {
  return [...accounts];
}

/**
 * Check if the blockchain is connected
 * @returns {boolean} - Connection status
 */
export function isBlockchainConnected() {
  return isConnected;
}

/**
 * Disconnect from the blockchain
 * @returns {boolean} - Success status
 */
export function disconnectBlockchain() {
  if (web3Instance) {
    web3Instance = null;
    accounts = [];
    isConnected = false;
    console.log('Disconnected from blockchain');
    return true;
  }
  return false;
}

export default {
  initializeBlockchain,
  getWeb3,
  getAccounts,
  isBlockchainConnected,
  disconnectBlockchain
}; 