/**
 * Smart Contract Service
 * 
 * Handles interaction with our supply chain tracking smart contract
 */

import { getWeb3, isBlockchainConnected } from './blockchain-init';

// ABI for the SupplyChain smart contract - this would typically be generated when compiling the contract
const SUPPLY_CHAIN_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "consignmentId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "productName",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "producer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "ConsignmentCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "consignmentId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "status",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "location",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "handler",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "StatusUpdated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_consignmentId",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "_productName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_productionDate",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_farmLocation",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_producerInfo",
        "type": "string"
      }
    ],
    "name": "createConsignment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_consignmentId",
        "type": "bytes32"
      }
    ],
    "name": "getConsignment",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "productName",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "productionDate",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "farmLocation",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "producerInfo",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "currentStatus",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "currentLocation",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "producer",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct SupplyChain.Consignment",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_consignmentId",
        "type": "bytes32"
      }
    ],
    "name": "getStatusUpdates",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "status",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "location",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "handler",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct SupplyChain.StatusUpdate[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_consignmentId",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "_status",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_location",
        "type": "string"
      }
    ],
    "name": "updateStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Singleton contract instance
let supplyChainContract = null;
let contractAddress = null;

/**
 * Initialize the supply chain contract
 * @param {string} address - Address of the deployed contract
 * @returns {Promise<boolean>} - Success status
 */
export async function initializeContract(address) {
  try {
    if (!isBlockchainConnected()) {
      throw new Error('Blockchain not connected');
    }
    
    if (!address) {
      throw new Error('Contract address is required');
    }
    
    console.log(`Initializing contract at address ${address}`);
    
    // Simply store the address without creating a real contract instance
    // This allows us to mock the contract interactions
    contractAddress = address;
    
    console.log('Mock contract initialized successfully');
    return true;
  } catch (error) {
    console.error('Contract initialization failed:', error);
    return false;
  }
}

/**
 * Create a new consignment on the blockchain
 * @param {Object} consignmentData - Consignment details
 * @param {string} fromAddress - Ethereum address of the sender
 * @returns {Promise<Object>} - Transaction receipt
 */
export async function createConsignment(consignmentData, fromAddress) {
  try {
    if (!isBlockchainConnected()) {
      throw new Error('Blockchain not connected');
    }
    
    if (!contractAddress) {
      throw new Error('Contract not initialized');
    }
    
    console.log(`Mock creating consignment: ${consignmentData.id}`);
    
    // Return a mock transaction receipt
    return {
      transactionHash: `0x${Array(64).fill(0).map(() => 
        Math.floor(Math.random() * 16).toString(16)).join('')}`,
      status: true,
      blockNumber: 12345,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Failed to create consignment:', error);
    throw error;
  }
}

/**
 * Update a consignment's status on the blockchain
 * @param {string} consignmentId - ID of the consignment
 * @param {string} status - New status
 * @param {string|object} location - Location string (e.g. "lat,lng") or object
 * @param {string|null} fromAddress - Address to send the transaction from
 * @returns {Promise<object>} Transaction result
 */
export async function updateConsignmentStatus(consignmentId, status, location, fromAddress) {
  try {
    // Process location to ensure it's in the right format
    let locationObj = location;
    if (typeof location === 'string') {
      try {
        const [lat, lng] = location.split(',').map(val => parseFloat(val.trim()));
        locationObj = { lat, lng };
      } catch (e) {
        locationObj = { lat: 0, lng: 0 };
      }
    }
    
    // Check if the consignment exists in the mock history
    const storageKey = `blockchain_history_${consignmentId}`;
    const savedUpdatesString = localStorage.getItem(storageKey);
    
    // If consignment doesn't exist, create a new history entry
    if (!savedUpdatesString) {
      const initialUpdate = {
        txId: `tx-${consignmentId.substring(0, 8)}-init`,
        timestamp: new Date().toISOString(),
        value: {
          status: 'created',
          location: locationObj,
          updatedBy: {
            role: 'retailer',
            id: fromAddress || 'unknown'
          }
        }
      };
      
      // Save the initial update
      localStorage.setItem(storageKey, JSON.stringify([initialUpdate]));
    }
    
    // Save the status update to the mock history
    const update = saveStatusUpdate(consignmentId, status, locationObj);
    
    // Generate a mock transaction
    const txId = update.txId;
    const timestamp = update.timestamp;
    
    // For demo, we simulate a blockchain transaction
    return {
      transactionId: txId,
      timestamp,
      status: 'success',
      newStatus: status,
      blockNumber: Math.floor(Math.random() * 1000000) + 10000000,
      location: locationObj
    };
  } catch (error) {
    console.error('Error updating consignment status:', error);
    throw error;
  }
}

/**
 * Get consignment details from the blockchain
 * @param {string} consignmentId - ID of the consignment
 * @returns {Promise<Object>} - Consignment details
 */
export async function getConsignment(consignmentId) {
  try {
    if (!isBlockchainConnected()) {
      throw new Error('Blockchain not connected');
    }
    
    if (!contractAddress) {
      throw new Error('Contract not initialized');
    }
    
    console.log(`Mock getting consignment: ${consignmentId}`);
    
    // Return mock consignment data
    return {
      productName: "Organic Apples",
      productionDate: "2023-05-15",
      farmLocation: "Green Valley Farm, California",
      producerInfo: "Green Valley Organics LLC",
      currentStatus: "HARVESTED",
      currentLocation: "Farm Storage Facility",
      producer: fromAddress || "0x123456789012345678901234567890123456789a",
      timestamp: Date.now() - 86400000 // 1 day ago
    };
  } catch (error) {
    console.error('Failed to get consignment:', error);
    throw error;
  }
}

/**
 * Get consignment history from the blockchain
 * @param {string} consignmentId - ID of the consignment
 * @returns {Promise<Array>} Array of status updates
 */
export async function getConsignmentHistory(consignmentId) {
  try {
    // For demo purposes, always use mock data that properly reflects status changes
    return generateMockHistory(consignmentId);
  } catch (error) {
    console.error('Error getting consignment history:', error);
    throw error;
  }
}

/**
 * Generate mock history for testing
 * @param {string} consignmentId - Consignment ID
 * @returns {Array} Mock history array
 */
export function generateMockHistory(consignmentId) {
  // Create a deterministic but random-looking timestamp for the base time
  const hash = hashCode(consignmentId);
  const baseTime = Date.now() - (Math.abs(hash) % 10) * 24 * 60 * 60 * 1000;
  
  // Storage key for tracking custom updates for this consignment
  const storageKey = `blockchain_history_${consignmentId}`;
  
  // Create status updates with proper chronological progression
  const mockHistory = [];
  
  // Always include "created" status first
  mockHistory.push({
    txId: `tx-${consignmentId.substring(0, 8)}-1`,
    timestamp: new Date(baseTime - 2 * 24 * 60 * 60 * 1000).toISOString(),
    value: {
      status: 'created',
      location: {
        lat: 18.5204 + (hash % 100) / 1000,
        lng: 73.8567 + (hash % 100) / 1000
      },
      updatedBy: {
        role: 'farmer',
        id: `user-${Math.abs(hash) % 1000}`
      }
    }
  });
  
  // Add "in_transit" status
  mockHistory.push({
    txId: `tx-${consignmentId.substring(0, 8)}-2`,
    timestamp: new Date(baseTime - 1 * 24 * 60 * 60 * 1000).toISOString(),
    value: {
      status: 'in_transit',
      location: {
        lat: 18.5704 + (hash % 100) / 1000,
        lng: 73.9067 + (hash % 100) / 1000
      },
      updatedBy: {
        role: 'transporter',
        id: `user-${Math.abs(hash + 1) % 1000}`
      }
    }
  });
  
  // Try to get any custom updates from localStorage
  try {
    const savedUpdatesString = localStorage.getItem(storageKey);
    if (savedUpdatesString) {
      const savedUpdates = JSON.parse(savedUpdatesString);
      if (Array.isArray(savedUpdates) && savedUpdates.length > 0) {
        // Add all saved updates to the history
        mockHistory.push(...savedUpdates);
      }
    }
  } catch (e) {
    console.warn('Error loading saved history updates:', e);
  }
  
  return mockHistory;
}

/**
 * Save a status update to the mock history
 * @param {string} consignmentId - Consignment ID
 * @param {string} status - New status
 * @param {object} location - Location object (lat/lng)
 * @returns {object} New history entry
 */
export function saveStatusUpdate(consignmentId, status, location) {
  const storageKey = `blockchain_history_${consignmentId}`;
  const timestamp = new Date().toISOString();
  const txId = `tx-${consignmentId.substring(0, 8)}-${Date.now() % 10000}`;
  
  // Create the new update entry
  const newUpdate = {
    txId,
    timestamp,
    value: {
      status,
      location,
      updatedBy: {
        role: 'distributor', // Could be dynamic based on user role
        id: `user-${Math.floor(Math.random() * 1000)}`
      }
    }
  };
  
  // Try to save to localStorage for persistence
  try {
    let savedUpdates = [];
    const savedUpdatesString = localStorage.getItem(storageKey);
    
    if (savedUpdatesString) {
      savedUpdates = JSON.parse(savedUpdatesString);
    }
    
    if (!Array.isArray(savedUpdates)) {
      savedUpdates = [];
    }
    
    // Add the new update
    savedUpdates.push(newUpdate);
    
    // Save back to localStorage
    localStorage.setItem(storageKey, JSON.stringify(savedUpdates));
  } catch (e) {
    console.warn('Error saving history update:', e);
  }
  
  return newUpdate;
}

/**
 * Simple hash function for strings
 * @param {string} str - String to hash
 * @returns {number} Hash code
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Format status updates from the contract format to our app format
 * @param {Array} contractUpdates - Updates from the contract
 * @returns {Array} Formatted updates
 */
function formatStatusUpdates(contractUpdates) {
  return contractUpdates.map((update, index) => ({
    txId: `tx-${index}`,
    timestamp: new Date(update.timestamp * 1000).toISOString(),
    value: {
      status: update.status,
      location: parseLocation(update.location),
      updatedBy: {
        role: getRoleForAddress(update.handler),
        id: update.handler
      }
    }
  }));
}

/**
 * Parse location string to coordinates
 * @param {string} locationStr - Location string from contract
 * @returns {object} Location object with lat/lng
 */
function parseLocation(locationStr) {
  try {
    const [lat, lng] = locationStr.split(',').map(coord => parseFloat(coord.trim()));
    return { lat, lng };
  } catch (error) {
    return { lat: 0, lng: 0 };
  }
}

/**
 * Get role for an Ethereum address (mock implementation)
 * @param {string} address - Ethereum address
 * @returns {string} Role
 */
function getRoleForAddress(address) {
  // In a real app, this would do a lookup in a user database
  const lastChar = address.slice(-1).toLowerCase();
  if (lastChar < '5') return 'farmer';
  if (lastChar < 'a') return 'transporter';
  return 'distributor';
}

/**
 * Get the contract instance
 * @returns {object|null} - Contract instance
 */
export function getContract() {
  return supplyChainContract;
}

/**
 * Get the contract address
 * @returns {string|null} - Contract address
 */
export function getContractAddress() {
  return contractAddress;
}

/**
 * Clear the saved history for a consignment
 * @param {string} consignmentId - Consignment ID
 * @returns {boolean} Success status
 */
export function clearConsignmentHistory(consignmentId) {
  const storageKey = `blockchain_history_${consignmentId}`;
  
  try {
    localStorage.removeItem(storageKey);
    return true;
  } catch (e) {
    console.warn('Error clearing history:', e);
    return false;
  }
} 