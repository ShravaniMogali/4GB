/**
 * Blockchain API Service
 * 
 * This service provides an Express.js API for interacting with the Ethereum blockchain 
 * from the client-side application.
 * 
 * This file should be deployed on a Node.js server, not in the client application.
 */

// Import required libraries
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const Web3 = require('web3');

// Create Express app
const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// JSON Web Token configuration
const JWT_SECRET = process.env.JWT_SECRET || 'farm-to-table-dev-secret';
const TOKEN_EXPIRY = '24h';

// Web3 configuration
const BLOCKCHAIN_URL = process.env.BLOCKCHAIN_URL || 'http://localhost:8545';
let web3 = null;

// Mock database for users in development
// In production, this would be replaced with a proper database
const users = new Map();

// Supply Chain contract ABI
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

// Contract information (loaded from environment or config)
let contractAddress = process.env.CONTRACT_ADDRESS;

/**
 * Initialize Web3 connection
 */
async function initializeWeb3() {
  try {
    console.log(`Connecting to blockchain at ${BLOCKCHAIN_URL}`);
    const provider = new Web3.providers.HttpProvider(BLOCKCHAIN_URL);
    web3 = new Web3(provider);
    
    // Test connection
    const isListening = await web3.eth.net.isListening();
    if (!isListening) {
      throw new Error('Could not connect to blockchain network');
    }
    
    // Get network information for logging
    const networkId = await web3.eth.net.getId();
    const networkType = await web3.eth.net.getNetworkType();
    console.log(`Connected to blockchain network: ${networkType} (id: ${networkId})`);
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Web3:', error);
    return false;
  }
}

/**
 * Get contract instance
 */
function getContract() {
  if (!web3 || !contractAddress) {
    throw new Error('Web3 not initialized or contract address not set');
  }
  
  return new web3.eth.Contract(SUPPLY_CHAIN_ABI, contractAddress);
}

/**
 * Authenticate a user and generate a JWT token
 */
async function authenticateUser(username, password) {
  // In production, validate against a secure database
  const user = users.get(username);
  
  if (!user) {
    throw new Error(`User ${username} does not exist`);
  }
  
  // In production, use proper password hashing and comparison
  if (user.password !== password) {
    throw new Error('Invalid credentials');
  }
  
  // Create JWT token
  const token = jwt.sign(
    { username, role: user.role, address: user.address },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
  
  return token;
}

/**
 * Middleware to verify JWT token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token is required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = user;
    next();
  });
}

// Health check endpoint
app.get('/api/blockchain/health', async (req, res) => {
  try {
    // Ensure Web3 is initialized
    if (!web3) {
      const initialized = await initializeWeb3();
      if (!initialized) {
        return res.status(500).json({
          status: 'error',
          message: 'Failed to connect to blockchain'
        });
      }
    }
    
    // Check if we can communicate with the blockchain
    const blockNumber = await web3.eth.getBlockNumber();
    
    return res.json({
      status: 'ok',
      blockNumber,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Set contract address
app.post('/api/blockchain/contract', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Contract address is required' });
    }
    
    // Validate address format
    if (!web3.utils.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid contract address format' });
    }
    
    contractAddress = address;
    console.log(`Contract address set to ${contractAddress}`);
    
    return res.json({
      message: 'Contract address set successfully',
      address: contractAddress
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Register a new user
app.post('/api/blockchain/users', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check if user already exists
    if (users.has(username)) {
      return res.status(400).json({ error: `User ${username} already exists` });
    }
    
    // Ensure Web3 is initialized
    if (!web3) {
      await initializeWeb3();
    }
    
    // Create a new account for this user
    const account = web3.eth.accounts.create();
    
    // In production, implement proper password hashing
    users.set(username, {
      username,
      password, // Should be hashed in production
      role: role || 'user',
      address: account.address,
      privateKey: account.privateKey // Store securely in production
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { username, role: role || 'user', address: account.address },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    
    return res.status(201).json({
      message: `User ${username} registered successfully`,
      address: account.address,
      token
    });
  } catch (error) {
    console.error(`Failed to register user: ${error}`);
    return res.status(500).json({ error: error.message });
  }
});

// User login
app.post('/api/blockchain/auth', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const token = await authenticateUser(username, password);
    const user = users.get(username);
    
    return res.json({ 
      token,
      address: user.address,
      role: user.role
    });
  } catch (error) {
    console.error(`Authentication failed: ${error}`);
    return res.status(401).json({ error: error.message });
  }
});

// Create a new consignment on the blockchain
app.post('/api/blockchain/consignments', authenticateToken, async (req, res) => {
  try {
    // Ensure Web3 is initialized
    if (!web3) {
      await initializeWeb3();
    }
    
    const { id, productName, productionDate, farmLocation, producerInfo } = req.body;
    
    if (!id || !productName) {
      return res.status(400).json({ error: 'Consignment ID and product name are required' });
    }
    
    // Get user's Ethereum address from token
    const userAddress = req.user.address;
    
    // Get contract instance
    const contract = getContract();
    
    // Convert ID to bytes32
    const idBytes32 = web3.utils.asciiToHex(id.padEnd(32, '\0'));
    
    // Create transaction
    const gasEstimate = await contract.methods.createConsignment(
      idBytes32,
      productName,
      productionDate || '',
      farmLocation || '',
      producerInfo || ''
    ).estimateGas({ from: userAddress });
    
    const receipt = await contract.methods.createConsignment(
      idBytes32,
      productName,
      productionDate || '',
      farmLocation || '',
      producerInfo || ''
    ).send({ 
      from: userAddress,
      gas: Math.floor(gasEstimate * 1.5) // Add some buffer
    });
    
    return res.status(201).json({
      message: 'Consignment created successfully',
      transactionHash: receipt.transactionHash,
      consignmentId: id,
      status: 'CREATED'
    });
  } catch (error) {
    console.error(`Failed to create consignment: ${error}`);
    return res.status(500).json({ error: error.message });
  }
});

// Update a consignment's status
app.put('/api/blockchain/consignments/:id/status', authenticateToken, async (req, res) => {
  try {
    // Ensure Web3 is initialized
    if (!web3) {
      await initializeWeb3();
    }
    
    const { id } = req.params;
    const { status, location } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // Get user's Ethereum address from token
    const userAddress = req.user.address;
    
    // Get contract instance
    const contract = getContract();
    
    // Convert ID to bytes32
    const idBytes32 = web3.utils.asciiToHex(id.padEnd(32, '\0'));
    
    // Create transaction
    const gasEstimate = await contract.methods.updateStatus(
      idBytes32,
      status,
      location || ''
    ).estimateGas({ from: userAddress });
    
    const receipt = await contract.methods.updateStatus(
      idBytes32,
      status,
      location || ''
    ).send({ 
      from: userAddress,
      gas: Math.floor(gasEstimate * 1.5) // Add some buffer
    });
    
    return res.json({
      message: 'Consignment status updated successfully',
      transactionHash: receipt.transactionHash,
      consignmentId: id,
      status
    });
  } catch (error) {
    console.error(`Failed to update consignment status: ${error}`);
    return res.status(500).json({ error: error.message });
  }
});

// Get consignment history
app.get('/api/blockchain/consignments/:id/history', async (req, res) => {
  try {
    // Ensure Web3 is initialized
    if (!web3) {
      await initializeWeb3();
    }
    
    const { id } = req.params;
    
    // Get contract instance
    const contract = getContract();
    
    // Convert ID to bytes32
    const idBytes32 = web3.utils.asciiToHex(id.padEnd(32, '\0'));
    
    // Call the contract
    const updates = await contract.methods.getStatusUpdates(idBytes32).call();
    
    // Format the updates
    const formattedUpdates = updates.map(update => ({
      status: update.status,
      location: update.location,
      handler: update.handler,
      timestamp: new Date(Number(update.timestamp) * 1000).toISOString()
    }));
    
    return res.json(formattedUpdates);
  } catch (error) {
    console.error(`Failed to get consignment history: ${error}`);
    return res.status(500).json({ error: error.message });
  }
});

// Get consignment details
app.get('/api/blockchain/consignments/:id', async (req, res) => {
  try {
    // Ensure Web3 is initialized
    if (!web3) {
      await initializeWeb3();
    }
    
    const { id } = req.params;
    
    // Get contract instance
    const contract = getContract();
    
    // Convert ID to bytes32
    const idBytes32 = web3.utils.asciiToHex(id.padEnd(32, '\0'));
    
    // Call the contract
    const consignment = await contract.methods.getConsignment(idBytes32).call();
    
    // Format the consignment
    const formattedConsignment = {
      id,
      productName: consignment.productName,
      productionDate: consignment.productionDate,
      farmLocation: consignment.farmLocation,
      producerInfo: consignment.producerInfo,
      status: consignment.currentStatus,
      location: consignment.currentLocation,
      producer: consignment.producer,
      timestamp: new Date(Number(consignment.timestamp) * 1000).toISOString()
    };
    
    return res.json(formattedConsignment);
  } catch (error) {
    console.error(`Failed to get consignment details: ${error}`);
    return res.status(500).json({ error: error.message });
  }
});

// Start the server when run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  
  // Initialize Web3 when the server starts
  initializeWeb3().then(initialized => {
    if (initialized) {
      app.listen(PORT, () => {
        console.log(`Blockchain API server listening on port ${PORT}`);
      });
    } else {
      console.error('Failed to initialize Web3, server not started');
      process.exit(1);
    }
  });
}

// Export the app for testing or external use
module.exports = app; 