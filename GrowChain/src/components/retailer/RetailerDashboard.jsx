import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useBlockchain } from '../../contexts/BlockchainContext';
import toast from 'react-hot-toast';
import SaleForm from './SaleForm';

const TABS = {
  INCOMING: 'incoming',
  INVENTORY: 'inventory',
  SOLD: 'sold',
  HISTORY: 'history'
};

const CONSIGNMENT_STATUS = {
  SHIPPED_TO_RETAILER: 'shipped_to_retailer',
  DELIVERED: 'delivered',
  READY_FOR_SALE: 'ready_for_sale',
  SOLD: 'sold',
  SHIPPED: 'shipped',
  IN_TRANSIT: 'in_transit',
  COMPLETED: 'completed'
};

export default function RetailerDashboard() {
  const [activeTab, setActiveTab] = useState(TABS.INCOMING);
  const [consignments, setConsignments] = useState([]);
  const [historyConsignments, setHistoryConsignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { currentUser } = useAuth();
  const { updateConsignmentStatus, createConsignmentOnBlockchain } = useBlockchain();

  useEffect(() => {
    if (activeTab === TABS.HISTORY) {
      fetchHistoryConsignments();
    } else {
      fetchConsignments();
    }
  }, [currentUser, activeTab]);

  const fetchConsignments = async () => {
    setLoading(true);
    try {
      let statusFilter;
      switch (activeTab) {
        case TABS.INCOMING:
          statusFilter = [CONSIGNMENT_STATUS.SHIPPED_TO_RETAILER];
          break;
        case TABS.INVENTORY:
          statusFilter = [CONSIGNMENT_STATUS.DELIVERED, CONSIGNMENT_STATUS.READY_FOR_SALE];
          break;
        case TABS.SOLD:
          statusFilter = [CONSIGNMENT_STATUS.SOLD];
          break;
        default:
          statusFilter = [];
      }

      const q = query(
        collection(db, 'consignments'),
        where('retailerId', '==', currentUser.uid),
        where('status', 'in', statusFilter)
      );

      const querySnapshot = await getDocs(q);
      const consignmentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setConsignments(consignmentsData);
    } catch (error) {
      console.error('Error fetching consignments:', error);
      toast.error('Failed to fetch consignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryConsignments = async () => {
    try {
      setHistoryLoading(true);

      const q = query(
        collection(db, 'consignments'),
        where('retailerId', '==', currentUser.uid),
        where('status', 'in', [
          CONSIGNMENT_STATUS.DELIVERED,
          CONSIGNMENT_STATUS.READY_FOR_SALE,
          CONSIGNMENT_STATUS.SOLD,
          CONSIGNMENT_STATUS.SHIPPED_TO_RETAILER
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

  const markAsDelivered = async (consignmentId) => {
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
        status: CONSIGNMENT_STATUS.DELIVERED,
        timestamp: new Date().toISOString(),
        location,
        updatedBy: {
          id: currentUser.uid,
          role: 'retailer'
        }
      };

      const updateData = {
        status: CONSIGNMENT_STATUS.DELIVERED,
        currentLocation: location,
        trackingHistory: [...(consignment.trackingHistory || []), statusUpdate]
      };

      // Update in Firebase
      const consignmentRef = doc(db, 'consignments', consignmentId);
      await updateDoc(consignmentRef, updateData);

      try {
        // First try to update the status
        await updateConsignmentStatus(consignmentId, CONSIGNMENT_STATUS.DELIVERED, location);
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
              retailerId: currentUser.uid,
              status: CONSIGNMENT_STATUS.DELIVERED,
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

      toast.success('Consignment marked as delivered');
      fetchConsignments();
      fetchHistoryConsignments();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const markAsReadyForSale = async (consignmentId) => {
    try {
      const consignment = consignments.find(c => c.id === consignmentId);

      const statusUpdate = {
        status: CONSIGNMENT_STATUS.READY_FOR_SALE,
        timestamp: new Date().toISOString(),
        updatedBy: {
          id: currentUser.uid,
          role: 'retailer'
        }
      };

      const updateData = {
        status: CONSIGNMENT_STATUS.READY_FOR_SALE,
        trackingHistory: [...(consignment.trackingHistory || []), statusUpdate]
      };

      // Update in Firebase
      const consignmentRef = doc(db, 'consignments', consignmentId);
      await updateDoc(consignmentRef, updateData);

      try {
        // First try to update the status with current location
        await updateConsignmentStatus(consignmentId, CONSIGNMENT_STATUS.READY_FOR_SALE, consignment.currentLocation);
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
              retailerId: currentUser.uid,
              status: CONSIGNMENT_STATUS.READY_FOR_SALE,
              location: consignment.currentLocation || { lat: 0, lng: 0 },
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

      toast.success('Consignment marked as ready for sale');
      fetchConsignments();
      fetchHistoryConsignments();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case CONSIGNMENT_STATUS.SHIPPED_TO_RETAILER:
        return 'bg-blue-100 text-blue-800';
      case CONSIGNMENT_STATUS.DELIVERED:
        return 'bg-yellow-100 text-yellow-800';
      case CONSIGNMENT_STATUS.READY_FOR_SALE:
        return 'bg-green-100 text-green-800';
      case CONSIGNMENT_STATUS.SOLD:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusActions = (status, consignmentId) => {
    switch (status) {
      case CONSIGNMENT_STATUS.SHIPPED_TO_RETAILER:
        return (
          <button
            onClick={() => markAsDelivered(consignmentId)}
            className="px-6 py-2.5 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-md transition-colors duration-200"
          >
            Mark as Delivered
          </button>
        );
      case CONSIGNMENT_STATUS.DELIVERED:
        return (
          <button
            onClick={() => markAsReadyForSale(consignmentId)}
            className="px-6 py-2.5 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-md transition-colors duration-200"
          >
            Mark as Ready for Sale
          </button>
        );
      case CONSIGNMENT_STATUS.READY_FOR_SALE:
        return (
          <Link
            to={`/retailer/sale/${consignmentId}`}
            className="px-6 py-2.5 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-md transition-colors duration-200"
          >
            Complete Sale
          </Link>
        );
      default:
        return null;
    }
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      );
    }

    if (activeTab === TABS.HISTORY) {
      return (
        <div>
          <h2 className="text-xl font-semibold mb-4">Consignment History</h2>
          {historyLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
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
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Distributor</th>
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
                      <td className="py-3 px-4 text-sm text-gray-700">{consignment.distributorName || 'Unknown'}</td>
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
                            className="text-gray-600 hover:text-gray-800"
                          >
                            Track
                          </Link>
                          <Link
                            to={`/retailer/consignment/${consignment.id}`}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500">No history found</p>
          )}
        </div>
      );
    }

    if (consignments.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No consignments found for this category</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {consignments.map((consignment) => (
          <div key={consignment.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{consignment.vegetableName}</h3>
                  <p className="text-sm text-gray-500">ID: {consignment.id.substring(0, 8)}...</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(consignment.status)}`}>
                  {consignment.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium">{consignment.quantity} {consignment.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Farmer:</span>
                  <span className="font-medium">{consignment.farmerName || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Distributor:</span>
                  <span className="font-medium">{consignment.distributorName || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">
                    {consignment.createdAt ? new Date(consignment.createdAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                {getStatusActions(consignment.status, consignment.id)}
                <Link
                  to={`/track/${consignment.id}`}
                  className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
                >
                  Track
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Retailer Dashboard</h1>
        <p className="mt-2 text-gray-600">Manage incoming, inventory, and sold produce</p>
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
    </div>
  );
} 