import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { queueStatusUpdate, storeConsignmentOffline, getOfflineConsignment } from '../../services/offlineSync';
import VehicleManagement from './VehicleManagement';
import { Link } from 'react-router-dom';

const TABS = {
  CONSIGNMENTS: 'consignments',
  VEHICLES: 'vehicles',
  HISTORY: 'history'
};

const CONSIGNMENT_STATUS = {
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED_TO_DISTRIBUTOR: 'delivered_to_distributor',
  COMPLETED: 'completed',
  CREATED: 'created',
  DELIVERED: 'delivered'
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Consignments' },
  { value: 'to_be_assigned', label: 'To Be Assigned' },
  { value: 'assigned', label: 'My Assigned' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' }
];

const SORT_OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'status', label: 'Status' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'vehicle', label: 'Vehicle' }
];

const TransporterDashboard = () => {
  const [activeTab, setActiveTab] = useState(TABS.CONSIGNMENTS);
  const [consignments, setConsignments] = useState([]);
  const [filteredConsignments, setFilteredConsignments] = useState([]);
  const [historyConsignments, setHistoryConsignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedConsignment, setSelectedConsignment] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (activeTab === TABS.CONSIGNMENTS) {
      fetchConsignments();
    } else if (activeTab === TABS.HISTORY) {
      fetchHistoryConsignments();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser, activeTab]);

  const fetchConsignments = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'consignments'),
        where('transporterId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      const consignmentList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by date (newest first)
      consignmentList.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });

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
        where('transporterId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      const consignmentList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by date (newest first)
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

      const statusUpdate = {
        status: newStatus,
        timestamp: new Date().toISOString(),
        location,
        updatedBy: {
          id: currentUser.uid,
          role: 'transporter'
        }
      };

      // When marking as completed, we need to ensure it's visible in distributor's incoming tab
      const updateData = {
        status: newStatus, // ensure this always updates the top-level status field
        currentLocation: location,
        trackingHistory: [...consignments.find(c => c.id === consignmentId).trackingHistory, statusUpdate]
      };

      if (isOnline) {
        const consignmentRef = doc(db, 'consignments', consignmentId);
        await updateDoc(consignmentRef, updateData);
        toast.success('Status updated successfully');
      } else {
        // Queue update for when we're back online
        await queueStatusUpdate(consignmentId, updateData);
        
        // Update local state
        setConsignments(prev => prev.map(c => 
          c.id === consignmentId 
            ? { ...c, ...updateData }
            : c
        ));
        
        // Store updated consignment offline
        const updatedConsignment = {
          ...consignments.find(c => c.id === consignmentId),
          ...updateData
        };
        await storeConsignmentOffline(updatedConsignment);
        
        toast.success('Update queued for sync');
      }

      fetchConsignments();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusActions = (status) => {
    switch (status) {
      case CONSIGNMENT_STATUS.CREATED:
        return { next: CONSIGNMENT_STATUS.ASSIGNED, label: 'Accept Assignment' };
      case CONSIGNMENT_STATUS.ASSIGNED:
        return { next: CONSIGNMENT_STATUS.PICKED_UP, label: 'Mark as Picked Up' };
      case CONSIGNMENT_STATUS.PICKED_UP:
        return { next: CONSIGNMENT_STATUS.IN_TRANSIT, label: 'Start Transit' };
      case CONSIGNMENT_STATUS.IN_TRANSIT:
        return { next: CONSIGNMENT_STATUS.DELIVERED_TO_DISTRIBUTOR, label: 'Deliver to Distributor' };
      case CONSIGNMENT_STATUS.DELIVERED_TO_DISTRIBUTOR:
        return { next: CONSIGNMENT_STATUS.COMPLETED, label: 'Mark as Completed' };
      default:
        return null;
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case CONSIGNMENT_STATUS.CREATED:
        return 'bg-gray-100 text-gray-800';
      case CONSIGNMENT_STATUS.ASSIGNED:
        return 'bg-yellow-100 text-yellow-800';
      case CONSIGNMENT_STATUS.PICKED_UP:
        return 'bg-blue-100 text-blue-800';
      case CONSIGNMENT_STATUS.IN_TRANSIT:
        return 'bg-indigo-100 text-indigo-800';
      case CONSIGNMENT_STATUS.DELIVERED_TO_DISTRIBUTOR:
        return 'bg-green-100 text-green-800';
      case CONSIGNMENT_STATUS.COMPLETED:
        return 'bg-purple-100 text-purple-800';
      case CONSIGNMENT_STATUS.DELIVERED:
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const applyFilters = () => {
    let filtered = [...consignments];

    // Apply status filter
    if (activeFilter !== 'all') {
      if (activeFilter === 'assigned') {
        // Special handling for "My Assigned" filter
        filtered = filtered.filter(consignment => 
          consignment.status === 'assigned' && 
          consignment.assignedVehicleId && 
          vehicles.some(vehicle => vehicle.id === consignment.assignedVehicleId)
        );
      } else {
        filtered = filtered.filter(consignment => consignment.status === activeFilter);
      }
    }

    // Apply vehicle filter
    if (selectedVehicle) {
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
  };

  useEffect(() => {
    applyFilters();
  }, [consignments, activeFilter, sortBy, selectedVehicle, vehicles]);

  const renderTabContent = () => {
    switch (activeTab) {
      case TABS.VEHICLES:
        return <VehicleManagement />;
      case TABS.HISTORY:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Delivery History</h2>
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
                <p className="text-gray-500">No delivery history found</p>
              </div>
            )}
          </div>
        );
      case TABS.CONSIGNMENTS:
      default:
        return (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-semibold">Active Consignments</h2>
              <div className="flex flex-wrap gap-2">
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="select select-bordered select-sm"
                >
                  {FILTER_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {vehicles.length > 0 && (
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
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      Sort by: {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredConsignments.map((consignment) => (
                <div
                  key={consignment.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {consignment.vegetableName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {consignment.quantity} {consignment.unit}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(consignment.status)}`}>
                        {consignment.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-500 mb-4">
                      <p><span className="font-medium">Farmer:</span> {consignment.farmerName || 'Unknown'}</p>
                      <p><span className="font-medium">Distributor:</span> {consignment.distributorName || 'Unknown'}</p>
                      <p><span className="font-medium">Pickup:</span> {consignment.pickupLocation?.address || 'Location not specified'}</p>
                      <p><span className="font-medium">Dropoff:</span> {consignment.dropoffLocation?.address || 'Location not specified'}</p>
                      <p><span className="font-medium">Expected Delivery:</span> {consignment.expectedDeliveryDate ? new Date(consignment.expectedDeliveryDate).toLocaleDateString() : 'Not specified'}</p>
                      <p><span className="font-medium">Quality:</span> {consignment.quality || 'Not specified'}</p>
                      <p><span className="font-medium">Transport Mode:</span> {consignment.transportMode || 'Road'}</p>
                      {consignment.currentLocation && (
                        <p><span className="font-medium">Current Location:</span> {consignment.currentLocation.address || 'Location not specified'}</p>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      {getStatusActions(consignment.status) && (
                        <button
                          onClick={() => updateConsignmentStatus(consignment.id, getStatusActions(consignment.status).next)}
                          className="flex-1 bg-black text-white py-2 px-4 rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                        >
                          {getStatusActions(consignment.status).label}
                        </button>
                      )}
                      <Link
                        to={`/track/${consignment.id}`}
                        className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-center"
                      >
                        Track
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredConsignments.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No consignments match the current filter</p>
              </div>
            )}
          </>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {Object.entries(TABS).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setActiveTab(value)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === value
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {key.charAt(0) + key.slice(1).toLowerCase()}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        renderTabContent()
      )}
    </div>
  );
};

export default TransporterDashboard; 