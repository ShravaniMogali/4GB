/**
 * Blockchain Setup Service
 * 
 * This service handles Ethereum blockchain setup using Ganache
 */

import { initializeBlockchain, getWeb3, getAccounts } from './blockchain-init';
import { initializeContract } from './blockchain-smart-contract';

// Contract deployment information
let contractAddress = null;
let deploymentTimestamp = null;

/**
 * Ensure the blockchain is set up and ready to use
 * Initializes Web3 connection and deploys contract if needed
 */
export async function ensureBlockchainSetup() {
  try {
    // Initialize blockchain connection
    const connected = await initializeBlockchain();
    if (!connected) {
      throw new Error('Failed to connect to blockchain');
    }
    
    // Get Web3 instance and accounts
    const web3 = getWeb3();
    const accounts = await getAccounts();
    
    if (accounts.length === 0) {
      throw new Error('No blockchain accounts available');
    }
    
    // Check if contract is already deployed
    const hasContract = await checkExistingContract();
    
    if (!hasContract) {
      // Deploy the contract
      console.log('Deploying SupplyChain contract...');
      await deployContract(accounts[0]);
    }
    
    // Initialize the contract in our service
    const initialized = await initializeContract(contractAddress);
    
    if (!initialized) {
      throw new Error('Failed to initialize contract');
    }
    
    return true;
  } catch (error) {
    console.error('Blockchain setup failed:', error);
    return false;
  }
}

/**
 * Check if the contract is already deployed
 */
async function checkExistingContract() {
  try {
    // Check localStorage for existing contract address
    const savedAddress = localStorage.getItem('supply_chain_contract_address');
    const savedTimestamp = localStorage.getItem('supply_chain_deployment_timestamp');
    
    if (savedAddress) {
      console.log(`Found existing contract at ${savedAddress}`);
      contractAddress = savedAddress;
      deploymentTimestamp = savedTimestamp;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for existing contract:', error);
    return false;
  }
}

/**
 * Deploy the SupplyChain contract to the blockchain
 */
async function deployContract(fromAddress) {
  try {
    // Generate a mock contract address
    contractAddress = '0x123456789012345678901234567890123456789a';
    
    // Set deployment timestamp
    deploymentTimestamp = new Date().toISOString();
    
    // Store in localStorage
    localStorage.setItem('supply_chain_contract_address', contractAddress);
    localStorage.setItem('supply_chain_deployment_timestamp', deploymentTimestamp);
    
    console.log(`Contract deployment mocked. Address: ${contractAddress}`);
    return true;
  } catch (error) {
    console.error('Error deploying contract:', error);
    throw error;
  }
}

/**
 * Get the contract address
 */
export function getContractAddress() {
  return contractAddress;
}

/**
 * Get the deployment timestamp
 */
export function getDeploymentTimestamp() {
  return deploymentTimestamp;
} 