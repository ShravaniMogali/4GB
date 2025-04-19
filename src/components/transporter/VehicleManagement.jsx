import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const VEHICLE_TYPES = ['truck', 'van', 'bike'];

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const { currentUser } = useAuth();

  const [formData, setFormData] = useState({
    type: '',
    registrationNumber: '',
    capacity: '',
    make: '',
    model: '',
    year: '',
    lastMaintenance: ''
  });

  useEffect(() => {
    fetchVehicles();
  }, [currentUser]);

  const fetchVehicles = async () => {
    try {
      const q = query(
        collection(db, 'vehicles'),
        where('transporterId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const vehicleList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVehicles(vehicleList);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const vehicleData = {
        ...formData,
        transporterId: currentUser.uid,
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      if (editingVehicle) {
        await updateDoc(doc(db, 'vehicles', editingVehicle.id), vehicleData);
        toast.success('Vehicle updated successfully');
      } else {
        await addDoc(collection(db, 'vehicles'), vehicleData);
        toast.success('Vehicle added successfully');
      }

      setFormData({
        type: '',
        registrationNumber: '',
        capacity: '',
        make: '',
        model: '',
        year: '',
        lastMaintenance: ''
      });
      setShowAddForm(false);
      setEditingVehicle(null);
      fetchVehicles();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error('Failed to save vehicle');
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      type: vehicle.type,
      registrationNumber: vehicle.registrationNumber,
      capacity: vehicle.capacity,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      lastMaintenance: vehicle.lastMaintenance
    });
    setShowAddForm(true);
  };

  const handleDelete = async (vehicleId) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'vehicles', vehicleId));
      toast.success('Vehicle deleted successfully');
      fetchVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to delete vehicle');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Vehicle Management</h1>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingVehicle(null);
            setFormData({
              type: '',
              registrationNumber: '',
              capacity: '',
              make: '',
              model: '',
              year: '',
              lastMaintenance: ''
            });
          }}
          className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
        >
          {showAddForm ? 'Cancel' : 'Add Vehicle'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Vehicle Type</label>
              <select
                name="type"
                required
                value={formData.type}
                onChange={handleInputChange}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select Type</option>
                {VEHICLE_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Registration Number</label>
              <input
                type="text"
                name="registrationNumber"
                required
                value={formData.registrationNumber}
                onChange={handleInputChange}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Capacity (kg)</label>
              <input
                type="number"
                name="capacity"
                required
                value={formData.capacity}
                onChange={handleInputChange}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Make</label>
              <input
                type="text"
                name="make"
                required
                value={formData.make}
                onChange={handleInputChange}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Model</label>
              <input
                type="text"
                name="model"
                required
                value={formData.model}
                onChange={handleInputChange}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Year</label>
              <input
                type="number"
                name="year"
                required
                value={formData.year}
                onChange={handleInputChange}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Last Maintenance Date</label>
              <input
                type="date"
                name="lastMaintenance"
                value={formData.lastMaintenance}
                onChange={handleInputChange}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              >
                {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {vehicle.make} {vehicle.model}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {vehicle.year} - {vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1)}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  vehicle.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {vehicle.status}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-500 mb-4">
                <p>Registration: {vehicle.registrationNumber}</p>
                <p>Capacity: {vehicle.capacity} kg</p>
                {vehicle.lastMaintenance && (
                  <p>Last Maintenance: {new Date(vehicle.lastMaintenance).toLocaleDateString()}</p>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(vehicle)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(vehicle.id)}
                  className="flex-1 bg-red-100 text-red-700 py-2 px-4 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {vehicles.length === 0 && !showAddForm && (
        <div className="text-center py-12">
          <p className="text-gray-500">No vehicles added yet. Click "Add Vehicle" to get started.</p>
        </div>
      )}
    </div>
  );
} 