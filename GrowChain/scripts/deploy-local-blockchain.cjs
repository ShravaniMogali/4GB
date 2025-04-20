/**
 * Local Blockchain Setup Script
 * 
 * This script sets up a local Ganache blockchain and deploys our smart contract
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const GANACHE_PORT = process.env.GANACHE_PORT || 8545;
const GANACHE_HOST = process.env.GANACHE_HOST || '0.0.0.0'; // Allow external connections
const MNEMONIC = process.env.MNEMONIC || 'test test test test test test test test test test test junk'; // Consistent accounts
const CHAIN_ID = process.env.CHAIN_ID || 1337;
const BLOCK_TIME = 5; // Auto-mine blocks every 5 seconds
const DB_PATH = path.resolve(__dirname, '../blockchain-data');

// Log with timestamp
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Check if a process is running on the specified port
function isPortInUse(port) {
  try {
    if (process.platform === 'win32') {
      execSync(`netstat -ano | findstr :${port}`);
    } else {
      execSync(`lsof -i:${port}`);
    }
    return true;
  } catch (error) {
    return false;
  }
}

// Check if a command is available
function commandExists(command) {
  try {
    const whichCommand = process.platform === 'win32' ? 'where' : 'which';
    execSync(`${whichCommand} ${command.split(' ')[0]}`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Ensure npm dependencies are installed
function ensureDependencies() {
  log('Checking dependencies...');
  try {
    // Check if ganache is installed
    const hasGanache = commandExists('npx ganache');
    if (!hasGanache) {
      log('Ganache not found, installing...');
      execSync('npm install -g ganache', { stdio: 'inherit' });
    } else {
      log('Ganache is installed');
    }
    
    // Check if solc is installed
    const hasSolc = commandExists('npx solc');
    if (!hasSolc) {
      log('Solidity compiler not found, installing...');
      execSync('npm install -g solc', { stdio: 'inherit' });
    } else {
      log('Solidity compiler is installed');
    }
  } catch (error) {
    log('Installing required dependencies...');
    execSync('npm install ganache solc web3 @truffle/contract', { stdio: 'inherit' });
  }
}

// Start Ganache blockchain
async function startGanache() {
  log(`Starting Ganache on ${GANACHE_HOST}:${GANACHE_PORT}...`);
  
  // Check if Ganache is already running
  if (isPortInUse(GANACHE_PORT)) {
    log(`A process is already running on port ${GANACHE_PORT}. Using existing instance.`);
    return true;
  }
  
  // Create data directory for blockchain persistence
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
  }
  
  // Normalize path for Windows
  const normalizedDbPath = DB_PATH.replace(/\\/g, '/');
  log(`Using blockchain data path: ${normalizedDbPath}`);
  
  // Basic command without complex arguments
  try {
    log('Starting Ganache using basic command...');
    
    let startCommand;
    if (process.platform === 'win32') {
      // Windows - use start command with quoted strings
      startCommand = `start /B npx ganache --port ${GANACHE_PORT} --host ${GANACHE_HOST} --miner.blockTime ${BLOCK_TIME}`;
      log(`Executing: ${startCommand}`);
      execSync(startCommand, { stdio: 'inherit', shell: true });
    } else {
      // Unix systems
      startCommand = `npx ganache --port ${GANACHE_PORT} --host ${GANACHE_HOST} --miner.blockTime ${BLOCK_TIME} &`;
      log(`Executing: ${startCommand}`);
      execSync(startCommand, { stdio: 'inherit', shell: true });
    }
    
    log('Ganache started successfully');
    
    // Wait for Ganache to initialize
    log('Waiting for Ganache to initialize...');
    await sleep(5000);
    
    return true;
  } catch (error) {
    log(`Failed to start Ganache: ${error.message}`);
    return false;
  }
}

// Deploy the contract
function deployContract() {
  log('Deploying smart contract...');
  
  try {
    // First check if the deploy file exists
    const deployScriptPath = path.resolve(__dirname, '../src/contracts/deploy.cjs');
    
    if (!fs.existsSync(deployScriptPath)) {
      log(`Deploy script not found at ${deployScriptPath}`);
      return false;
    }
    
    log(`Found deploy script at ${deployScriptPath}`);
    
    // Execute the deploy script directly via node
    if (process.platform === 'win32') {
      // On Windows, run node directly
      log('Executing deploy script via node on Windows');
      execSync(`node "${deployScriptPath}"`, { stdio: 'inherit' });
    } else {
      // On Unix
      log('Executing deploy script on Unix');
      execSync(`node ${deployScriptPath}`, { stdio: 'inherit' });
    }
    
    log('Smart contract deployed successfully');
    return true;
  } catch (error) {
    log('Contract deployment failed: ' + error.message);
    log('Error details:', error);
    return false;
  }
}

// Helper function to wait for a specified number of milliseconds
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function
async function main() {
  log('Setting up local blockchain environment...');
  
  // Check dependencies
  ensureDependencies();
  
  // Start Ganache
  const ganacheStarted = await startGanache();
  if (!ganacheStarted) {
    log('Failed to start Ganache. Exiting.');
    process.exit(1);
  }
  
  // Deploy contract
  const contractDeployed = deployContract();
  if (!contractDeployed) {
    log('Contract deployment failed. Exiting.');
    process.exit(1);
  }
  
  log('Local blockchain setup completed successfully!');
  log(`Blockchain running at http://${GANACHE_HOST}:${GANACHE_PORT}`);
  log('You can now start your application');
}

// Run the script
main().catch(error => {
  log(`Error: ${error.message}`);
  process.exit(1);
}); 