import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useBlockchain } from '../../contexts/BlockchainContext';
import toast from 'react-hot-toast';

export default function ConsignmentSale() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { updateConsignmentStatus } = useBlockchain();
  const [consignment, setConsignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [saleComplete, setSaleComplete] = useState(false);

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

      // Check if consignment is ready for sale
      if (consignmentData.status !== 'ready_for_sale') {
        setError('This consignment is not available for sale');
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo({
      ...customerInfo,
      [name]: value
    });
  };

  const handleSale = async (e) => {
    e.preventDefault();
    
    // Simple validation for customer info
    if (!customerInfo.name || !customerInfo.email) {
      toast.error('Please provide customer name and email');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create sale record with customer info
      const saleData = {
        customerInfo,
        saleDate: new Date().toISOString(),
        saleBy: {
          id: currentUser.uid,
          name: currentUser.displayName || 'Unknown User'
        }
      };
      
      // Update consignment status
      await updateConsignmentStatus(id, 'sold', null, saleData);
      
      // Update UI
      setSaleComplete(true);
      setLoading(false);
    } catch (error) {
      console.error('Error completing sale:', error);
      toast.error('Failed to complete sale');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Processing sale...</p>
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

  if (saleComplete) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-green-50">
            <h2 className="text-lg font-medium text-green-800">Sale Completed Successfully</h2>
            <p className="mt-1 max-w-2xl text-sm text-green-600">
              The consignment has been marked as sold.
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="space-y-4">
              <p className="text-gray-700">
                The consignment has been successfully marked as sold to <span className="font-medium">{customerInfo.name}</span>.
              </p>
              <p className="text-gray-700">
                A receipt has been generated and a confirmation email has been sent to <span className="font-medium">{customerInfo.email}</span>.
              </p>
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Sale Details</h3>
                <p className="text-sm text-gray-600">Product: {consignment?.vegetableName}</p>
                <p className="text-sm text-gray-600">Quantity: {consignment?.quantity} {consignment?.unit}</p>
                <p className="text-sm text-gray-600">Date: {new Date().toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-6 flex space-x-3">
              <Link
                to="/retailer"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Return to Dashboard
              </Link>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Complete Sale</h1>
        <Link to="/retailer" className="text-primary-600 hover:text-primary-800 flex items-center">
          <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Cancel
        </Link>
      </div>

      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-2">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h2 className="text-lg font-medium text-gray-900">Customer Information</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Enter the customer's information to complete the sale
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <form onSubmit={handleSale}>
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={customerInfo.name}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={customerInfo.email}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      value={customerInfo.phone}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                      Delivery Address (Optional)
                    </label>
                    <input
                      type="text"
                      name="address"
                      id="address"
                      value={customerInfo.address}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    {loading ? 'Processing...' : 'Complete Sale'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h2 className="text-lg font-medium text-gray-900">Product Details</h2>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {consignment?.vegetableName}
                </h3>
                <p className="text-sm text-gray-600">
                  Quantity: {consignment?.quantity} {consignment?.unit}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Quality: {consignment?.quality || 'Standard'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Origin: {consignment?.origin || 'Local'}
                </p>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-500">Farmer:</span>
                  <span className="text-gray-900">{consignment?.farmerName}</span>
                </div>
                <div className="flex justify-between text-sm font-medium mt-2">
                  <span className="text-gray-500">Harvest Date:</span>
                  <span className="text-gray-900">
                    {consignment?.harvestDate ? new Date(consignment.harvestDate).toLocaleDateString() : 'Not specified'}
                  </span>
                </div>
              </div>

              {consignment?.qrCode && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2 text-center">Product Authentication</p>
                  <div className="flex justify-center">
                    <img 
                      src={`data:image/png;base64,${consignment.qrCode}`} 
                      alt="Product QR Code" 
                      className="h-32 w-32"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 