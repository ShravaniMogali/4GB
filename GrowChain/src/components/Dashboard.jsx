import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useBlockchain } from '../contexts/BlockchainContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';


export default function Dashboard() {
  const [consignments, setConsignments] = useState([]);
  const [filteredConsignments, setFilteredConsignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, inTransit: 0, delivered: 0 });
  const [latestTransactions, setLatestTransactions] = useState([]);
  const { currentUser, getUserRole } = useAuth();
  const { getConsignmentHistory } = useBlockchain();
  const [userRole, setUserRole] = useState(null);
  const initialRender = useRef(true);
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedConsignment, setSelectedConsignment] = useState(null);

  const fetchUserRole = useCallback(async () => {
    if (currentUser) {
      const role = await getUserRole();
      setUserRole(role);
    }
  }, [currentUser, getUserRole]);

  useEffect(() => {
    if (initialRender.current) {
      fetchUserRole();
      initialRender.current = false;
    }
  }, [fetchUserRole]);

  const processConsignmentData = useCallback((consignmentList) => {
    const totalCount = consignmentList.length;
    const inTransitCount = consignmentList.filter(c => 
      c.status === 'in_transit' || 
      c.status === 'picked_up' ||
      c.status === 'assigned' ||
      c.status === 'shipped_to_retailer' ||
      c.status === 'shipped'
    ).length;
    const deliveredCount = consignmentList.filter(c => 
      c.status === 'delivered' || 
      c.status === 'delivered_to_distributor' || 
      c.status === 'received' || 
      c.status === 'completed' ||
      c.status === 'ready_for_sale' ||
      c.status === 'sold'
    ).length;

    return {
      total: totalCount,
      inTransit: inTransitCount,
      delivered: deliveredCount
    };
  }, []);

  const fetchConsignments = useCallback(async () => {
    if (!userRole) return;

    try {
      let q;
      if (userRole === 'farmer') {
        q = query(
          collection(db, 'consignments'),
          where('farmerId', '==', currentUser.uid)
        );
      } else {
        q = query(collection(db, 'consignments'));
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

      const newStats = processConsignmentData(consignmentList);
      const blockchainData = [];

      if (consignmentList.length > 0) {
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
      }

      // Batch all state updates together
      setStats(newStats);
      setConsignments(consignmentList);
      setLatestTransactions(blockchainData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching consignments:', error);
      toast.error('Failed to load consignments');
      setLoading(false);
    }
  }, [currentUser, userRole, getConsignmentHistory, processConsignmentData]);

  useEffect(() => {
    if (!initialRender.current && userRole) {
      fetchConsignments();
    }
  }, [fetchConsignments, userRole]);

  const getStatusColor = useCallback((status) => {
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
  }, []);

  const fetchVehicles = useCallback(async () => {
    if (userRole === 'transporter') {
      try {
        const vehiclesRef = collection(db, 'vehicles');
        const q = query(vehiclesRef, where('transporterId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        const vehiclesList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVehicles(vehiclesList);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        toast.error('Failed to load vehicles');
      }
    }
  }, [currentUser, userRole]);

  useEffect(() => {
    if (userRole === 'transporter') {
      fetchVehicles();
    }
  }, [fetchVehicles, userRole]);

  const handleVehicleAssignment = useCallback(async (consignmentId, vehicleId) => {
    try {
      const consignmentRef = doc(db, 'consignments', consignmentId);
      await updateDoc(consignmentRef, {
        assignedVehicleId: vehicleId,
        status: 'assigned',
        assignedAt: new Date().toISOString()
      });
      
      toast.success('Vehicle assigned successfully');
      fetchConsignments(); // Refresh consignments list
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      toast.error('Failed to assign vehicle');
    }
  }, [fetchConsignments]);

  const filterOptions = [
    { value: 'all', label: 'All Consignments' },
    { value: 'to_be_picked', label: 'To Be Picked' },
    { value: 'to_be_assigned', label: 'To Be Assigned' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'completed', label: 'Completed' }
  ];

  const transporterFilterOptions = [
    { value: 'all', label: 'All Consignments' },
    { value: 'to_be_assigned', label: 'To Be Assigned' },
    { value: 'assigned', label: 'My Assigned' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' }
  ];

  const sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'status', label: 'Status' },
    { value: 'quantity', label: 'Quantity' },
    { value: 'vehicle', label: 'Vehicle' }
  ];

  const applyFilters = useCallback(() => {
    let filtered = [...consignments];

    // Apply status filter
    if (activeFilter !== 'all') {
      if (userRole === 'transporter') {
        // Special handling for transporter's "My Assigned" filter
        if (activeFilter === 'assigned') {
          filtered = filtered.filter(consignment => 
            consignment.status === 'assigned' && 
            consignment.assignedVehicleId && 
            vehicles.some(vehicle => vehicle.id === consignment.assignedVehicleId)
          );
        } else {
          filtered = filtered.filter(consignment => consignment.status === activeFilter);
        }
      } else {
        filtered = filtered.filter(consignment => consignment.status === activeFilter);
      }
    }

    // Apply vehicle filter for transporter
    if (userRole === 'transporter' && selectedVehicle) {
      filtered = filtered.filter(consignment => consignment.assignedVehicleId === selectedVehicle);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'quantity':
          return b.quantity - a.quantity;
        case 'vehicle':
          return (a.assignedVehicleId || '').localeCompare(b.assignedVehicleId || '');
        default:
          return 0;
      }
    });

    setFilteredConsignments(filtered);
  }, [consignments, activeFilter, sortBy, selectedVehicle, userRole, vehicles]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="glass-panel-dark p-10 rounded-xl flex flex-col items-center">
          <div className="relative">
            <div className="w-16 h-16 border-2 border-leaf-primary rounded-full animate-spin border-t-transparent"></div>
            <div className="crypto-dot absolute top-0 animate-pulse"></div>
            <div className="crypto-dot absolute right-0 animate-pulse" style={{animationDelay: '0.5s'}}></div>
            <div className="crypto-dot absolute bottom-0 animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="crypto-dot absolute left-0 animate-pulse" style={{animationDelay: '1.5s'}}></div>
          </div>
          <p className="text-leaf-primary mt-4 animate-pulse">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header with Glassmorphism */}
      <motion.div
        className="glass-panel mb-8 p-8 rounded-xl relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="hex-grid absolute inset-0 opacity-20"></div>
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-leaf-primary/15 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <motion.h1 
                className="text-3xl font-bold text-soil-dark mb-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {userRole === 'farmer' ? 'Farmer Dashboard' : 'Consignment Dashboard'}
              </motion.h1>
              <motion.p 
                className="text-neutral-600 max-w-xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {userRole === 'farmer'
                  ? 'Manage and track your produce from farm to table using blockchain technology'
                  : 'Track available consignments in the supply chain with immutable blockchain records'}
              </motion.p>
            </div>
            {userRole === 'farmer' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <Link
                  to="/create-consignment"
                  className="btn btn-primary flex items-center gap-sm"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Create New Consignment
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div 
          className="glass-panel-dark relative overflow-hidden interactive-card"
          whileHover={{ y: -5 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-medium text-white">Total</h3>
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 4V20M16 4L19 7M16 4L13 7M8 20V4M8 20L5 17M8 20L11 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <p className="text-4xl font-mono font-bold mt-2 mb-1 text-white">{stats.total}</p>
            <p className="text-neutral-300">Consignments</p>
          </div>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
        </motion.div>
        
        <motion.div 
          className="glass-panel-dark bg-gradient-to-br from-blockchain-purple/80 to-soil-dark/90 backdrop-blur-md relative overflow-hidden interactive-card"
          whileHover={{ y: -5 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-medium text-white">In Transit</h3>
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 17H19M5 17C3.89543 17 3 16.1046 3 15V10C3 8.89543 3.89543 8 5 8H19C20.1046 8 21 8.89543 21 10V15C21 16.1046 20.1046 17 19 17M5 17L6 20.7329C6.2602 21.7224 7.17189 22.4201 8.20089 22.4201H15.7991C16.8281 22.4201 17.7398 21.7224 18 20.7329L19 17M9 12H15M7 3.15709C7 2.99023 7.20826 2.91904 7.30896 3.04087C8.17815 4.14724 9.84 6 12 6C14.16 6 15.8219 4.14724 16.691 3.04087C16.7917 2.91904 17 2.99023 17 3.15709V5.02391C17 5.01048 16.9991 5 16.9856 5H7.01436C7.00092 5 7 5.01048 7 5.02391V3.15709Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <p className="text-4xl font-mono font-bold mt-2 mb-1 text-white">{stats.inTransit}</p>
            <p className="text-neutral-300">On the move</p>
          </div>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blockchain-purple/20 rounded-full blur-xl"></div>
        </motion.div>
        
        <motion.div 
          className="glass-panel-dark bg-gradient-to-br from-leaf-primary/80 to-soil-dark/90 backdrop-blur-md relative overflow-hidden interactive-card"
          whileHover={{ y: -5 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-medium text-white">Delivered</h3>
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <p className="text-4xl font-mono font-bold mt-2 mb-1 text-white">{stats.delivered}</p>
            <p className="text-neutral-300">Completed deliveries</p>
          </div>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-leaf-primary/20 rounded-full blur-xl"></div>
        </motion.div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Consignments List */}
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-medium text-soil-dark">Consignments</h2>
            <div className="flex flex-wrap gap-2">
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="select select-bordered select-sm"
              >
                {(userRole === 'transporter' ? transporterFilterOptions : filterOptions).map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {userRole === 'transporter' && vehicles.length > 0 && (
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="select select-bordered select-sm"
                >
                  <option value="">All Vehicles</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicleNumber} - {vehicle.vehicleType}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="select select-bordered select-sm"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    Sort by: {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {filteredConsignments.length === 0 ? (
            <motion.div 
              className="glass-panel flex flex-col items-center justify-center p-12 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="w-16 h-16 mb-4 rounded-full bg-neutral-100/50 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 4V20M16 4L19 7M16 4L13 7M8 20V4M8 20L5 17M8 20L11 17" stroke="var(--neutral-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">No consignments found</h3>
              <p className="text-neutral-500 mb-6">
                {userRole === 'farmer' 
                  ? "You haven't created any consignments yet"
                  : "No consignments match the current filter"}
              </p>
              {userRole === 'farmer' && (
                <Link to="/create-consignment" className="btn btn-primary">
                  Create Your First Consignment
                </Link>
              )}
            </motion.div>
          ) : (
            <div className="space-y-4">
              <div className="hidden sm:grid grid-cols-12 bg-neutral-100/50 backdrop-blur-sm p-4 rounded-t-lg">
                <div className="col-span-4 font-medium text-sm text-neutral-700">Product</div>
                <div className="col-span-2 font-medium text-sm text-neutral-700">Quantity</div>
                <div className="col-span-2 font-medium text-sm text-neutral-700">Status</div>
                <div className="col-span-2 font-medium text-sm text-neutral-700">Date</div>
                <div className="col-span-2 font-medium text-sm text-neutral-700 text-right">Actions</div>
              </div>
              
              {filteredConsignments.map((consignment, index) => (
                <motion.div 
                  key={consignment.id}
                  className="glass-panel sm:grid grid-cols-12 gap-4 p-4 items-center hover:shadow-md transition-shadow"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className="col-span-4 mb-2 sm:mb-0">
                    <div className="font-medium">{consignment.vegetableName}</div>
                    <div className="text-sm text-neutral-500">{consignment.farmerName}</div>
                  </div>
                  <div className="col-span-2 text-sm">
                    {consignment.quantity} {consignment.unit || 'kg'}
                  </div>
                  <div className="col-span-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(consignment.status)}`}>
                      {consignment.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="col-span-2 text-sm text-neutral-500">
                    {consignment.createdAt ? new Date(consignment.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <Link
                      to={`/consignment/${consignment.id}`}
                      className="btn btn-sm btn-outline bg-white/50"
                    >
                      View
                    </Link>
                    <Link
                      to={`/track/${consignment.id}`}
                      className="btn btn-sm btn-outline-leaf"
                    >
                      Track
                    </Link>
                    {userRole === 'transporter' && consignment.status === 'to_be_assigned' && (
                      <button
                        onClick={() => {
                          setSelectedConsignment(consignment.id);
                          // Show vehicle assignment modal or dropdown
                        }}
                        className="btn btn-sm btn-primary"
                      >
                        Assign
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        
        {/* Right Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Vehicle Assignment Modal */}
          {userRole === 'transporter' && selectedConsignment && (
            <motion.div 
              className="glass-panel p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h2 className="text-xl font-medium text-soil-dark mb-4">Assign Vehicle</h2>
              <div className="space-y-4">
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicleNumber} - {vehicle.vehicleType}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (selectedVehicle) {
                        handleVehicleAssignment(selectedConsignment, selectedVehicle);
                        setSelectedConsignment(null);
                      }
                    }}
                    className="btn btn-primary flex-1"
                  >
                    Assign
                  </button>
                  <button
                    onClick={() => setSelectedConsignment(null)}
                    className="btn btn-outline flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}


          {/* Blockchain Activity Section */}
          <div>
            <h2 className="text-xl font-medium text-soil-dark mb-4">Blockchain Activity</h2>
            
            {latestTransactions.length > 0 ? (
              <div className="space-y-4">
                {latestTransactions.map((tx, index) => (
                  <motion.div 
                    key={tx.id}
                    className="glass-panel-dark p-4 relative overflow-hidden"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 * index }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-8 h-8 rounded-full bg-blockchain-purple/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-blockchain-purple" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 16V14C20 12.8954 19.1046 12 18 12H14M10 12H6C4.89543 12 4 12.8954 4 14V16M14 8H18C19.1046 8 20 8.89543 20 10V12M4 12V10C4 8.89543 4.89543 8 6 8H10M12 3V21M8 7L12 3L16 7M16 17L12 21L8 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{tx.name}</div>
                        <div className="text-xs text-neutral-400 mt-1">
                          {tx.transaction?.timestamp ? new Date(tx.transaction.timestamp).toLocaleString() : 'N/A'}
                        </div>
                        <div className="text-xs mono-text text-blockchain-cyan mt-2">
                          {tx.transaction?.transactionId 
                            ? `0x${tx.transaction.transactionId.substring(0, 6)}...${tx.transaction.transactionId.substring(tx.transaction.transactionId.length - 4)}`
                            : 'No transaction ID'
                          }
                        </div>
                      </div>
                    </div>
                    <div className="absolute -right-5 -bottom-5 w-12 h-12 rounded-full bg-blockchain-purple/10 blur-xl"></div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div 
                className="glass-panel-dark p-6 text-center"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blockchain-purple/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blockchain-purple" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-neutral-300 text-sm">No blockchain transactions found</p>
                <Link 
                  to="/blockchain"
                  className="mt-4 inline-block text-xs font-medium text-blockchain-purple"
                >
                  Visit Blockchain Dashboard
                </Link>
              </motion.div>
            )}
          </div>
          
          <Link
            to="/blockchain"
            className="glass-panel-dark p-6 block text-center hover:shadow-blockchain transition-shadow"
          >
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blockchain-purple/20 flex items-center justify-center animate-pulse">
              <svg className="w-6 h-6 text-blockchain-purple" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 16V14C20 12.8954 19.1046 12 18 12H14M10 12H6C4.89543 12 4 12.8954 4 14V16M14 8H18C19.1046 8 20 8.89543 20 10V12M4 12V10C4 8.89543 4.89543 8 6 8H10M12 3V21M8 7L12 3L16 7M16 17L12 21L8 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Blockchain Dashboard</h3>
            <p className="text-neutral-300 text-sm mb-4">
              View detailed blockchain records and verify consignments
            </p>
            <span className="inline-flex items-center text-xs font-medium text-blockchain-purple">
              Explore Now
              <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}