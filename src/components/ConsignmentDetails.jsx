import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function ConsignmentDetails() {
  const [consignment, setConsignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { id } = useParams();
  const { currentUser, getUserRole } = useAuth();
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
    const fetchConsignment = async () => {
      try {
        const docRef = doc(db, 'consignments', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setConsignment({ id: docSnap.id, ...docSnap.data() });
        } else {
          toast.error('Consignment not found');
        }
      } catch (error) {
        console.error('Error fetching consignment:', error);
        toast.error('Error loading consignment details');
      } finally {
        setLoading(false);
      }
    };

    fetchConsignment();
  }, [id]);

  const updateStatus = async (newStatus) => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    try {
      setUpdating(true);
      
      // Get current location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      const updatedHistory = [
        ...(consignment.trackingHistory || []),
        {
          status: newStatus,
          location,
          timestamp: new Date().toISOString(),
          updatedBy: {
            id: currentUser.uid,
            role: userRole
          }
        }
      ];

      await updateDoc(doc(db, 'consignments', id), {
        status: newStatus,
        trackingHistory: updatedHistory
      });

      setConsignment(prev => ({
        ...prev,
        status: newStatus,
        trackingHistory: updatedHistory
      }));

      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!consignment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Consignment not found</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Consignment Details
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            ID: {consignment.id}
          </p>
        </div>
        
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Vegetable Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{consignment.vegetableName}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Quantity</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {consignment.quantity} {consignment.unit}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Harvest Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(consignment.harvestDate).toLocaleDateString()}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Price</dt>
              <dd className="mt-1 text-sm text-gray-900">₹{consignment.price}</dd>
            </div>
            
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900">{consignment.description}</dd>
            </div>
            
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Current Status</dt>
              <dd className="mt-1">
                <span className="px-2 py-1 text-sm font-medium rounded-full bg-primary-100 text-primary-800">
                  {consignment.status}
                </span>
              </dd>
            </div>
          </dl>

          {userRole === 'distributor' && consignment.status === 'created' && (
            <button
              onClick={() => updateStatus('in_transit')}
              disabled={updating}
              className="mt-6 w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
            >
              {updating ? 'Updating...' : 'Mark as In Transit'}
            </button>
          )}

          {userRole === 'retailer' && consignment.status === 'in_transit' && (
            <button
              onClick={() => updateStatus('delivered')}
              disabled={updating}
              className="mt-6 w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
            >
              {updating ? 'Updating...' : 'Mark as Delivered'}
            </button>
          )}
        </div>

        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Tracking History</h4>
          <div className="h-96 mb-4">
            <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
              <GoogleMap
                mapContainerStyle={{ height: '100%', width: '100%' }}
                center={{ lat: consignment.location.lat, lng: consignment.location.lng }}
                zoom={13}
              >
                {consignment.trackingHistory?.map((history, index) => (
                  <Marker
                    key={index}
                    position={{ lat: history.location.lat, lng: history.location.lng }}
                    title={`${history.status} - ${new Date(history.timestamp).toLocaleString()}`}
                  />
                ))}
                <Marker
                  position={{ lat: consignment.location.lat, lng: consignment.location.lng }}
                  title="Initial Location"
                />
              </GoogleMap>
            </LoadScript>
          </div>

          <div className="space-y-4">
            {consignment.trackingHistory.map((track, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 text-sm"
              >
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary-600 mt-2"></div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{track.status}</p>
                  <p className="text-gray-500">
                    {new Date(track.timestamp).toLocaleString()}
                  </p>
                  {track.updatedBy && (
                    <p className="text-gray-500">
                      Updated by: {track.updatedBy.role}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 