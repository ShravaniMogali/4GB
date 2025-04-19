import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const STOCK_STATUS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  OUT_OF_STOCK: 'out_of_stock'
};

export default function InventoryManagement() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const { currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    productName: '',
    quantity: '',
    unit: 'kg',
    category: 'vegetables',
    location: '',
    expiryDate: '',
    batchNumber: '',
    notes: ''
  });

  useEffect(() => {
    fetchInventory();
  }, [currentUser]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      
      const q = query(
        collection(db, 'inventory'),
        where('distributorId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const inventoryList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setInventory(inventoryList);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const timestamp = new Date().toISOString();
      const quantity = Number(formData.quantity);
      
      // Determine stock status based on quantity
      let stockStatus = STOCK_STATUS.MEDIUM;
      if (quantity <= 10) stockStatus = STOCK_STATUS.LOW;
      if (quantity >= 100) stockStatus = STOCK_STATUS.HIGH;
      if (quantity <= 0) stockStatus = STOCK_STATUS.OUT_OF_STOCK;
      
      const inventoryItem = {
        ...formData,
        quantity: quantity,
        distributorId: currentUser.uid,
        stockStatus,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      await addDoc(collection(db, 'inventory'), inventoryItem);
      
      toast.success('Inventory item added successfully');
      setShowAddModal(false);
      resetForm();
      fetchInventory();
    } catch (error) {
      console.error('Error adding inventory item:', error);
      toast.error('Failed to add inventory item');
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = async (e) => {
    e.preventDefault();
    
    if (!selectedItem) return;
    
    try {
      setLoading(true);
      
      const timestamp = new Date().toISOString();
      const quantity = Number(formData.quantity);
      
      // Determine stock status based on quantity
      let stockStatus = STOCK_STATUS.MEDIUM;
      if (quantity <= 10) stockStatus = STOCK_STATUS.LOW;
      if (quantity >= 100) stockStatus = STOCK_STATUS.HIGH;
      if (quantity <= 0) stockStatus = STOCK_STATUS.OUT_OF_STOCK;
      
      const inventoryUpdate = {
        ...formData,
        quantity: quantity,
        stockStatus,
        updatedAt: timestamp
      };
      
      await updateDoc(doc(db, 'inventory', selectedItem.id), inventoryUpdate);
      
      toast.success('Inventory item updated successfully');
      setShowEditModal(false);
      resetForm();
      fetchInventory();
    } catch (error) {
      console.error('Error updating inventory item:', error);
      toast.error('Failed to update inventory item');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setFormData({
      productName: item.productName,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      location: item.location,
      expiryDate: item.expiryDate,
      batchNumber: item.batchNumber,
      notes: item.notes
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      productName: '',
      quantity: '',
      unit: 'kg',
      category: 'vegetables',
      location: '',
      expiryDate: '',
      batchNumber: '',
      notes: ''
    });
    setSelectedItem(null);
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case STOCK_STATUS.LOW:
        return 'bg-yellow-100 text-yellow-800';
      case STOCK_STATUS.MEDIUM:
        return 'bg-blue-100 text-blue-800';
      case STOCK_STATUS.HIGH:
        return 'bg-green-100 text-green-800';
      case STOCK_STATUS.OUT_OF_STOCK:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Add New Item
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : inventory.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="w-16 h-16 mx-auto bg-neutral-100 rounded-full flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 12V16M10 14H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">No inventory items found</h2>
          <p className="text-gray-500 mb-6">Start adding items to your inventory</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            Add Your First Item
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{item.productName}</div>
                    <div className="text-sm text-gray-500">Batch: {item.batchNumber || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.location || 'Not specified'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'Not specified'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStockStatusColor(item.stockStatus)}`}>
                      {item.stockStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(item)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Add Inventory Item</h2>
            <form onSubmit={handleAddItem}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="kg">Kilograms</option>
                      <option value="g">Grams</option>
                      <option value="lb">Pounds</option>
                      <option value="units">Units</option>
                      <option value="boxes">Boxes</option>
                      <option value="crates">Crates</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="vegetables">Vegetables</option>
                    <option value="fruits">Fruits</option>
                    <option value="dairy">Dairy</option>
                    <option value="meat">Meat</option>
                    <option value="grains">Grains</option>
                    <option value="processed">Processed Food</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Warehouse A, Shelf B3"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                  <input
                    type="text"
                    name="batchNumber"
                    value={formData.batchNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows="2"
                  ></textarea>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  {loading ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Edit Inventory Item</h2>
            <form onSubmit={handleEditItem}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="kg">Kilograms</option>
                      <option value="g">Grams</option>
                      <option value="lb">Pounds</option>
                      <option value="units">Units</option>
                      <option value="boxes">Boxes</option>
                      <option value="crates">Crates</option>
                    </select>
                  </div>
                </div>
                
                {/* Other form fields (same as Add Modal) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="vegetables">Vegetables</option>
                    <option value="fruits">Fruits</option>
                    <option value="dairy">Dairy</option>
                    <option value="meat">Meat</option>
                    <option value="grains">Grains</option>
                    <option value="processed">Processed Food</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                  <input
                    type="text"
                    name="batchNumber"
                    value={formData.batchNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows="2"
                  ></textarea>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  {loading ? 'Updating...' : 'Update Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 