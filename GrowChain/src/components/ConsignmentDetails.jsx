import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer, Autocomplete } from '@react-google-maps/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// Create a promise to load Google Maps script only once
const loadGoogleMaps = (() => {
  let promise = null;
  return () => {
    if (!promise) {
      promise = new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        document.head.appendChild(script);
      });
    }
    return promise;
  };
})();

export default function ConsignmentDetails() {
  const [consignment, setConsignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [directions, setDirections] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationPlace, setDestinationPlace] = useState(null);
  const [showDestinationInput, setShowDestinationInput] = useState(false);
  const autocompleteRef = useRef(null);
  const directionsService = useRef(null);
  const { id } = useParams();
  const { currentUser, getUserRole } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const mapRef = useRef(null);

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location obtained:', position.coords);
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Location error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  };

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

  useEffect(() => {
    // Load Google Maps script
    loadGoogleMaps().then(() => {
      console.log('Google Maps script loaded');
      setMapsLoaded(true);
      
      // Initialize the directions service
      directionsService.current = new window.google.maps.DirectionsService();
    });

    // Get current location
    getCurrentLocation()
      .then(location => {
        console.log('Setting current location:', location);
        setCurrentLocation(location);
      })
      .catch(error => {
        console.error('Error getting location:', error);
        setLocationError(error.message);
        toast.error(`Location error: ${error.message}`);
      });
  }, []);

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      console.log('Place selected:', place);
      
      if (place.geometry) {
        setDestinationPlace(place);
        setDestinationCity(place.formatted_address);
        calculateRoute(place.geometry.location);
        
        // Center map on the new destination
        if (mapRef.current) {
          mapRef.current.panTo(place.geometry.location);
          mapRef.current.setZoom(13);
        }
      } else {
        console.error('No geometry found for place:', place);
        toast.error('Please select a valid location');
      }
    }
  };

  const calculateRoute = (destination = null) => {
    if (!currentLocation) return;

    const dest = destination || (consignment?.location ? { lat: consignment.location.lat, lng: consignment.location.lng } : null);
    if (!dest) return;

    if (!directionsService.current) {
      directionsService.current = new window.google.maps.DirectionsService();
    }

    const request = {
      origin: currentLocation,
      destination: dest,
      travelMode: window.google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: true
    };

    directionsService.current.route(request, (result, status) => {
      if (status === 'OK') {
        setDirections(result);
        setRouteError(null);
      } else {
        console.error('Error calculating route:', status);
        setRouteError('Could not calculate route to destination');
        toast.error('Could not calculate route to destination');
      }
    });
  };

  useEffect(() => {
    if (currentLocation && consignment?.location) {
      calculateRoute();
    }
  }, [currentLocation, consignment?.location]);

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
                {consignment.harvestDate ? new Date(consignment.harvestDate).toLocaleDateString() : 'Not specified'}
              </dd>
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
          
          {/* Destination City Input */}
          <div className="mb-4 bg-white p-4 rounded-lg shadow">
            <h5 className="text-md font-medium text-gray-900 mb-2">Destination Information</h5>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter Destination City
                </label>
                {mapsLoaded ? (
                  <Autocomplete
                    onLoad={autocomplete => {
                      console.log('Autocomplete loaded');
                      autocompleteRef.current = autocomplete;
                    }}
                    onPlaceChanged={onPlaceChanged}
                    options={{
                      types: ['(cities)'],
                      componentRestrictions: { country: 'in' }
                    }}
                  >
                    <input
                      type="text"
                      value={destinationCity}
                      onChange={(e) => setDestinationCity(e.target.value)}
                      placeholder="Enter destination city"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </Autocomplete>
                ) : (
                  <div className="p-2 bg-gray-100 rounded">
                    <p className="text-sm text-gray-500">Loading map services...</p>
                  </div>
                )}
              </div>
              
              {destinationCity && (
                <div className="p-3 bg-green-50 rounded-md">
                  <p className="text-sm text-green-700">
                    <span className="font-medium">Selected Destination:</span> {destinationCity}
                  </p>
                </div>
              )}
            </div>
          </div>

          {locationError && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
              <p className="font-medium">Location Error:</p>
              <p>{locationError}</p>
              <button
                onClick={() => {
                  getCurrentLocation()
                    .then(location => {
                      setCurrentLocation(location);
                      setLocationError(null);
                    })
                    .catch(error => {
                      setLocationError(error.message);
                      toast.error(`Location error: ${error.message}`);
                    });
                }}
                className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          )}

          {routeError && (
            <div className="mb-4 p-4 bg-yellow-50 text-yellow-700 rounded-md">
              <p className="font-medium">Route Error:</p>
              <p>{routeError}</p>
              <button
                onClick={calculateRoute}
                className="mt-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200"
              >
                Try Calculating Route Again
              </button>
            </div>
          )}

          <div className="h-96 mb-4 relative">
            {mapsLoaded && (
              <GoogleMap
                mapContainerStyle={{ height: '100%', width: '100%' }}
                center={destinationPlace?.geometry?.location || (consignment.location ? { lat: consignment.location.lat, lng: consignment.location.lng } : { lat: 20.5937, lng: 78.9629 })}
                zoom={13}
                options={{
                  zoomControl: true,
                  mapTypeControl: true,
                  scaleControl: true,
                  streetViewControl: true,
                  rotateControl: true,
                  fullscreenControl: true
                }}
                onLoad={map => (mapRef.current = map)}
              >
                {directions && <DirectionsRenderer 
                  directions={directions}
                  options={{
                    suppressMarkers: false,
                    polylineOptions: {
                      strokeColor: '#3B82F6',
                      strokeWeight: 5
                    }
                  }}
                />}
                
                {/* Current Location Marker */}
                {currentLocation && (
                  <Marker
                    position={currentLocation}
                    title="Your Current Location"
                    icon={{
                      url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                      scaledSize: new window.google.maps.Size(40, 40)
                    }}
                    animation={window.google.maps.Animation.BOUNCE}
                  />
                )}

                {/* Destination Marker */}
                {(destinationPlace?.geometry?.location || consignment.location) && (
                  <Marker
                    position={destinationPlace?.geometry?.location || { lat: consignment.location.lat, lng: consignment.location.lng }}
                    title={destinationCity || "Destination"}
                    icon={{
                      url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                      scaledSize: new window.google.maps.Size(40, 40)
                    }}
                    animation={window.google.maps.Animation.DROP}
                  />
                )}

                {/* Consignment History Markers */}
                {consignment.trackingHistory?.map((history, index) => (
                  history.location && (
                    <Marker
                      key={index}
                      position={{ lat: history.location.lat, lng: history.location.lng }}
                      title={`${history.status} - ${new Date(history.timestamp).toLocaleString()}`}
                      icon={{
                        url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
                        scaledSize: new window.google.maps.Size(30, 30)
                      }}
                    />
                  )
                ))}
              </GoogleMap>
            )}
          </div>

          {/* Route Information */}
          {directions && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h5 className="font-medium text-gray-900 mb-2">Route Information</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <p className="text-sm text-gray-600">Distance:</p>
                  <p className="font-medium text-lg">{directions.routes[0].legs[0].distance.text}</p>
                </div>
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <p className="text-sm text-gray-600">Duration:</p>
                  <p className="font-medium text-lg">{directions.routes[0].legs[0].duration.text}</p>
                </div>
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <p className="text-sm text-gray-600">Destination:</p>
                  <p className="font-medium text-lg">{destinationCity || 'Consignment Location'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}