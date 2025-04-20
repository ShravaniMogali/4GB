import { useState, useEffect } from 'react';
import { useBlockchain } from '../contexts/BlockchainContext';
import { Link } from 'react-router-dom';

export default function BlockchainDataExplorer() {
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [blockData, setBlockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blockLoading, setBlockLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const { checkBlockchainHealth } = useBlockchain();

  // Fetch recent blocks
  useEffect(() => {
    async function fetchRecentBlocks() {
      setLoading(true);
      try {
        // Simulate blockchain data since we don't have direct blockchain access in the mock
        const mockBlocks = Array.from({ length: 10 }, (_, i) => ({
          id: (1000000 + i).toString(),
          hash: `0x${Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}...`,
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
          transactionCount: Math.floor(Math.random() * 5) + 1
        }));
        
        setBlocks(mockBlocks);
        if (mockBlocks.length > 0) {
          setSelectedBlock(mockBlocks[0]);
          fetchBlockDetails(mockBlocks[0].id);
        }
      } catch (error) {
        console.error('Error fetching blockchain data:', error);
        setErrorMessage('Failed to load blockchain data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchRecentBlocks();
  }, []);

  const fetchBlockDetails = async (blockId) => {
    setBlockLoading(true);
    try {
      // For demo purposes, generate mock data
      const transactions = Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, i) => ({
        id: `tx-${blockId}-${i}`,
        hash: `0x${Array.from({ length: 10 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}...`,
        from: `0x${Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}...`,
        to: `0x${Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}...`,
        value: parseFloat((Math.random() * 0.1).toFixed(4)),
        timestamp: new Date(Date.now() - Math.random() * 50000).toISOString()
      }));
      
      const mockBlockData = {
        id: blockId,
        hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        previousHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        timestamp: new Date(Date.now() - Math.random() * 100000).toISOString(),
        transactions,
        size: Math.floor(Math.random() * 50) + 10 + 'KB',
        nonce: Math.floor(Math.random() * 1000000),
        difficulty: Math.floor(Math.random() * 100)
      };
      
      setBlockData(mockBlockData);
    } catch (error) {
      console.error('Error fetching block details:', error);
      setErrorMessage('Failed to load block details');
    } finally {
      setBlockLoading(false);
    }
  };

  const handleBlockSelect = (block) => {
    setSelectedBlock(block);
    fetchBlockDetails(block.id);
  };

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

  if (errorMessage) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="card p-8">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="heading-3 text-soil-dark mb-4">Error Loading Blockchain Data</h2>
          <p className="text-neutral-600 mb-6">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-blockchain"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="heading-2 text-soil-dark mb-2">Blockchain Data Explorer</h1>
        <p className="body text-neutral-600">
          Explore the raw blockchain data and transaction history
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Blocks List */}
        <div className="card overflow-hidden">
          <div className="bg-neutral-100 p-4 border-b border-neutral-200">
            <h2 className="heading-4 text-soil-dark">Recent Blocks</h2>
            <p className="text-sm text-neutral-600">Select a block to view details</p>
          </div>
          
          <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
            <ul className="divide-y divide-neutral-200">
              {blocks.map((block) => (
                <li
                  key={block.id}
                  onClick={() => handleBlockSelect(block)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedBlock && selectedBlock.id === block.id
                      ? 'bg-sky-light'
                      : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-soil-dark">Block #{block.id}</h3>
                      <p className="font-mono text-xs text-neutral-600 mt-1">
                        {block.hash}
                      </p>
                    </div>
                    <div className="blockchain-badge">
                      {block.transactionCount} TXs
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-neutral-500">
                    {new Date(block.timestamp).toLocaleTimeString()}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Block Details */}
        <div className="lg:col-span-2">
          <div className="card-blockchain overflow-hidden">
            {!selectedBlock ? (
              <div className="p-8 text-center">
                <p className="text-neutral-300">Select a block to view details</p>
              </div>
            ) : blockLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-10 h-10 border-2 border-blockchain-purple rounded-full animate-spin border-t-transparent"></div>
              </div>
            ) : (
              <div>
                <div className="p-5 bg-soil-dark border-b border-blockchain-purple border-opacity-20">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white heading-3">Block #{blockData.id}</div>
                      <div className="flex items-center mt-1">
                        <div className="text-neutral-300 mr-1">Hash:</div>
                        <div className="font-mono text-sky-bright text-sm truncate max-w-xs">
                          {blockData.hash}
                        </div>
                      </div>
                    </div>
                    <div className="blockchain-badge">
                      {blockData.transactions.length} Transactions
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <div className="text-xs text-neutral-400">Previous Block</div>
                      <div className="font-mono text-sm text-white truncate">{blockData.previousHash.substring(0, 20)}...</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-400">Timestamp</div>
                      <div className="text-sm text-white">
                        {new Date(blockData.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-400">Size</div>
                      <div className="text-sm text-white">{blockData.size}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-400">Nonce</div>
                      <div className="text-sm text-white">{blockData.nonce}</div>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="heading-4 text-white mb-4">Transactions</h3>
                  
                  {blockData.transactions.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-neutral-300">No transactions in this block</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {blockData.transactions.map((tx) => (
                        <div key={tx.id} className="blockchain-border bg-soil-medium bg-opacity-40 rounded-md p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-neutral-400">Transaction Hash</div>
                              <div className="font-mono text-sm text-sky-bright truncate">{tx.hash}</div>
                            </div>
                            <div>
                              <div className="text-xs text-neutral-400">Timestamp</div>
                              <div className="text-sm text-white">{new Date(tx.timestamp).toLocaleTimeString()}</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                            <div>
                              <div className="text-xs text-neutral-400">From</div>
                              <div className="font-mono text-sm text-white">{tx.from}</div>
                            </div>
                            <div>
                              <div className="text-xs text-neutral-400">To</div>
                              <div className="font-mono text-sm text-white">{tx.to}</div>
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <div className="text-xs text-neutral-400">Value</div>
                            <div className="text-sm text-white">{tx.value} ETH</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/blockchain-dashboard"
              className="inline-block btn btn-outline-dark"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 