import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useBlockchain } from '../../contexts/BlockchainContext';
import toast from 'react-hot-toast';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { Link } from 'react-router-dom';

const CONSIGNMENT_STATUS = {
  DELIVERED_TO_DISTRIBUTOR: 'delivered_to_distributor',
  RECEIVED: 'received',
  QUALITY_CHECKED: 'quality_checked',
  STORED: 'stored',
  PROCESSING: 'processing',
  READY_FOR_RETAIL: 'ready_for_retail',
  SHIPPED_TO_RETAILER: 'shipped_to_retailer',
  COMPLETED: 'completed',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  CREATED: 'created'
};

const TABS = {
  INCOMING: 'incoming',
  PROCESSING: 'processing',
  OUTGOING: 'outgoing',
  HISTORY: 'history'
};

export default function DistributorDashboard() {
  const [activeTab, setActiveTab] = useState(TABS.INCOMING);
  const [consignments, setConsignments] = useState([]);
  const [historyConsignments, setHistoryConsignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedConsignment, setSelectedConsignment] = useState(null);
  const [retailers, setRetailers] = useState([]);
  const [showRetailerDialog, setShowRetailerDialog] = useState(false);
  const [selectedRetailerId, setSelectedRetailerId] = useState('');
  const { currentUser } = useAuth();
  const { updateConsignmentStatus: updateBlockchainStatus, createConsignmentOnBlockchain } = useBlockchain();

  useEffect(() => {
    fetchConsignments();
    fetchHistoryConsignments();
    fetchRetailers();
  }, [currentUser, activeTab]);

  const fetchConsignments = async () => {
    try {
      setLoading(true);
      
      let statusFilter;
      switch (activeTab) {
        case TABS.INCOMING:
          statusFilter = [CONSIGNMENT_STATUS.COMPLETED];
          break;
        case TABS.PROCESSING:
          statusFilter = [CONSIGNMENT_STATUS.PROCESSING];
          break;
        case TABS.OUTGOING:
          statusFilter = [
            CONSIGNMENT_STATUS.READY_FOR_RETAIL,
            CONSIGNMENT_STATUS.SHIPPED_TO_RETAILER
          ];
          break;
        default:
          statusFilter = [];
      }
      
      const q = query(
        collection(db, 'consignments'),
        where('distributorId', '==', currentUser.uid),
        where('status', 'in', statusFilter)
      );

      const querySnapshot = await getDocs(q);
      const consignmentList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setConsignments(consignmentList);
    } catch (error) {
      console.error('Error fetching consignments:', error);
      toast.error('Failed to load consignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryConsignments = async () => {
    try {
      setHistoryLoading(true);
      
      const q = query(
        collection(db, 'consignments'),
        where('distributorId', '==', currentUser.uid),
        where('status', 'in', [
          CONSIGNMENT_STATUS.PROCESSING,
          CONSIGNMENT_STATUS.READY_FOR_RETAIL,
          CONSIGNMENT_STATUS.SHIPPED_TO_RETAILER,
          CONSIGNMENT_STATUS.COMPLETED
        ])
      );

      const querySnapshot = await getDocs(q);
      const consignmentList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      consignmentList.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });

      setHistoryConsignments(consignmentList);
    } catch (error) {
      console.error('Error fetching history consignments:', error);
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchRetailers = async () => {
    try {
      console.log('Fetching retailers...');
      // First, let's get all users to see what roles exist
      const allUsersQuery = query(collection(db, 'users'));
      const allUsersSnapshot = await getDocs(allUsersQuery);
      console.log('All users in database:', allUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      // Now query for retailers specifically
      const retailerQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['retailer', 'RETAILER', 'Retailer'])
      );
      const retailerSnapshot = await getDocs(retailerQuery);
      console.log('Retailer query snapshot:', retailerSnapshot.size, 'documents found');
      const retailerList = retailerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Retailer list with details:', retailerList.map(retailer => ({
        id: retailer.id,
        name: retailer.name,
        storeName: retailer.storeName,
        storeAddress: retailer.storeAddress,
        address: retailer.address,
        role: retailer.role
      })));
      if (retailerList.length === 0) {
        console.log('No retailers found in the database. Please ensure retailers have registered.');
        toast.error('No retailers found. Please ensure retailers have registered.');
      }
      setRetailers(retailerList);
    } catch (error) {
      console.error('Error fetching retailers:', error);
      toast.error('Failed to load retailers');
    }
  };

  const handleRetailerSelect = async (consignmentId) => {
    if (!selectedRetailerId) {
      toast.error('Please select a retailer');
      return;
    }

    const consignment = consignments.find(c => c.id === consignmentId);
    const retailer = retailers.find(r => r.id === selectedRetailerId);

    const updateData = {
      retailerId: selectedRetailerId,
      retailerName: retailer.storeName || retailer.name
    };

    const consignmentRef = doc(db, 'consignments', consignmentId);
    await updateDoc(consignmentRef, updateData);

    setShowRetailerDialog(false);
    setSelectedRetailerId('');
    toast.success('Retailer selected successfully');
    updateConsignmentStatus(consignmentId, CONSIGNMENT_STATUS.SHIPPED_TO_RETAILER);
  };

  const updateConsignmentStatus = async (consignmentId, newStatus) => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      const consignment = consignments.find(c => c.id === consignmentId);
      
      const statusUpdate = {
        status: newStatus,
        timestamp: new Date().toISOString(),
        location,
        updatedBy: {
          id: currentUser.uid,
          role: 'distributor'
        }
      };

      const updateData = {
        status: newStatus,
        currentLocation: location,
        trackingHistory: [...(consignment.trackingHistory || []), statusUpdate]
      };

      if (newStatus === CONSIGNMENT_STATUS.SHIPPED_TO_RETAILER) {
        if (!selectedRetailerId) {
          toast.error('Please select a retailer before shipping');
          return;
        }
        const retailer = retailers.find(r => r.id === selectedRetailerId);
        updateData.retailerId = selectedRetailerId;
        updateData.retailerName = retailer.storeName || retailer.name;
      }

      const consignmentRef = doc(db, 'consignments', consignmentId);
      await updateDoc(consignmentRef, updateData);
      
      try {
        // First try to update the status
        await updateBlockchainStatus(consignmentId, newStatus, location);
        toast.success('Status updated on blockchain');
      } catch (blockchainError) {
        console.error('Blockchain update error:', blockchainError);
        
        if (blockchainError.message && blockchainError.message.includes('not found')) {
          try {
            // Prepare data for blockchain
            const blockchainConsignmentData = {
              id: consignmentId,
              vegetableName: consignment.vegetableName,
              quantity: consignment.quantity,
              unit: consignment.unit,
              quality: consignment.quality,
              farmerId: consignment.farmerId,
              distributorId: consignment.distributorId,
              retailerId: selectedRetailerId,
              status: newStatus,
              location: location,
              timestamp: new Date().toISOString(),
              updatedBy: currentUser.uid
            };
            
            // Register the consignment in the blockchain
            const result = await createConsignmentOnBlockchain(blockchainConsignmentData);
            
            // Update Firebase with blockchain transaction ID
            await updateDoc(consignmentRef, {
              'blockchainData.transactionId': result.transactionId,
              'blockchainData.timestamp': result.timestamp
            });
            
            toast.success('Consignment registered on blockchain and status updated');
          } catch (registerError) {
            console.error('Error registering consignment on blockchain:', registerError);
            toast.error('Failed to register on blockchain, but database was updated');
          }
        } else {
          toast.error('Failed to update blockchain but database was updated');
        }
      }
      
      toast.success('Status updated successfully');
      fetchConsignments();
      fetchHistoryConsignments();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusActions = (status) => {
    switch (status) {
      case CONSIGNMENT_STATUS.DELIVERED_TO_DISTRIBUTOR:
      case CONSIGNMENT_STATUS.COMPLETED:
        return { 
          next: CONSIGNMENT_STATUS.PROCESSING, 
          label: 'Move to Processing',
          showTrack: true
        };
      case CONSIGNMENT_STATUS.PROCESSING:
        return { 
          next: CONSIGNMENT_STATUS.READY_FOR_RETAIL, 
          label: 'Move to Outgoing',
          showTrack: true
        };
      case CONSIGNMENT_STATUS.READY_FOR_RETAIL:
        return { 
          next: CONSIGNMENT_STATUS.SHIPPED_TO_RETAILER, 
          label: 'Ship to Retailer',
          showTrack: true
        };
      default:
        return null;
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case CONSIGNMENT_STATUS.DELIVERED_TO_DISTRIBUTOR:
        return 'bg-yellow-100 text-yellow-800';
      case CONSIGNMENT_STATUS.RECEIVED:
        return 'bg-blue-100 text-blue-800';
      case CONSIGNMENT_STATUS.QUALITY_CHECKED:
        return 'bg-green-100 text-green-800';
      case CONSIGNMENT_STATUS.STORED:
        return 'bg-indigo-100 text-indigo-800';
      case CONSIGNMENT_STATUS.PROCESSING:
        return 'bg-purple-100 text-purple-800';
      case CONSIGNMENT_STATUS.READY_FOR_RETAIL:
        return 'bg-emerald-100 text-emerald-800';
      case CONSIGNMENT_STATUS.SHIPPED_TO_RETAILER:
        return 'bg-sky-100 text-sky-800';
      case CONSIGNMENT_STATUS.COMPLETED:
        return 'bg-gray-100 text-gray-800';
      case CONSIGNMENT_STATUS.ASSIGNED:
        return 'bg-orange-100 text-orange-800';
      case CONSIGNMENT_STATUS.PICKED_UP:
        return 'bg-teal-100 text-teal-800';
      case CONSIGNMENT_STATUS.IN_TRANSIT:
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransporterInfo = (consignment) => {
    if (!consignment.transporterId) {
      return 'No transporter assigned';
    }
    
    const transporterName = consignment.transporterName || 'Unknown Transporter';
    const vehicleInfo = consignment.vehicleInfo 
      ? `${consignment.vehicleInfo.make} ${consignment.vehicleInfo.model}` 
      : 'Vehicle info not available';
      
    return `${transporterName} - ${vehicleInfo}`;
  };

  const renderRetailerDialog = () => {
    if (!showRetailerDialog) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Retailer</h3>
            <select
              value={selectedRetailerId}
              onChange={(e) => setSelectedRetailerId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-200 mb-4"
            >
              <option value="">Select a retailer</option>
              {retailers.map(retailer => (
                <option key={retailer.id} value={retailer.id}>
                  {retailer.storeName || retailer.name} - {retailer.storeAddress || retailer.address}
                </option>
              ))}
            </select>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowRetailerDialog(false);
                  setSelectedRetailerId('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRetailerSelect(selectedConsignment)}
                className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-900"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderConsignmentCard = (consignment) => {
    const actions = getStatusActions(consignment.status);
    
    return (
      <div key={consignment.id} className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{consignment.vegetableName}</h3>
            <p className="text-sm text-gray-500">{consignment.quantity} {consignment.unit}</p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(consignment.status)}`}>
            {consignment.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="space-y-2 mb-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Farmer:</span> {consignment.farmerName || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Distributor:</span> {consignment.distributorName || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Pickup:</span> {consignment.pickupLocation?.address || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Dropoff:</span> {consignment.dropoffLocation?.address || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Expected Delivery:</span> {consignment.expectedDeliveryDate ? new Date(consignment.expectedDeliveryDate).toLocaleDateString() : 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Quality:</span> {consignment.quality || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Transport Mode:</span> {consignment.transportMode || 'N/A'}
          </p>
          {consignment.currentLocation && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Current Location:</span> {consignment.currentLocation.address || 'N/A'}
            </p>
          )}
        </div>

        <div className="flex space-x-2">
          {actions && (
            <>
              {actions.next === CONSIGNMENT_STATUS.SHIPPED_TO_RETAILER ? (
                <button
                  onClick={() => {
                    setSelectedConsignment(consignment.id);
                    setShowRetailerDialog(true);
                  }}
                  className="flex-1 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                >
                  Ship to Retailer
                </button>
              ) : (
                <button
                  onClick={() => updateConsignmentStatus(consignment.id, actions.next)}
                  className="flex-1 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                >
                  {actions.label}
                </button>
              )}
              {actions.showTrack && (
                <Link
                  to={`/track/${consignment.id}`}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-center"
                >
                  Track
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    if (activeTab === TABS.HISTORY) {
      return (
        <div>
          <h2 className="text-xl font-semibold mb-4">Consignment History</h2>
          {historyLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : historyConsignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-md">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Consignment ID</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Vegetable</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Quantity</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Farmer</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Retailer</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Status</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Created Date</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {historyConsignments.map((consignment) => (
                    <tr key={consignment.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-700">{consignment.id.substring(0, 8)}...</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{consignment.vegetableName}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{consignment.quantity} {consignment.unit}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{consignment.farmerName || 'Unknown'}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{consignment.retailerName || 'Unknown'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(consignment.status)}`}>
                          {consignment.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {consignment.createdAt ? new Date(consignment.createdAt).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        <div className="flex space-x-2">
                          <Link
                            to={`/track/${consignment.id}`}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            Track
                          </Link>
                          <Link
                            to={`/consignment/${consignment.id}`}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            View
                          </Link>
                          {getStatusActions(consignment.status) && (
                            <button
                              onClick={() => updateConsignmentStatus(consignment.id, getStatusActions(consignment.status).next)}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              {getStatusActions(consignment.status).label}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No consignment history found</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {consignments.map(consignment => renderConsignmentCard(consignment))}
        {consignments.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No consignments found in this tab</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Distributor Dashboard</h1>
        <p className="mt-2 text-gray-600">Manage incoming, stored, and outgoing produce</p>
      </div>
      
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {Object.entries(TABS).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setActiveTab(value)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === value
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {key.charAt(0) + key.slice(1).toLowerCase()}
            </button>
          ))}
        </nav>
      </div>

      {renderTabContent()}
      {renderRetailerDialog()}
    </div>
  );
} 