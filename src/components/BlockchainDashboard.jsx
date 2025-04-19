import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useBlockchain } from '../contexts/BlockchainContext';
import toast from 'react-hot-toast';
import QRCode from 'qrcode.react';
import { Link } from 'react-router-dom';

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
  const { getConsignmentHistory, verifyConsignmentOnBlockchain, checkBlockchainHealth } = useBlockchain();

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
  }, [getConsignmentHistory]);

  const fetchConsignmentHistory = async (consignmentId) => {
    try {
      setHistoryLoading(true);
      const blockchainHistory = await getConsignmentHistory(consignmentId);
      setHistory(blockchainHistory || []);
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
      const result = await verifyConsignmentOnBlockchain(verificationCode);
      
      if (result && result.verified) {
        setVerificationResult({
          status: 'verified',
          data: result.data
        });
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
    
    // Generate verification certificate
    const certificateData = {
      id: selectedConsignment.id,
      vegetableName: selectedConsignment.vegetableName,
      farmer: selectedConsignment.farmerName || 'Unknown',
      transactionId: selectedConsignment.blockchainData?.transactionId,
      timestamp: selectedConsignment.blockchainData?.timestamp,
      verificationUrl: `${window.location.origin}/verify/${selectedConsignment.id}`
    };
    
    // In a real implementation, this would generate PDF/Image
    // For now, we'll just download JSON data
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(certificateData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `certificate-${selectedConsignment.id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    toast.success('Certificate downloaded successfully');
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
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="heading-2 text-soil-dark mb-2">Blockchain Dashboard</h1>
        <p className="body text-neutral-600">
          View and verify the immutable transaction history of all consignments in the blockchain
        </p>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button 
          onClick={() => setShowVerificationModal(true)}
          className="btn btn-blockchain p-4 text-left flex items-center"
        >
          <div className="crypto-dot mr-3"></div>
          <div>
            <span className="block font-bold">Verify Consignment</span>
            <span className="text-sm text-white opacity-80">Check authenticity of a consignment</span>
          </div>
        </button>
        
        <button 
          onClick={checkOfflineVerification}
          className="btn-outline p-4 text-left flex items-center border border-blockchain-purple text-blockchain-purple rounded-md hover:bg-soil-light transition-colors"
        >
          <div className="crypto-dot mr-3 bg-blockchain-purple"></div>
          <div>
            <span className="block font-bold">Offline Verification</span>
            <span className="text-sm opacity-80">Check methods for offline verification</span>
          </div>
        </button>
        
        <button 
          onClick={() => setShowBlockchainGuide(true)}
          className="btn-outline p-4 text-left flex items-center border border-leaf-primary text-leaf-primary rounded-md hover:bg-soil-light transition-colors"
        >
          <div className="crypto-dot mr-3 bg-leaf-primary"></div>
          <div>
            <span className="block font-bold">Blockchain Guide</span>
            <span className="text-sm opacity-80">Learn how blockchain works</span>
          </div>
        </button>
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
                          <div key={record.txId} className="relative pl-8">
                            <div className="absolute left-3 top-1.5 transform -translate-x-1/2 w-3 h-3 rounded-full bg-blockchain-purple"></div>
                            
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
                                    record.value.status === 'created' ? 'status-created' : 
                                    record.value.status === 'in_transit' ? 'status-in-transit' : 'status-delivered'
                                  }`}>
                                    {record.value.status === 'created' ? 'Created' : 
                                    record.value.status === 'in_transit' ? 'In Transit' : 'Delivered'}
                                  </span>
                                </div>
                              </div>
                              
                              {record.value.location && (
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
                              
                              {record.value.updatedBy && (
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
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Verify Consignment</h3>
            <p className="text-gray-600 mb-4">
              Enter the consignment ID to verify its authenticity on the blockchain
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consignment ID
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter consignment ID"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              
              {verificationResult && (
                <div className={`p-4 rounded ${
                  verificationResult.status === 'verified' ? 'bg-green-50 border border-green-200' :
                  verificationResult.status === 'checking' ? 'bg-blue-50 border border-blue-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                  {verificationResult.status === 'checking' ? (
                    <div className="flex items-center">
                      <div className="animate-spin h-5 w-5 mr-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <p>Verifying...</p>
                    </div>
                  ) : verificationResult.status === 'verified' ? (
                    <div>
                      <p className="font-medium text-green-800">Verified on Blockchain!</p>
                      {verificationResult.data && (
                        <div className="mt-2 text-sm">
                          <p>Vegetable: {verificationResult.data.vegetableName}</p>
                          <p>Status: {verificationResult.data.status}</p>
                          <p>Last Updated: {formatTimestamp(verificationResult.data.timestamp)}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-red-800">{verificationResult.message}</p>
                  )}
                </div>
              )}
              
              <div className="flex justify-between">
                <button
                  onClick={() => setShowVerificationModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={verifyConsignment}
                  className="px-4 py-2 bg-blockchain-purple text-white rounded-md hover:bg-opacity-90"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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