import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBlockchain } from '../contexts/BlockchainContext';
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import QRCode from 'qrcode.react';
import toast from 'react-hot-toast';
import { GoogleMap, LoadScript, Marker, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';

function LocationMarker({ position, setPosition }) {
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newPosition = { lat: latitude, lng: longitude };
          setPosition(newPosition);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Failed to get your location. Please try again.');
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }
  }, []);

  return null;
}

export default function ConsignmentForm() {
  const [formData, setFormData] = useState({
    vegetableName: '',
    quantity: '',
    unit: 'kg',
    harvestDate: '',
    price: '',
    description: '',
    quality: 'A',
    storageConditions: '',
    shelfLife: '',
    certifications: [],
    distributorId: '',
    transporterId: '',
    expectedDeliveryDate: '',
    transportMode: 'road',
    specialInstructions: '',
    fromCity: '',
    toCity: ''
  });
  const [position, setPosition] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [distributors, setDistributors] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [showQRModal, setShowQRModal] = useState(false);
  const [blockchainStatus, setBlockchainStatus] = useState('pending');
  const { currentUser } = useAuth();
  const { createConsignmentOnBlockchain } = useBlockchain();
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState('hi-IN');
  const [spokenText, setSpokenText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [destination, setDestination] = useState('');
  const [directions, setDirections] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);

  // Memoize map options
  const mapOptions = useMemo(() => ({
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: true,
    zoomControl: true,
  }), []);

  // Memoize the map container style
  const mapContainerStyle = useMemo(() => ({
    height: '100%',
    width: '100%'
  }), []);

  // Memoize the default center
  const defaultCenter = useMemo(() => ({
    lat: 20.5937,
    lng: 78.9629
  }), []);

  // Memoize the map component
  const MapComponent = useMemo(() => {
    return (
      <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={currentLocation || defaultCenter}
          zoom={currentLocation ? 10 : 5}
          options={mapOptions}
        >
          {currentLocation && (
            <Marker
              position={currentLocation}
              label="You"
            />
          )}

          {destinationLocation && (
            <Marker
              position={destinationLocation}
              label="Destination"
            />
          )}

          {currentLocation && destinationLocation && (
            <DirectionsService
              options={{
                destination: destinationLocation,
                origin: currentLocation,
                travelMode: 'DRIVING'
              }}
              callback={(result, status) => {
                if (status === 'OK') {
                  setDirections(result);
                }
              }}
            />
          )}

          {directions && (
            <DirectionsRenderer
              options={{
                directions: directions
              }}
            />
          )}
        </GoogleMap>
      </LoadScript>
    );
  }, [currentLocation, destinationLocation, directions, mapContainerStyle, defaultCenter, mapOptions]);

  // Fetch available distributors and transporters
  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        // Fetch distributors
        const distributorQuery = query(
          collection(db, 'users'),
          where('role', '==', 'distributor')
        );
        const distributorSnapshot = await getDocs(distributorQuery);
        const distributorList = distributorSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDistributors(distributorList);
        
        // Fetch transporters
        const transporterQuery = query(
          collection(db, 'users'),
          where('role', '==', 'transporter')
        );
        const transporterSnapshot = await getDocs(transporterQuery);
        const transporterList = transporterSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTransporters(transporterList);
      } catch (error) {
        console.error('Error fetching supply chain participants:', error);
        toast.error('Failed to load distributors and transporters');
      }
    };

    fetchParticipants();
  }, []);

  // Initialize map and get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          setPosition(location);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Failed to get your location. Please try again.');
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }
  }, []);

  // Handle destination changes
  const handleDestinationChange = async (city) => {
    setDestination(city);
    setFormData(prev => ({
      ...prev,
      toCity: city
    }));
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: city }, (results, status) => {
          if (status === 'OK') {
            resolve(results[0].geometry.location);
          } else {
            reject(new Error('Geocoding failed'));
          }
        });
      });

      setDestinationLocation({
        lat: result.lat(),
        lng: result.lng()
      });
    } catch (error) {
      console.error('Error geocoding destination:', error);
      toast.error('Could not find the destination city');
    }
  };

  // Update voice input handling
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = selectedLanguage;
      
      recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        setSpokenText(transcript);
        
        try {
          const translated = await translateText(transcript, selectedLanguage);
          setTranslatedText(translated);
          
          const response = await fetch('http://localhost:4005/dialogflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              text: translated,
              sessionId: Math.random().toString(36).substring(7)
            })
          });
          
          const data = await response.json();
          const params = data.queryResult?.parameters || {};
          
          // Update form with Dialogflow parameters
          setFormData(prev => ({
            ...prev,
            vegetableName: params['vegetable'] || prev.vegetableName,
            quantity: params['unit-weight']?.amount || prev.quantity,
            unit: params['unit-weight']?.unit || prev.unit,
            // Switch parameters for Marathi language
            fromCity: selectedLanguage === 'mr-IN' 
              ? params['geo-city'] || prev.fromCity
              : params['geo-city1'] || prev.fromCity,
            toCity: selectedLanguage === 'mr-IN'
              ? params['geo-city1'] || prev.toCity
              : params['geo-city'] || prev.toCity
          }));

          // If destination city is provided, update the map
          if (selectedLanguage === 'mr-IN' ? params['geo-city'] : params['geo-city1']) {
            handleDestinationChange(selectedLanguage === 'mr-IN' ? params['geo-city'] : params['geo-city1']);
          }
          
        } catch (error) {
          console.error('Translation or Dialogflow error:', error);
          toast.error('Error processing voice input');
        }
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognition);
    }
  }, [selectedLanguage]);

  const startListening = () => {
    if (recognition) {
      recognition.start();
      setIsListening(true);
    } else {
      toast.error('Speech recognition not supported in your browser');
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const translateText = async (text, sourceLang) => {
    try {
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=en&dt=t&q=${encodeURIComponent(text)}`
      );
      const data = await response.json();
      return data[0][0][0];
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      const certifications = [...formData.certifications];
      if (checked) {
        certifications.push(value);
      } else {
        const index = certifications.indexOf(value);
        if (index > -1) {
          certifications.splice(index, 1);
        }
      }
      setFormData(prev => ({
        ...prev,
        certifications
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!position) {
      toast.error('Please wait for location to be detected');
      return;
    }

    if (!formData.distributorId) {
      toast.error('Please select a distributor');
      return;
    }
    
    if (!formData.transporterId) {
      toast.error('Please select a transporter');
      return;
    }

    try {
      setLoading(true);
      const timestamp = new Date().toISOString();
      
      // Find the selected distributor and transporter to get their names
      const selectedDistributor = distributors.find(d => d.id === formData.distributorId);
      const selectedTransporter = transporters.find(t => t.id === formData.transporterId);
      
      const consignmentData = {
        ...formData,
        farmerId: currentUser.uid,
        location: {
          lat: position.lat,
          lng: position.lng
        },
        // Add names for easier display in other components
        distributorName: selectedDistributor?.companyName || 'Unknown Distributor',
        transporterName: selectedTransporter?.companyName || 'Unknown Transporter',
        status: 'created', // Initial status
        createdAt: timestamp,
        // Add pickup and dropoff locations
        pickupLocation: {
          lat: position.lat,
          lng: position.lng,
          address: 'Farm location' // This could be enhanced with geocoding
        },
        // The distributor's location would be the dropoff
        dropoffLocation: {
          lat: selectedDistributor?.warehouseLocation?.lat || 0,
          lng: selectedDistributor?.warehouseLocation?.lng || 0,
          address: selectedDistributor?.warehouseAddress || 'Distributor warehouse'
        },
        trackingHistory: [{
          status: 'created',
          location: {
            lat: position.lat,
            lng: position.lng
          },
          timestamp: timestamp,
          updatedBy: {
            id: currentUser.uid,
            role: 'farmer'
          }
        }],
        // Add blockchain transaction data
        blockchainData: {
          transactionId: null, // Will be updated after blockchain transaction
          timestamp: timestamp
        }
      };

      // Create consignment in Firebase
      const docRef = await addDoc(collection(db, 'consignments'), consignmentData);
      
      // Generate QR code and show modal
      setQrCode(docRef.id);
      setShowQRModal(true);
      
      // Prepare data for blockchain
      const blockchainConsignmentData = {
        id: docRef.id,
        vegetableName: formData.vegetableName,
        quantity: formData.quantity,
        unit: formData.unit,
        quality: formData.quality,
        farmerId: currentUser.uid,
        distributorId: formData.distributorId,
        transporterId: formData.transporterId,
        status: 'created',
        location: {
          lat: position.lat,
          lng: position.lng
        },
        timestamp: timestamp,
        updatedBy: currentUser.uid
      };
      
      // Add to blockchain
      try {
        setBlockchainStatus('processing');
        const result = await createConsignmentOnBlockchain(blockchainConsignmentData);
        
        if (result.error) {
          throw new Error(result.error);
        }

        // Only update Firebase if we have a valid transaction ID
        if (result.transactionId) {
          await updateDoc(doc(db, 'consignments', docRef.id), {
            'blockchainData.transactionId': result.transactionId,
            'blockchainData.timestamp': result.timestamp
          });
          setBlockchainStatus('completed');
          toast.success('Consignment added to blockchain successfully!');
        } else {
          throw new Error('No transaction ID received from blockchain');
        }
      } catch (error) {
        console.error('Error adding to blockchain:', error);
        setBlockchainStatus('failed');
        toast.error('Failed to add to blockchain, but consignment was saved locally');
      }
      
      toast.success('Consignment created successfully!');
    } catch (error) {
      console.error('Error creating consignment:', error);
      toast.error('Failed to create consignment');
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (e) => {
    setPosition({
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">Create New Consignment</h2>
        
        {/* Voice Input Section */}
        <div className="mb-8 bg-gray-50 p-6 rounded-xl">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Voice Input</h3>
          
          {/* Language Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Input Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="hi-IN">Hindi</option>
              <option value="mr-IN">Marathi</option>
            </select>
          </div>

          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={startListening}
              disabled={isListening}
              className={`px-4 py-2 rounded-lg ${
                isListening 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              {isListening ? 'Listening...' : ' 🎙️Start Voice Input'}
            </button>
            <button
              onClick={stopListening}
              disabled={!isListening}
              className={`px-4 py-2 rounded-lg ${
                !isListening 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-500 hover:bg-red-600'
              } text-white`}
            >
              Stop
            </button>
          </div>
          
          {spokenText && (
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-semibold">Spoken ({selectedLanguage === 'hi-IN' ? 'Hindi' : 'Marathi'}):</span> {spokenText}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Translated (English):</span> {translatedText}
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vegetable Name
                  </label>
                  <input
                    type="text"
                    name="vegetableName"
                    required
                    value={formData.vegetableName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-200"
                    placeholder="Enter vegetable name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      required
                      value={formData.quantity}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-200"
                      placeholder="Enter quantity"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit
                    </label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-200"
                    >
                      <option value="kg">Kilograms (kg)</option>
                      <option value="lb">Pounds (lb)</option>
                      <option value="g">Grams (g)</option>
                      <option value="oz">Ounces (oz)</option>
                      <option value="ton">Tons</option>
                      <option value="box">Boxes</option>
                      <option value="crate">Crates</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quality Grade
                  </label>
                  <select
                    name="quality"
                    value={formData.quality}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-200"
                  >
                    <option value="A">Grade A (Premium)</option>
                    <option value="B">Grade B (Standard)</option>
                    <option value="C">Grade C (Processing)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Storage & Handling</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Storage Conditions
                  </label>
                  <textarea
                    name="storageConditions"
                    rows={2}
                    value={formData.storageConditions}
                    onChange={handleChange}
                    placeholder="e.g., Temperature range, humidity requirements"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Instructions
                  </label>
                  <textarea
                    name="specialInstructions"
                    rows={3}
                    value={formData.specialInstructions}
                    onChange={handleChange}
                    placeholder="Any special handling or delivery instructions"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-200"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Blockchain Record</h3>
                <div className="text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${
                    blockchainStatus === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : blockchainStatus === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                  }`}>
                    {blockchainStatus === 'completed' 
                      ? 'Blockchain Ready' 
                      : blockchainStatus === 'failed'
                        ? 'Blockchain Failed'
                        : 'Will be added to blockchain'}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                This consignment will be recorded on the blockchain to ensure immutable tracking
                and transparent chain of custody from farm to table.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Supply Chain Participants</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Transporter
                  </label>
                  <select
                    name="transporterId"
                    value={formData.transporterId}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-200"
                  >
                    <option value="">Select a transporter</option>
                    {transporters.map(transporter => (
                      <option key={transporter.id} value={transporter.id}>
                        {transporter.companyName || transporter.name} - {transporter.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Distributor
                  </label>
                  <select
                    name="distributorId"
                    value={formData.distributorId}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-200"
                  >
                    <option value="">Select a distributor</option>
                    {distributors.map(distributor => (
                      <option key={distributor.id} value={distributor.id}>
                        {distributor.companyName || distributor.name} - {distributor.warehouseAddress}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    name="expectedDeliveryDate"
                    value={formData.expectedDeliveryDate}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transport Mode
                  </label>
                  <select
                    name="transportMode"
                    value={formData.transportMode}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-200"
                  >
                    <option value="road">Road</option>
                    <option value="rail">Rail</option>
                    <option value="air">Air</option>
                    <option value="ship">Ship</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Location & Route</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination City
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => handleDestinationChange(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-200"
                  placeholder="Enter destination city"
                />
              </div>

              <div className="h-[400px] rounded-xl overflow-hidden border border-gray-200">
                {MapComponent}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 transition duration-200"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Consignment'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">Consignment Created Successfully</h3>
              <div className="mb-4 flex justify-center">
                <QRCode value={qrCode} size={200} />
              </div>
              <p className="text-gray-600 mb-6">
                Scan this QR code to track this consignment. Consignment ID: {qrCode}
              </p>
              <div className="text-sm mb-6">
                <div className="flex items-center justify-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${
                    blockchainStatus === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : blockchainStatus === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                  }`}>
                    {blockchainStatus === 'completed' 
                      ? 'Added to blockchain' 
                      : blockchainStatus === 'failed'
                        ? 'Blockchain record failed'
                        : 'Adding to blockchain...'}
                  </span>
                </div>
              </div>
              <div className="space-x-3">
                <button
                  type="button"
                  onClick={() => navigate(`/consignment/${qrCode}`)}
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View Details
                </button>
                <button
                  type="button"
                  onClick={() => setShowQRModal(false)}
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}