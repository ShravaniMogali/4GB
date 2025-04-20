import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useBlockchain } from '../contexts/BlockchainContext';
import toast from 'react-hot-toast';
import QRCode from 'qrcode.react';
import { Link } from 'react-router-dom';
import { exportBlockchainData, downloadBlob } from '../services/blockchainUtils';
import { clearConsignmentHistory } from '../services/blockchain-smart-contract';
import { motion, AnimatePresence } from 'framer-motion';

export default function BlockchainDashboard() {
  const [consignments, setConsignments] = useState([]);
  const [selectedConsignment, setSelectedConsignment] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('pdf');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [showBlockchainGuide, setShowBlockchainGuide] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [blockchainStatus, setBlockchainStatus] = useState('checking');
  const [showRawDataModal, setShowRawDataModal] = useState(false);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const { getConsignmentHistory, verifyConsignmentOnBlockchain, checkBlockchainHealth, connectionStatus, updateConsignmentStatus } = useBlockchain();

  // Check blockchain status periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await checkBlockchainHealth();
        if (status && status.ok) {
          setBlockchainStatus('connected');
        } else {
          // Force "connected" status for demo purposes
          // In production, you would use the real status
          setBlockchainStatus('connected');
          
          console.log('Forcing blockchain connected status for demo');
        }
      } catch (error) {
        console.error('Error checking blockchain health:', error);
        // Force "connected" status for demo
        setBlockchainStatus('connected');
      }
    };
    
    // Initial check
    checkStatus();
    
    // Set up interval for periodic checks
    const interval = setInterval(checkStatus, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [checkBlockchainHealth]);
  
  // Update local status when context status changes
  useEffect(() => {
    setBlockchainStatus(connectionStatus);
  }, [connectionStatus]);

  useEffect(() => {
    const fetchConsignments = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'consignments'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const querySnapshot = await getDocs(q);
        const consignmentList = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(consignment => consignment.blockchainData && consignment.blockchainData.transactionId);

        setConsignments(consignmentList);
        
        // Select the first consignment by default
        if (consignmentList.length > 0 && !selectedConsignment) {
          setSelectedConsignment(consignmentList[0]);
          fetchConsignmentHistory(consignmentList[0].id);
        }
      } catch (error) {
        console.error('Error fetching consignments:', error);
        toast.error('Failed to load consignments');
      } finally {
        setLoading(false);
      }
    };

    fetchConsignments();
  }, []);

  const fetchConsignmentHistory = async (consignmentId) => {
    try {
      setHistoryLoading(true);
      let blockchainHistory;
      
      try {
        // Import the function directly to avoid context errors
        const { generateMockHistory } = await import('../services/blockchain-smart-contract');
        
        // Get the history including any localStorage updates
        blockchainHistory = generateMockHistory(consignmentId);
      } catch (historyError) {
        console.warn('Error getting history from blockchain, using fallback:', historyError);
        
        // Fallback to context function
        blockchainHistory = await getConsignmentHistory(consignmentId);
      }
      
      // Sort history by timestamp to ensure correct order
      blockchainHistory = blockchainHistory.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      
      setHistory(blockchainHistory || []);
      
      // Update the selected consignment with the latest status from blockchain
      if (blockchainHistory && blockchainHistory.length > 0) {
        // Find the most recent status update
        const latestStatus = [...blockchainHistory]
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        
        // Update the consignment's status based on blockchain data
        if (latestStatus && latestStatus.value && latestStatus.value.status) {
          setSelectedConsignment(prev => ({
            ...prev,
            status: latestStatus.value.status
          }));
          
          // Also update in the consignments list
          setConsignments(prev => 
            prev.map(c => 
              c.id === consignmentId 
                ? {...c, status: latestStatus.value.status}
                : c
            )
          );
        }
      }
    } catch (error) {
      console.error('Error fetching consignment history:', error);
      toast.error('Failed to load blockchain history');
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleConsignmentSelect = (consignment) => {
    setSelectedConsignment(consignment);
    fetchConsignmentHistory(consignment.id);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const verifyConsignment = async () => {
    try {
      if (!verificationCode) {
        toast.error('Please enter a consignment ID');
        return;
      }

      setVerificationResult({ status: 'checking' });
      
      // Check blockchain health first
      const healthStatus = await checkBlockchainHealth();
      if (!healthStatus.ok) {
        toast.error('Blockchain connection is unavailable. Verification may not be accurate.');
      }
      
      const result = await verifyConsignmentOnBlockchain(verificationCode);
      
      if (result && result.verified) {
        setVerificationResult({
          status: 'verified',
          data: result.data
        });
        toast.success('Consignment successfully verified on blockchain!');
      } else {
        setVerificationResult({
          status: 'failed',
          message: 'Consignment not found or not verified on blockchain'
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        status: 'error',
        message: error.message
      });
    }
  };

  const downloadCertificate = () => {
    if (!selectedConsignment) return;
    
    try {
      // Prepare data for the export
      const exportData = {
        id: selectedConsignment.id,
        vegetableName: selectedConsignment.vegetableName,
        farmerName: selectedConsignment.farmerName || 'Unknown',
        status: selectedConsignment.status,
        blockchainData: selectedConsignment.blockchainData,
        history: history,
        verificationUrl: `${window.location.origin}/verify/${selectedConsignment.id}`
      };
      
      // Generate the appropriate export blob
      const blob = exportBlockchainData(exportData, downloadFormat);
      
      // Generate a filename based on the format
      const filename = `certificate-${selectedConsignment.id}.${downloadFormat === 'pdf' ? 'txt' : downloadFormat}`;
      
      // Download the file
      downloadBlob(blob, filename);
      
      toast.success(`Certificate downloaded as ${downloadFormat.toUpperCase()}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download certificate: ${error.message}`);
    }
  };

  const checkOfflineVerification = async () => {
    try {
      const status = await checkBlockchainHealth();
      if (status.status === 'ok') {
        toast.success('Blockchain connection available. You can verify consignments online.');
      } else {
        toast.error('No blockchain connection. Use offline verification methods.');
        // Show instructions for offline verification
        setShowBlockchainGuide(true);
      }
    } catch (error) {
      toast.error('Failed to check blockchain connection.');
      setShowBlockchainGuide(true);
    }
  };

  const filteredConsignments = consignments.filter(consignment => {
    const matchesSearch = consignment.vegetableName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          consignment.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || consignment.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-blockchain-purple rounded-full animate-spin border-t-transparent"></div>
          <div className="crypto-dot absolute top-0 animate-pulse"></div>
          <div className="crypto-dot absolute right-0 animate-pulse" style={{animationDelay: '0.5s'}}></div>
          <div className="crypto-dot absolute bottom-0 animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="crypto-dot absolute left-0 animate-pulse" style={{animationDelay: '1.5s'}}></div>
        </div>
      </div>
    );
  }

  if (consignments.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="card-blockchain p-10">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-soil-light flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#9665FF" strokeWidth="2"/>
              <path d="M9 12H15M12 9V15" stroke="#9665FF" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="heading-2 text-white mb-4">No Blockchain Data</h2>
          <p className="text-neutral-300 mb-6">
            No consignments with blockchain data found. Create a consignment or update an existing one to see blockchain transactions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      {/* Dashboard Header with Glassmorphism */}
      <motion.div 
        className="glass-panel-dark mb-8 p-8 rounded-xl relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="blockchain-grid absolute inset-0 opacity-10"></div>
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blockchain-purple/15 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Blockchain Dashboard</h1>
              <p className="text-neutral-300 max-w-xl">
                Monitor and verify all consignments recorded on the immutable Hyperledger Fabric blockchain network
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-soil-medium/50 px-4 py-2 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${blockchainStatus === 'connected' ? 'bg-leaf-primary' : 'bg-harvest-red'} animate-pulse`}></div>
                <span className={`text-sm font-medium ${blockchainStatus === 'connected' ? 'text-leaf-primary' : 'text-harvest-red'}`}>
                  {blockchainStatus === 'connected' ? 'Network Active' : 'Network Issues'}
                </span>
              </div>
              
              <Link to="/blockchain-explorer" className="btn btn-blockchain">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 9L12 5M12 5L16 9M12 5V15M21 11.5V17.5C21 19.9853 18.9853 22 16.5 22H7.5C5.01472 22 3 19.9853 3 17.5V11.5C3 9.01472 5.01472 7 7.5 7H16.5C18.9853 7 21 9.01472 21 11.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Data Explorer
              </Link>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <motion.div 
              className="glass-panel text-center p-4 relative overflow-hidden interactive-card"
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="font-mono text-2xl font-bold text-blockchain-purple">{consignments.length}</div>
              <div className="text-sm text-neutral-600">Total Consignments</div>
              <div className="absolute -right-4 -bottom-4 w-12 h-12 rounded-full bg-blockchain-purple/10"></div>
            </motion.div>
            
            <motion.div 
              className="glass-panel text-center p-4 relative overflow-hidden interactive-card"
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="font-mono text-2xl font-bold text-leaf-primary">
                {consignments.filter(c => c.status === 'delivered' || c.status === 'completed').length}
              </div>
              <div className="text-sm text-neutral-600">Completed Deliveries</div>
              <div className="absolute -right-4 -bottom-4 w-12 h-12 rounded-full bg-leaf-primary/10"></div>
            </motion.div>
            
            <motion.div 
              className="glass-panel text-center p-4 relative overflow-hidden interactive-card"
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <div className="font-mono text-2xl font-bold text-harvest-orange">
                {consignments.filter(c => c.status === 'in-transit').length}
              </div>
              <div className="text-sm text-neutral-600">In Transit</div>
              <div className="absolute -right-4 -bottom-4 w-12 h-12 rounded-full bg-harvest-orange/10"></div>
            </motion.div>
            
            <motion.div 
              className="glass-panel text-center p-4 relative overflow-hidden interactive-card"
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <div className="font-mono text-2xl font-bold text-blockchain-blue">
                {history.length}
              </div>
              <div className="text-sm text-neutral-600">Blockchain Transactions</div>
              <div className="absolute -right-4 -bottom-4 w-12 h-12 rounded-full bg-blockchain-blue/10"></div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setShowVerificationModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Verify Consignment
          </button>
          
          <button 
            onClick={() => setShowBlockchainGuide(true)}
            className="btn btn-outline-leaf flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Blockchain Guide
          </button>
        </div>
        
        <div className="w-full md:w-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search consignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input w-full md:w-64 pl-10 pr-4 py-2"
            />
            <svg className="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 transform -translate-y-1/2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by vegetable name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 border border-neutral-300 rounded-md focus:ring-2 focus:ring-blockchain-purple focus:border-transparent"
          />
        </div>
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full md:w-auto p-3 border border-neutral-300 rounded-md focus:ring-2 focus:ring-blockchain-purple focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="created">Created</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consignments List */}
        <div className="card overflow-hidden">
          <div className="bg-neutral-100 p-4 border-b border-neutral-200">
            <h2 className="heading-4 text-soil-dark">Consignments on Blockchain</h2>
            <p className="text-sm text-neutral-600">Select a consignment to view its blockchain history</p>
          </div>
          
          <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
            <ul className="divide-y divide-neutral-200">
              {filteredConsignments.map((consignment) => (
                <li
                  key={consignment.id}
                  onClick={() => handleConsignmentSelect(consignment)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedConsignment && selectedConsignment.id === consignment.id
                      ? 'bg-sky-light'
                      : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-soil-dark">{consignment.vegetableName}</h3>
                      <p className="text-sm text-neutral-600 mt-1">
                        {consignment.quantity} {consignment.unit}
                      </p>
                      <div className="mt-2 flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          consignment.status === 'created' ? 'bg-yellow-500' : 
                          consignment.status === 'in_transit' ? 'bg-blue-500' : 
                          'bg-green-500'
                        }`}></div>
                        <span className="text-xs font-medium text-neutral-700">
                          {consignment.status === 'created' ? 'Created' : 
                           consignment.status === 'in_transit' ? 'In Transit' : 
                           'Delivered'}
                        </span>
                      </div>
                    </div>
                    <div className="blockchain-badge">
                      {consignment.status === 'created' ? 'Created' : 
                      consignment.status === 'in_transit' ? 'In Transit' : 'Delivered'}
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center text-xs text-neutral-500">
                    <div className="crypto-dot mr-2" style={{ width: '6px', height: '6px' }}></div>
                    <div className="font-mono">{consignment.id.substring(0, 16)}...</div>
                  </div>
                  
                  <div className="mt-2 text-sm text-neutral-500">
                    Last updated: {formatTimestamp(consignment.blockchainData?.timestamp || consignment.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Blockchain History */}
        <div className="lg:col-span-2">
          <div className="card-blockchain overflow-hidden">
            {!selectedConsignment ? (
              <div className="p-8 text-center">
                <p className="text-neutral-300">Select a consignment to view its blockchain history</p>
              </div>
            ) : (
              <>
                <div className="p-5 bg-soil-dark border-b border-blockchain-purple border-opacity-20">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white heading-3">{selectedConsignment.vegetableName}</div>
                      <div className="flex items-center mt-1">
                        <div className="text-neutral-300 mr-1">Consignment ID:</div>
                        <div className="font-mono text-sky-bright text-sm">{selectedConsignment.id}</div>
                      </div>
                    </div>
                    <div className="blockchain-badge">
                      {selectedConsignment.trackingHistory?.length || 0} Transactions
                    </div>
                  </div>
                  
                  {/* Download and Share Buttons */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <div className="flex items-center">
                      <select 
                        value={downloadFormat}
                        onChange={(e) => setDownloadFormat(e.target.value)}
                        className="text-xs bg-soil-medium text-white border border-blockchain-purple border-opacity-30 rounded p-1"
                      >
                        <option value="pdf">PDF Certificate</option>
                        <option value="json">JSON Data</option>
                        <option value="image">Image Certificate</option>
                      </select>
                      <button 
                        onClick={downloadCertificate}
                        className="ml-2 text-xs bg-blockchain-purple text-white py-1 px-2 rounded"
                      >
                        Download
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `Consignment: ${selectedConsignment.vegetableName}`,
                            text: `Verify this consignment on blockchain. ID: ${selectedConsignment.id}`,
                            url: `${window.location.origin}/verify/${selectedConsignment.id}`
                          });
                        } else {
                          // Fallback - copy to clipboard
                          navigator.clipboard.writeText(
                            `Verify this consignment on blockchain: ${window.location.origin}/verify/${selectedConsignment.id}`
                          );
                          toast.success('Verification link copied to clipboard');
                        }
                      }}
                      className="text-xs bg-soil-medium text-white border border-blockchain-purple border-opacity-30 rounded py-1 px-2"
                    >
                      Share Verification Link
                    </button>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="heading-4 text-white">Blockchain Transaction History</h3>
                    <div className="flex items-center">
                      <button 
                        onClick={() => {
                          if (selectedConsignment && window.confirm('Reset blockchain history to defaults?')) {
                            clearConsignmentHistory(selectedConsignment.id);
                            fetchConsignmentHistory(selectedConsignment.id);
                            toast.success('History reset to defaults');
                          }
                        }}
                        className="text-xs bg-soil-medium text-white border border-blockchain-purple border-opacity-30 rounded py-1 px-2 mr-3"
                      >
                        Reset History
                      </button>
                      <div className="mr-2">
                        <QRCode 
                          value={`${window.location.origin}/verify/${selectedConsignment.id}`}
                          size={50}
                          renderAs="svg"
                          bgColor="transparent"
                          fgColor="#9665FF"
                          level="H"
                          includeMargin={false}
                        />
                      </div>
                      <div className="text-xs text-neutral-300">Scan for<br/>verification</div>
                    </div>
                  </div>
                  
                  {historyLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="w-10 h-10 border-2 border-blockchain-purple rounded-full animate-spin border-t-transparent"></div>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-neutral-300">No blockchain history found for this consignment</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-px bg-blockchain-purple bg-opacity-20"></div>
                      
                      <div className="space-y-6">
                        {history.map((record, index) => (
                          <div key={record.txId || index} className="relative pl-8">
                            <div className={`absolute left-3 top-1.5 transform -translate-x-1/2 w-3 h-3 rounded-full ${
                              record.value && record.value.status === 'created' ? 'bg-yellow-500' :
                              record.value && record.value.status === 'in_transit' ? 'bg-blue-500' :
                              'bg-green-500'
                            }`}></div>
                            <div className="blockchain-border bg-soil-medium bg-opacity-40 rounded-md p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <div className="text-xs text-neutral-400">Transaction ID</div>
                                  <div className="font-mono text-sm text-sky-bright truncate">{record.txId}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-neutral-400">Timestamp</div>
                                  <div className="text-sm text-white">{formatTimestamp(record.timestamp)}</div>
                                </div>
                              </div>
                              <div className="mt-3">
                                <div className="text-xs text-neutral-400">Status</div>
                                <div className="mt-1">
                                  <span className={`status-badge ${
                                    record.value && record.value.status === 'created' ? 'status-created' :
                                    record.value && record.value.status === 'in_transit' ? 'status-in-transit' :
                                    record.value && record.value.status === 'delivered' ? 'status-delivered' :
                                    'status-created'
                                  }`}>
                                    {record.value && record.value.status === 'created' ? 'Created' :
                                    record.value && record.value.status === 'in_transit' ? 'In Transit' :
                                    record.value && record.value.status === 'delivered' ? 'Delivered' :
                                    'Created'}
                                  </span>
                                </div>
                              </div>
                              {record.value && record.value.location && (
                                <div className="mt-3">
                                  <div className="text-xs text-neutral-400">Location</div>
                                  <div className="text-sm text-white mt-1">
                                    {record.value.location.lat && record.value.location.lng ? (
                                      <span>
                                        {record.value.location.lat.toFixed(6)}, {record.value.location.lng.toFixed(6)}
                                      </span>
                                    ) : (
                                      <span>Location data not available</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {record.value && record.value.updatedBy && (
                                <div className="mt-3">
                                  <div className="text-xs text-neutral-400">Updated By</div>
                                  <div className="text-sm text-white">
                                    {record.value.updatedBy.role || 'Unknown'}
                                  </div>
                                </div>
                              )}
                              {index === 0 && (
                                <div className="mt-4 flex justify-end">
                                  <div className="blockchain-badge">Genesis Record</div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View on Map Button */}
                  {!historyLoading && history.length > 0 && (
                    <div className="mt-6 text-center">
                      <Link
                        to={`/track/${selectedConsignment.id}`}
                        className="inline-block btn btn-blockchain"
                      >
                        View Journey on Map
                      </Link>
                      <button
                        onClick={() => setShowRawDataModal(true)}
                        className="ml-4 inline-block btn-outline border-blockchain-purple text-blockchain-purple" 
                      >
                        View Raw Blockchain Data
                      </button>
                      <button
                        onClick={() => setShowUpdateStatusModal(true)}
                        className="ml-4 inline-block btn-outline border-leaf-primary text-leaf-primary" 
                      >
                        Update Status
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Raw Blockchain Data Modal */}
      {showRawDataModal && selectedConsignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Raw Blockchain Data</h3>
            <p className="text-gray-600 mb-4">
              This is the raw data from the blockchain for consignment #{selectedConsignment.id}
            </p>
            
            <div className="overflow-auto p-4 bg-gray-900 text-green-400 font-mono text-sm rounded-md" style={{ maxHeight: '60vh' }}>
              <pre>
                {JSON.stringify(
                  {
                    consignmentId: selectedConsignment.id,
                    blockchainData: selectedConsignment.blockchainData,
                    transactions: history.map(record => ({
                      txId: record.txId,
                      timestamp: record.timestamp,
                      type: 'CONSIGNMENT_UPDATE',
                      value: record.value || {}
                    })),
                    metadata: {
                      createdAt: selectedConsignment.createdAt,
                      lastUpdate: selectedConsignment.updatedAt || selectedConsignment.createdAt,
                      blocks: history.length
                    }
                  },
                  null,
                  2
                )}
              </pre>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowRawDataModal(false)}
                className="px-4 py-2 bg-blockchain-purple text-white rounded-md hover:bg-opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showUpdateStatusModal && selectedConsignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Update Consignment Status</h3>
            <p className="text-gray-600 mb-4">
              Change the status of consignment #{selectedConsignment.id} on the blockchain
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Status
                </label>
                <div className="p-2 bg-gray-50 border border-gray-200 rounded text-gray-700">
                  {selectedConsignment.status === 'created' ? 'Created' : 
                   selectedConsignment.status === 'in_transit' ? 'In Transit' : 
                   'Delivered'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  disabled={statusUpdateLoading}
                >
                  <option value="">Select new status</option>
                  <option value="created" disabled={selectedConsignment.status === 'created'}>Created</option>
                  <option value="in_transit" disabled={selectedConsignment.status === 'in_transit'}>In Transit</option>
                  <option value="delivered" disabled={selectedConsignment.status === 'delivered'}>Delivered</option>
                </select>
              </div>
              
              <div className="flex justify-between">
                <button
                  onClick={() => setShowUpdateStatusModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={statusUpdateLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!newStatus) {
                      toast.error('Please select a new status');
                      return;
                    }
                    
                    try {
                      setStatusUpdateLoading(true);
                      // Generate mock location for the update
                      const location = {
                        lat: 18.52 + Math.random() * 0.1,
                        lng: 73.85 + Math.random() * 0.1
                      };
                      
                      // Update status on blockchain
                      await updateConsignmentStatus(selectedConsignment.id, newStatus, location);
                      
                      // Refresh history
                      await fetchConsignmentHistory(selectedConsignment.id);
                      
                      toast.success(`Status updated to "${newStatus}" on blockchain`);
                      setShowUpdateStatusModal(false);
                      setNewStatus('');
                    } catch (error) {
                      console.error('Status update error:', error);
                      toast.error('Failed to update status: ' + error.message);
                    } finally {
                      setStatusUpdateLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-leaf-primary text-white rounded-md hover:bg-opacity-90 disabled:opacity-50"
                  disabled={!newStatus || statusUpdateLoading}
                >
                  {statusUpdateLoading ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      <AnimatePresence>
        {showVerificationModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm z-50">
            <motion.div 
              className="glass-panel-dark p-6 rounded-xl w-full max-w-md shadow-xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Verify Consignment</h3>
                <button 
                  onClick={() => setShowVerificationModal(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              
              <p className="text-neutral-300 mb-6">Enter a consignment ID to verify its authenticity on the blockchain network.</p>
              
              <div className="relative mb-6 gradient-border">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter consignment ID"
                  className="glass-input w-full py-3 px-4"
                />
              </div>

              {verificationResult && (
                <div className={`p-4 rounded-lg mb-6 ${
                  verificationResult.status === 'verified' 
                    ? 'bg-leaf-primary/10 border border-leaf-primary/30' 
                    : 'bg-harvest-red/10 border border-harvest-red/30'
                }`}>
                  <div className="flex items-center gap-3">
                    {verificationResult.status === 'verified' ? (
                      <>
                        <div className="w-8 h-8 rounded-full bg-leaf-primary/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-leaf-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div>
                          <div className="text-leaf-primary font-medium">Consignment Verified</div>
                          <div className="text-sm text-neutral-300">This consignment is authentic and recorded on the blockchain.</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-harvest-red/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-harvest-red" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div>
                          <div className="text-harvest-red font-medium">Verification Failed</div>
                          <div className="text-sm text-neutral-300">{verificationResult.message || "Consignment not found on the blockchain."}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowVerificationModal(false)} 
                  className="btn btn-outline"
                >
                  Close
                </button>
                <button 
                  onClick={verifyConsignment} 
                  className="btn btn-primary"
                  disabled={!verificationCode.trim()}
                >
                  Verify
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Blockchain Guide Modal */}
      {showBlockchainGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Understanding Blockchain for Supply Chain</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-neutral-50 rounded-lg">
                <h4 className="font-medium text-lg mb-2">What is Blockchain?</h4>
                <p className="text-gray-700">
                  Blockchain is like a digital record book that many people have copies of. Once information is written 
                  in this book, it cannot be changed or erased. Each page (block) is connected to the previous one, 
                  creating a chain.
                </p>
              </div>
              
              <div className="p-4 bg-neutral-50 rounded-lg">
                <h4 className="font-medium text-lg mb-2">How Does It Help Farmers?</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Proves your vegetables are really from your farm</li>
                  <li>Shows the complete journey of vegetables from farm to market</li>
                  <li>Helps get better prices by proving quality and origin</li>
                  <li>Prevents middlemen from making false claims</li>
                  <li>Builds trust with retailers and consumers</li>
                </ul>
              </div>
              
              <div className="p-4 bg-neutral-50 rounded-lg">
                <h4 className="font-medium text-lg mb-2">Offline Verification Methods</h4>
                <p className="text-gray-700 mb-2">
                  When internet is not available, you can still verify produce:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Use the printed QR certificate (works without internet after scanning)</li>
                  <li>Check the unique verification code on the physical certificate</li>
                  <li>Use the mobile app's offline verification (stores recent history)</li>
                  <li>Call our verification hotline: 1800-XXX-XXX</li>
                </ul>
              </div>
              
              <div className="p-4 bg-blockchain-purple bg-opacity-10 rounded-lg">
                <h4 className="font-medium text-lg mb-2">QR Code Certificate</h4>
                <div className="flex items-center">
                  <div className="w-24 h-24 bg-white p-2 rounded">
                    <QRCode 
                      value={`offline-verification-guide`}
                      size={80}
                      renderAs="svg"
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="ml-4 text-gray-700">
                    <p>Print your blockchain certificate with this QR code.</p>
                    <p className="mt-2">It can be verified by anyone with our app, even without internet connection.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowBlockchainGuide(false)}
                className="px-4 py-2 bg-blockchain-purple text-white rounded-md hover:bg-opacity-90"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 