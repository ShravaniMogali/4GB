/**
 * Blockchain Utilities for the Farm-to-Table Application
 * 
 * This service provides utility functions for interacting with the blockchain API.
 */

// Base API URL for blockchain operations
const BLOCKCHAIN_API_URL = '/api/blockchain';

/**
 * Store the authentication token
 */
let authToken = null;

/**
 * Set the authentication token
 * @param {string} token - JWT token for blockchain API authentication
 */
export const setAuthToken = (token) => {
  authToken = token;
  localStorage.setItem('blockchain_auth_token', token);
};

/**
 * Get the current authentication token
 * @returns {string|null} The current JWT token
 */
export const getAuthToken = () => {
  if (!authToken) {
    authToken = localStorage.getItem('blockchain_auth_token');
  }
  return authToken;
};

/**
 * Clear the authentication token
 */
export const clearAuthToken = () => {
  authToken = null;
  localStorage.removeItem('blockchain_auth_token');
};

/**
 * Make an authenticated request to the blockchain API
 * @param {string} endpoint - API endpoint to call
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {object|null} body - Request body for POST/PUT requests
 * @returns {Promise<object>} API response
 */
export const blockchainApiRequest = async (endpoint, method = 'GET', body = null) => {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers,
    credentials: 'include'
  };
  
  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${BLOCKCHAIN_API_URL}/${endpoint}`, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Blockchain API error (${response.status}): ${errorText}`);
  }
  
  return response.json();
};

/**
 * Register a new user on the blockchain network
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @param {string} role - User's role (e.g. farmer, distributor, retailer)
 * @returns {Promise<object>} Registration response with auth token
 */
export const registerUser = async (username, password, role) => {
  return blockchainApiRequest('users', 'POST', {
    username,
    password,
    role
  });
};

/**
 * Login a user to the blockchain network
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Promise<object>} Login response with auth token
 */
export const loginUser = async (username, password) => {
  const response = await blockchainApiRequest('auth', 'POST', {
    username,
    password
  });
  
  if (response.token) {
    setAuthToken(response.token);
  }
  
  return response;
};

/**
 * Create a new consignment on the blockchain
 * @param {object} consignmentData - Consignment data
 * @returns {Promise<object>} Creation response with transaction ID
 */
export const createConsignment = async (consignmentData) => {
  return blockchainApiRequest('consignments', 'POST', consignmentData);
};

/**
 * Update a consignment's status
 * @param {string} consignmentId - Consignment ID
 * @param {string} status - New status
 * @param {object} location - Current location data
 * @returns {Promise<object>} Update response with transaction ID
 */
export const updateConsignmentStatus = async (consignmentId, status, location) => {
  return blockchainApiRequest(`consignments/${consignmentId}/status`, 'PUT', {
    status,
    location
  });
};

/**
 * Get the history of a consignment
 * @param {string} consignmentId - Consignment ID
 * @returns {Promise<Array>} Consignment transaction history
 */
export const getConsignmentHistory = async (consignmentId) => {
  return blockchainApiRequest(`consignments/${consignmentId}/history`);
};

/**
 * Export blockchain data in different formats
 * @param {Object} data - The blockchain data to export
 * @param {string} format - The export format ('json', 'csv', 'pdf')
 * @returns {string|Blob} - The exported data
 */
export const exportBlockchainData = (data, format = 'json') => {
  switch (format.toLowerCase()) {
    case 'json':
      return exportAsJson(data);
    case 'csv':
      return exportAsCsv(data);
    case 'pdf':
      return exportAsPdf(data);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};

/**
 * Export data as JSON
 * @param {Object} data - The data to export
 * @returns {Blob} - JSON blob
 */
const exportAsJson = (data) => {
  const jsonStr = JSON.stringify(data, null, 2);
  return new Blob([jsonStr], { type: 'application/json' });
};

/**
 * Export data as CSV
 * @param {Object} data - The data to export (must include history array)
 * @returns {Blob} - CSV blob
 */
const exportAsCsv = (data) => {
  // Define CSV headers
  const headers = ['Transaction ID', 'Timestamp', 'Status', 'Location', 'Updated By'];
  
  // Convert transactions to CSV rows
  const rows = data.history.map(record => {
    const location = record.value && record.value.location ? 
      `${record.value.location.lat || 'N/A'},${record.value.location.lng || 'N/A'}` : 
      'N/A';
    
    const updatedBy = record.value && record.value.updatedBy ? 
      record.value.updatedBy.role || 'Unknown' : 
      'Unknown';
    
    return [
      record.txId || 'N/A',
      new Date(record.timestamp).toLocaleString() || 'N/A',
      record.value && record.value.status ? record.value.status : 'N/A',
      location,
      updatedBy
    ];
  });
  
  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
};

/**
 * Export data as PDF (simplified mock version)
 * @param {Object} data - The data to export
 * @returns {Blob} - Mock PDF blob
 */
const exportAsPdf = (data) => {
  // In a real implementation, this would use a PDF library
  // For this mock, we just create a text representation
  const pdfContent = `
  ============================================
  BLOCKCHAIN VERIFICATION CERTIFICATE
  ============================================
  
  Consignment ID: ${data.id}
  Vegetable: ${data.vegetableName}
  Producer: ${data.farmerName || 'Unknown'}
  Status: ${data.status || 'Unknown'}
  
  ---- BLOCKCHAIN VERIFICATION ----
  Transaction ID: ${data.blockchainData?.transactionId || 'N/A'}
  Timestamp: ${new Date(data.blockchainData?.timestamp).toLocaleString() || 'N/A'}
  Number of Updates: ${data.history?.length || 0}
  
  This certificate verifies that this consignment 
  has been recorded on the blockchain and is 
  authentic.
  
  Verification URL: ${window.location.origin}/verify/${data.id}
  
  ============================================
  `;
  
  return new Blob([pdfContent], { type: 'application/pdf' });
};

/**
 * Generate a download link for the exported data
 * @param {Blob} blob - The data blob
 * @param {string} filename - The download filename
 */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/**
 * Format blockchain status into user-friendly text
 * @param {string} status - The blockchain status code
 * @returns {string} - User-friendly status text
 */
export const formatBlockchainStatus = (status) => {
  const statusMap = {
    'connected': 'Connected to Blockchain',
    'disconnected': 'Disconnected from Blockchain',
    'error': 'Blockchain Connection Error',
    'checking': 'Checking Blockchain Connection...',
    'unknown': 'Blockchain Status Unknown'
  };
  
  return statusMap[status] || statusMap.unknown;
};

/**
 * Verify blockchain health/connectivity
 * @returns {Promise<object>} Health status
 */
export const checkBlockchainHealth = async () => {
  try {
    return await blockchainApiRequest('health');
  } catch (error) {
    console.error('Blockchain health check failed:', error);
    return { status: 'error', message: error.message };
  }
}; 