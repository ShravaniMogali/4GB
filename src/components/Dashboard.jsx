import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useBlockchain } from '../contexts/BlockchainContext';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [consignments, setConsignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, inTransit: 0, delivered: 0 });
  const [latestTransactions, setLatestTransactions] = useState([]);
  const { currentUser, getUserRole } = useAuth();
  const { getConsignmentHistory } = useBlockchain();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (currentUser) {
        const role = await getUserRole();
        setUserRole(role);
      }
    };
    fetchUserRole();
  }, [currentUser, getUserRole]);

  useEffect(() => {
    const fetchConsignments = async () => {
      if (!userRole) return;

      try {
        setLoading(true);
        let q;
        if (userRole === 'farmer') {
          q = query(
            collection(db, 'consignments'),
            where('farmerId', '==', currentUser.uid)
          );
        } else {
          q = query(
            collection(db, 'consignments')
          );
        }

        const querySnapshot = await getDocs(q);
        let consignmentList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        consignmentList = consignmentList.sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const totalCount = consignmentList.length;
        const inTransitCount = consignmentList.filter(c => 
          c.status === 'in_transit' || 
          c.status === 'picked_up' ||
          c.status === 'assigned' ||
          c.status === 'shipped_to_retailer'
        ).length;
        const deliveredCount = consignmentList.filter(c => 
          c.status === 'delivered' || 
          c.status === 'delivered_to_distributor' || 
          c.status === 'received' || 
          c.status === 'completed' ||
          c.status === 'ready_for_sale' ||
          c.status === 'sold'
        ).length;

        setStats({
          total: totalCount,
          inTransit: inTransitCount,
          delivered: deliveredCount
        });

        setConsignments(consignmentList);

        if (consignmentList.length > 0) {
          const blockchainData = [];
          const recentConsignments = consignmentList
            .filter(c => c.blockchainData && c.blockchainData.transactionId)
            .slice(0, 3);
          
          for (const consignment of recentConsignments) {
            try {
              const history = await getConsignmentHistory(consignment.id);
              if (history && history.length > 0) {
                blockchainData.push({
                  id: consignment.id,
                  name: consignment.vegetableName,
                  transaction: history[history.length - 1]
                });
              }
            } catch (error) {
              console.error('Error fetching blockchain data:', error);
            }
          }
          
          setLatestTransactions(blockchainData);
        }
      } catch (error) {
        console.error('Error fetching consignments:', error);
        toast.error('Failed to load consignments');
      } finally {
        setLoading(false);
      }
    };

    fetchConsignments();
  }, [currentUser, userRole, getConsignmentHistory]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'created':
        return 'status-created';
      case 'in_transit':
        return 'status-in-transit';
      case 'delivered':
        return 'status-delivered';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-leaf-primary rounded-full animate-spin border-t-transparent"></div>
          <div className="crypto-dot absolute top-0 animate-pulse"></div>
          <div className="crypto-dot absolute right-0 animate-pulse" style={{animationDelay: '0.5s'}}></div>
          <div className="crypto-dot absolute bottom-0 animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="crypto-dot absolute left-0 animate-pulse" style={{animationDelay: '1.5s'}}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
        <div>
          <h1 className="heading-2 text-soil-dark mb-2">
            {userRole === 'farmer' ? 'Farmer Dashboard' : 'Consignment Dashboard'}
          </h1>
          <p className="body text-neutral-600">
            {userRole === 'farmer'
              ? 'Manage and track your produce from farm to table'
              : 'Track available consignments in the supply chain'}
          </p>
        </div>
        {userRole === 'farmer' && (
          <Link
            to="/create-consignment"
            className="btn btn-primary flex items-center gap-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Create New Consignment
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 bg-gradient-to-br from-soil-medium to-soil-dark text-white">
          <div className="flex items-center justify-between">
            <h3 className="heading-3 text-white">Total</h3>
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white bg-opacity-10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 4V20M16 4L19 7M16 4L13 7M8 20V4M8 20L5 17M8 20L11 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="display-2 mt-2 mb-1">{stats.total}</p>
          <p className="text-neutral-300">Consignments</p>
        </div>
        
        <div className="card p-6 bg-gradient-to-br from-blockchain-purple to-blockchain-blue text-white">
          <div className="flex items-center justify-between">
            <h3 className="heading-3 text-white">In Transit</h3>
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white bg-opacity-10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 17H19M5 17C3.89543 17 3 16.1046 3 15V10C3 8.89543 3.89543 8 5 8H19C20.1046 8 21 8.89543 21 10V15C21 16.1046 20.1046 17 19 17M5 17L6 20.7329C6.2602 21.7224 7.17189 22.4201 8.20089 22.4201H15.7991C16.8281 22.4201 17.7398 21.7224 18 20.7329L19 17M9 12H15M7 3.15709C7 2.99023 7.20826 2.91904 7.30896 3.04087C8.17815 4.14724 9.84 6 12 6C14.16 6 15.8219 4.14724 16.691 3.04087C16.7917 2.91904 17 2.99023 17 3.15709V5.02391C17 5.01048 16.9991 5 16.9856 5H7.01436C7.00092 5 7 5.01048 7 5.02391V3.15709Z" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <p className="display-2 mt-2 mb-1">{stats.inTransit}</p>
          <p className="text-neutral-300">Consignments on the move</p>
        </div>
        
        <div className="card p-6 bg-gradient-to-br from-leaf-light to-leaf-primary text-white">
          <div className="flex items-center justify-between">
            <h3 className="heading-3 text-white">Delivered</h3>
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white bg-opacity-10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="display-2 mt-2 mb-1">{stats.delivered}</p>
          <p className="text-neutral-300">Consignments delivered</p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Consignments List */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-3 text-soil-dark">Recent Consignments</h2>
            {consignments.length > 5 && (
              <Link to="/all-consignments" className="text-blockchain-purple font-medium text-sm">
                View All
              </Link>
            )}
          </div>
          
          <div className="card overflow-hidden">
            {consignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 4V20M16 4L19 7M16 4L13 7M8 20V4M8 20L5 17M8 20L11 17" stroke="var(--neutral-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="heading-4 mb-2">No consignments found</h3>
                <p className="text-neutral-500 mb-4">
                  {userRole === 'farmer' 
                    ? "You haven't created any consignments yet"
                    : "No consignments are available for tracking"}
                </p>
                {userRole === 'farmer' && (
                  <Link to="/create-consignment" className="btn btn-primary">
                    Create Your First Consignment
                  </Link>
                )}
              </div>
            ) : (
              <div>
                <div className="hidden sm:grid grid-cols-12 bg-neutral-100 p-4 border-b border-neutral-200">
                  <div className="col-span-4 font-medium text-sm text-neutral-700">Product</div>
                  <div className="col-span-2 font-medium text-sm text-neutral-700">Quantity</div>
                  <div className="col-span-2 font-medium text-sm text-neutral-700">Status</div>
                  <div className="col-span-2 font-medium text-sm text-neutral-700">Date</div>
                  <div className="col-span-2 font-medium text-sm text-neutral-700 text-right">Action</div>
                </div>
                <ul className="divide-y divide-neutral-200">
                  {consignments.slice(0, 5).map((consignment) => (
                    <li key={consignment.id} className="hover:bg-neutral-50 transition-colors">
                      <div className="grid sm:grid-cols-12 gap-2 p-4">
                        <div className="sm:col-span-4">
                          <Link to={`/consignment/${consignment.id}`} className="font-medium text-soil-dark hover:text-leaf-primary transition-colors">
                            {consignment.vegetableName}
                          </Link>
                          <div className="text-sm text-neutral-500 mt-1 sm:hidden">
                            {new Date(consignment.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="sm:col-span-2 text-neutral-700">
                          <span className="sm:hidden font-medium text-neutral-500">Quantity: </span>
                          {consignment.quantity} {consignment.unit}
                        </div>
                        
                        <div className="sm:col-span-2">
                          <span className="sm:hidden font-medium text-neutral-500">Status: </span>
                          <span className={`status-badge ${getStatusColor(consignment.status)}`}>
                            {consignment.status === 'in_transit' ? 'In Transit' : 
                             consignment.status === 'created' ? 'Created' : 'Delivered'}
                          </span>
                        </div>
                        
                        <div className="hidden sm:block sm:col-span-2 text-neutral-700">
                          {new Date(consignment.createdAt).toLocaleDateString()}
                        </div>
                        
                        <div className="sm:col-span-2 text-right">
                          <div className="flex sm:justify-end gap-2">
                            <Link 
                              to={`/consignment/${consignment.id}`}
                              className="btn btn-sm btn-outline"
                            >
                              View
                            </Link>
                            <Link 
                              to={`/track/${consignment.id}`}
                              className="btn btn-sm btn-outline-leaf"
                            >
                              Track
                            </Link>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        {/* Blockchain Transactions & Insights */}
        <div>
          <h2 className="heading-3 text-soil-dark mb-4">Blockchain Insights</h2>
          
          <div className="card-blockchain p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Latest Transactions</h3>
              <div className="blockchain-badge">Verified</div>
            </div>
            
            {latestTransactions.length === 0 ? (
              <div className="py-6 text-center text-neutral-300">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-soil-light flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#9665FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9.08997 8.99996C9.32507 8.33163 9.789 7.76807 10.3998 7.40909C11.0106 7.05012 11.7287 6.9189 12.427 7.03867C13.1253 7.15844 13.7587 7.52148 14.2149 8.06349C14.6712 8.60549 14.9209 9.29148 14.92 9.99996C14.92 12 11.92 13 11.92 13" stroke="#9665FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 17H12.01" stroke="#9665FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p>No blockchain transactions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {latestTransactions.map((tx, index) => (
                  <div key={tx.id} className="blockchain-border bg-soil-medium bg-opacity-80 rounded-md p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-sm text-neutral-300">Consignment ID</span>
                        <h4 className="font-mono text-sky-bright truncate" style={{maxWidth: '130px'}}>
                          {tx.id}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="crypto-dot"></span>
                        <span className="text-xs text-white">VERIFIED</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-sm text-neutral-300">Transaction</span>
                      <p className="font-mono text-xs text-white opacity-80 truncate">
                        {tx.transaction.txId}
                      </p>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <div>
                        <span className="text-sm text-neutral-300">Product</span>
                        <p className="text-white">{tx.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-neutral-300">Timestamp</span>
                        <p className="text-white">
                          {new Date(tx.transaction.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4">
              <Link to="/blockchain" className="btn btn-blockchain w-full">
                View All Blockchain Data
              </Link>
            </div>
          </div>
          
          <div className="card p-6">
            <h3 className="heading-4 mb-4">Scan QR Code</h3>
            <p className="text-neutral-600 mb-4">
              Scan a consignment QR code to instantly track and verify its journey 
              from farm to table.
            </p>
            <Link to="/scan" className="btn btn-harvest w-full">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                <path d="M3 7V5C3 3.89543 3.89543 3 5 3H7M17 3H19C20.1046 3 21 3.89543 21 5V7M21 17V19C21 20.1046 20.1046 21 19 21H17M7 21H5C3.89543 21 3 20.1046 3 19V17M8 7H16M8 12H16M8 17H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Scan QR Code
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 