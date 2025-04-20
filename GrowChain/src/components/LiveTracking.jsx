import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { GoogleMap, LoadScript, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import toast from 'react-hot-toast';
import axios from 'axios';

const statusColors = {
  created: '#10B981', // Emerald-500
  'in-transit': '#3B82F6', // Blue-500
  delivered: '#6366F1', // Indigo-500
  delayed: '#EF4444', // Red-500
  completed: '#059669', // Emerald-600
};

const statusIcons = {
  created: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'in-transit': (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  delivered: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  delayed: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  completed: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// Define libraries as a constant outside the component
const libraries = ['geometry'];

export default function LiveTracking() {
  const [consignment, setConsignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [weatherData, setWeatherData] = useState({});
  const [stats, setStats] = useState(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const unsubscribeRef = useRef(null);

  // Reset all state when consignment ID changes
  const resetState = useCallback(() => {
    if (!isMounted.current) return;

    setConsignment(null);
    setLoading(true);
    setSelectedPoint(null);
    setActiveStep(0);
    setWeatherData({});
    setStats(null);
    setMapsLoaded(false);
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Memoize the map options to prevent unnecessary re-renders
  const mapOptions = useMemo(() => ({
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: true,
    zoomControl: true,
  }), []);

  // Fetch weather data for a location
  const fetchWeatherData = useCallback(async (lat, lng) => {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${import.meta.env.VITE_WEATHER_API_KEY}&units=metric`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching weather:', error);
      return null;
    }
  }, []);

  // Calculate route statistics
  const calculateStats = useCallback((trackingHistory) => {
    if (!window.google || !window.google.maps || !window.google.maps.geometry) {
      console.warn('Google Maps geometry library not loaded');
      return null;
    }

    try {
      const totalDistance = window.google.maps.geometry.spherical.computeLength(
        trackingHistory.map(point => new window.google.maps.LatLng(point.location.lat, point.location.lng))
      );

      const startTime = new Date(trackingHistory[0].timestamp);
      const currentTime = new Date(trackingHistory[trackingHistory.length - 1].timestamp);
      const timeInTransit = (currentTime - startTime) / (1000 * 60 * 60); // hours

      const averageSpeed = totalDistance / timeInTransit;

      return {
        totalDistance: (totalDistance / 1000).toFixed(2), // km
        timeInTransit: timeInTransit.toFixed(1),
        averageSpeed: (averageSpeed * 3.6).toFixed(1), // km/h
        delayedPoints: trackingHistory.filter(point => point.status === 'delayed').length
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!id) {
      toast.error('Invalid consignment ID');
      setLoading(false);
      navigate('/dashboard');
      return;
    }

    // Reset state and cleanup previous subscription
    resetState();
    cleanup();

    const fetchConsignment = async () => {
      try {
        unsubscribeRef.current = onSnapshot(
          doc(db, 'consignments', id),
          async (doc) => {
            if (!isMounted.current) return;

            if (doc.exists()) {
              const data = { id: doc.id, ...doc.data() };
              setConsignment(data);
              setActiveStep(data.trackingHistory.length - 1);

              try {
                // Fetch weather data for each tracking point
                const weatherPromises = data.trackingHistory.map(point =>
                  fetchWeatherData(point.location.lat, point.location.lng)
                );
                const weatherResults = await Promise.all(weatherPromises);
                const weatherMap = {};
                data.trackingHistory.forEach((point, index) => {
                  weatherMap[`${point.location.lat},${point.location.lng}`] = weatherResults[index];
                });
                setWeatherData(weatherMap);

                // Calculate route statistics
                if (window.google && window.google.maps && window.google.maps.geometry) {
                  setStats(calculateStats(data.trackingHistory));
                }
              } catch (error) {
                console.error('Error processing tracking data:', error);
                toast.error('Error processing tracking data');
              }
            } else {
              toast.error('Consignment not found');
              navigate('/dashboard');
            }
            setLoading(false);
          },
          (error) => {
            if (!isMounted.current) return;
            console.error('Error fetching consignment:', error);
            toast.error('Failed to load consignment data');
            setLoading(false);
            navigate('/dashboard');
          }
        );
      } catch (error) {
        if (!isMounted.current) return;
        console.error('Error setting up consignment listener:', error);
        toast.error('Failed to set up consignment tracking');
        setLoading(false);
        navigate('/dashboard');
      }
    };

    fetchConsignment();

    return cleanup;
  }, [id, navigate, resetState, cleanup]);

  // Handle navigation to a different consignment
  const handleTrackClick = useCallback((newId) => {
    if (newId === id) return;
    navigate(`/track/${newId}`);
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-leaf-primary"></div>
          <p className="mt-4 text-gray-600">Loading tracking information...</p>
        </div>
      </div>
    );
  }

  if (!consignment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01" />
        </svg>
        <h2 className="text-xl font-semibold text-gray-700">Consignment Not Found</h2>
      </div>
    );
  }

  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
      onLoad={() => setMapsLoaded(true)}
    >
      <div className="flex h-screen bg-gray-50">
        {/* Enhanced Sidebar */}
        <div className="w-96 bg-white shadow-xl z-10 overflow-hidden flex flex-col">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-800">Consignment Tracking</h2>
            <p className="text-sm text-gray-500 mt-1">ID: {consignment?.id}</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Shipment Details</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Product</p>
                    <p className="font-medium">{consignment.vegetableName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Quantity</p>
                    <p className="font-medium">{consignment.quantity} {consignment.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Expected Delivery</p>
                    <p className="font-medium">{new Date(consignment.expectedDeliveryDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Tracking Timeline */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Tracking Timeline</h3>
                <div className="relative">
                  {consignment.trackingHistory.map((track, index) => (
                    <div
                      key={index}
                      className={`relative pl-8 pb-8 group cursor-pointer ${index === activeStep ? 'opacity-100' : 'opacity-60'}`}
                      onClick={() => {
                        setActiveStep(index);
                        setSelectedPoint(track);
                      }}
                    >
                      <div className="absolute left-0 top-0 rounded-full border-2 border-leaf-primary bg-white p-1 group-hover:scale-110 transition-transform">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: statusColors[track.status] }}
                        />
                      </div>
                      {index !== consignment.trackingHistory.length - 1 && (
                        <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-200" />
                      )}
                      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 transition-all duration-200 hover:shadow-md">
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize" style={{
                            backgroundColor: `${statusColors[track.status]}20`,
                            color: statusColors[track.status]
                          }}>
                            {statusIcons[track.status]}
                            <span className="ml-1">{track.status}</span>
                          </span>
                          <time className="text-sm text-gray-500">
                            {new Date(track.timestamp).toLocaleString()}
                          </time>
                        </div>
                        {weatherData[`${track.location.lat},${track.location.lng}`] && (
                          <div className="mt-2 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                              </svg>
                              <span>
                                {weatherData[`${track.location.lat},${track.location.lng}`].weather[0].description} -
                                {weatherData[`${track.location.lat},${track.location.lng}`].main.temp}°C
                              </span>
                            </div>
                          </div>
                        )}
                        <p className="text-sm text-gray-600 mt-2">{track.notes || 'Location updated'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {mapsLoaded && window.google && window.google.maps && (
            <GoogleMap
              mapContainerStyle={{ height: '100%', width: '100%' }}
              center={consignment?.trackingHistory[activeStep]?.location}
              zoom={12}
              options={mapOptions}
            >
              {/* Source and Destination Markers */}
              <Marker
                position={consignment.trackingHistory[0].location}
                icon={{
                  url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                  scaledSize: new window.google.maps.Size(40, 40)
                }}
                title="Source"
              />
              <Marker
                position={consignment.trackingHistory[consignment.trackingHistory.length - 1].location}
                icon={{
                  url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                  scaledSize: new window.google.maps.Size(40, 40)
                }}
                title="Destination"
              />

              {/* Tracking Points */}
              {consignment.trackingHistory.map((track, index) => (
                <Marker
                  key={index}
                  position={track.location}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: statusColors[track.status],
                    fillOpacity: 1,
                    strokeColor: 'white',
                    strokeWeight: 2,
                  }}
                  onClick={() => {
                    setSelectedPoint(track);
                    setActiveStep(index);
                  }}
                />
              ))}

              {/* Route Visualization */}
              <Polyline
                path={consignment.trackingHistory.map(track => track.location)}
                options={{
                  strokeColor: '#3B82F6',
                  strokeWeight: 3,
                  strokeOpacity: 0.7,
                  geodesic: true
                }}
              />

              {/* InfoWindow */}
              {selectedPoint && (
                <InfoWindow
                  position={selectedPoint.location}
                  onCloseClick={() => setSelectedPoint(null)}
                >
                  <div className="p-3 max-w-xs">
                    <div className="font-medium text-gray-900 capitalize mb-2">{selectedPoint.status}</div>
                    <div className="text-sm text-gray-500 mb-2">
                      {new Date(selectedPoint.timestamp).toLocaleString()}
                    </div>
                    {weatherData[`${selectedPoint.location.lat},${selectedPoint.location.lng}`] && (
                      <div className="mb-2 text-sm">
                        <div className="font-medium text-gray-700">Weather Conditions:</div>
                        <div className="text-gray-600">
                          {weatherData[`${selectedPoint.location.lat},${selectedPoint.location.lng}`].weather[0].description}
                          <br />
                          Temperature: {weatherData[`${selectedPoint.location.lat},${selectedPoint.location.lng}`].main.temp}°C
                          <br />
                          Humidity: {weatherData[`${selectedPoint.location.lat},${selectedPoint.location.lng}`].main.humidity}%
                        </div>
                      </div>
                    )}
                    {selectedPoint.notes && (
                      <div className="text-sm">
                        <div className="font-medium text-gray-700">Notes:</div>
                        <div className="text-gray-600">{selectedPoint.notes}</div>
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>
      </div>
    </LoadScript>
  );
} 