import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useBlockchain } from '../../contexts/BlockchainContext';
import toast from 'react-hot-toast';

const RetailerConsignmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { updateConsignmentStatus } = useBlockchain();
  const [consignment, setConsignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConsignmentDetails();
  }, [id, currentUser]);

  const fetchConsignmentDetails = async () => {
    try {
      setLoading(true);
      const consignmentRef = doc(db, 'consignments', id);
      const consignmentSnap = await getDoc(consignmentRef);

      if (!consignmentSnap.exists()) {
        setError('Consignment not found');
        setLoading(false);
        return;
      }

      const consignmentData = {
        id: consignmentSnap.id,
        ...consignmentSnap.data()
      };

      // Check if this consignment belongs to the current retailer
      if (consignmentData.retailerId !== currentUser.uid) {
        setError('You do not have permission to view this consignment');
        setLoading(false);
        return;
      }

      setConsignment(consignmentData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching consignment details:', error);
      setError('Failed to load consignment details');
      setLoading(false);
    }
  };

  const markAsDelivered = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    try {
      setLoading(true);
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      await updateConsignmentStatus(id, 'delivered', location);
      toast.success('Consignment marked as delivered');
      fetchConsignmentDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
      setLoading(false);
    }
  };

  const markAsReadyForSale = async () => {
    try {
      setLoading(true);
      await updateConsignmentStatus(id, 'ready_for_sale');
      toast.success('Consignment marked as ready for sale');
      fetchConsignmentDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
      setLoading(false);
    }
  };

  const getStatusActions = () => {
    if (!consignment) return null;
    
    switch (consignment.status) {
      case 'shipped':
        return (
          <button
            onClick={markAsDelivered}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Mark as Delivered
          </button>
        );
      case 'delivered':
        return (
          <button
            onClick={markAsReadyForSale}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Mark as Ready for Sale
          </button>
        );
      case 'ready_for_sale':
        return (
          <Link
            to={`/retailer/sale/${id}`}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 block text-center"
          >
            Complete Sale
          </Link>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading consignment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
        <Link to="/retailer" className="text-primary-600 hover:text-primary-800">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!consignment) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Consignment not found</p>
        </div>
        <Link to="/retailer" className="text-primary-600 hover:text-primary-800">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Consignment Details</h1>
        <Link to="/retailer" className="text-primary-600 hover:text-primary-800 flex items-center">
          <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">
            {consignment.vegetableName} - {consignment.quantity} {consignment.unit}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Consignment #{consignment.id.substring(0, 8)} - 
            <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
              consignment.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
              consignment.status === 'delivered' ? 'bg-yellow-100 text-yellow-800' :
              consignment.status === 'ready_for_sale' ? 'bg-green-100 text-green-800' :
              consignment.status === 'sold' ? 'bg-purple-100 text-purple-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {consignment.status.replace('_', ' ')}
            </span>
          </p>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Farmer</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{consignment.farmerName || 'Unknown'}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Distributor</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{consignment.distributorName || 'Unknown'}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Transporter</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{consignment.transporterName || 'Unknown'}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Quality</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{consignment.quality || 'Not specified'}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Expected Delivery</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {consignment.expectedDeliveryDate ? new Date(consignment.expectedDeliveryDate).toLocaleDateString() : 'Not specified'}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Origin</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{consignment.origin || 'Not specified'}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Date Created</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {consignment.createdAt ? new Date(consignment.createdAt.toDate()).toLocaleString() : 'Unknown'}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Additional Notes</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{consignment.notes || 'No additional notes'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Tracking History */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">Tracking History</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Timeline of consignment status updates</p>
        </div>
        <div className="border-t border-gray-200 p-6">
          {consignment.trackingHistory && consignment.trackingHistory.length > 0 ? (
            <div className="flow-root">
              <ul className="-mb-8">
                {consignment.trackingHistory.map((event, eventIdx) => (
                  <li key={eventIdx}>
                    <div className="relative pb-8">
                      {eventIdx !== consignment.trackingHistory.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                            event.status === 'created' ? 'bg-gray-500' :
                            event.status === 'assigned' ? 'bg-blue-500' :
                            event.status === 'picked_up' ? 'bg-indigo-500' :
                            event.status === 'in_transit' ? 'bg-yellow-500' :
                            event.status === 'delivered' ? 'bg-green-500' :
                            event.status === 'ready_for_sale' ? 'bg-purple-500' :
                            event.status === 'sold' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}>
                            <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {event.status.charAt(0).toUpperCase() + event.status.slice(1).replace('_', ' ')}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Unknown time'}
                            </p>
                          </div>
                          <div className="mt-2 text-sm text-gray-700">
                            {event.updatedBy && (
                              <p>Updated by: {event.updatedBy.role.charAt(0).toUpperCase() + event.updatedBy.role.slice(1)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No tracking history available</p>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="mt-6">
        {getStatusActions()}
      </div>
    </div>
  );
};

export default RetailerConsignmentDetails; 