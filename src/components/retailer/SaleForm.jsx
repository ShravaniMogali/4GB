import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useBlockchain } from '../../contexts/BlockchainContext';
import { useAuth } from '../../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const CONSIGNMENT_STATUS = {
  SOLD: 'sold',
  READY_FOR_SALE: 'ready_for_sale'
};

export default function SaleForm() {
  const { id } = useParams();
  const [consignment, setConsignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saleQuantity, setSaleQuantity] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [saleDetails, setSaleDetails] = useState(null);
  const { updateConsignmentStatus, createConsignmentOnBlockchain } = useBlockchain();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchConsignment();
  }, [id]);

  const fetchConsignment = async () => {
    try {
      const docRef = doc(db, 'consignments', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const consignmentData = { id: docSnap.id, ...docSnap.data() };
        
        // Check if this consignment belongs to the current retailer
        if (consignmentData.retailerId !== currentUser.uid) {
          toast.error('You do not have permission to view this consignment');
          navigate('/retailer');
          return;
        }

        // Check if consignment is ready for sale
        if (consignmentData.status !== CONSIGNMENT_STATUS.READY_FOR_SALE) {
          toast.error('This consignment is not available for sale');
          navigate('/retailer');
          return;
        }

        setConsignment(consignmentData);
        // Set default sale quantity to the available quantity
        setSaleQuantity(consignmentData.quantity.toString());
      } else {
        toast.error('Consignment not found');
        navigate('/retailer');
      }
    } catch (error) {
      console.error('Error fetching consignment:', error);
      toast.error('Failed to fetch consignment details');
    } finally {
      setLoading(false);
    }
  };

  const handleSale = async (e) => {
    e.preventDefault();
    
    if (!consignment) return;
    
    const quantity = parseFloat(saleQuantity);
    const amount = parseFloat(paymentAmount);
    
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    
    if (quantity > consignment.quantity) {
      toast.error('Sale quantity cannot exceed available quantity');
      return;
    }
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    try {
      const remainingQuantity = consignment.quantity - quantity;
      const saleTimestamp = new Date().toISOString();
      
      const saleData = {
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        quantity,
        amount,
        paymentMethod,
        timestamp: saleTimestamp,
        retailerId: currentUser.uid,
        retailerName: currentUser.displayName || currentUser.email
      };

      const statusUpdate = {
        status: remainingQuantity > 0 ? CONSIGNMENT_STATUS.READY_FOR_SALE : CONSIGNMENT_STATUS.SOLD,
        timestamp: saleTimestamp,
        updatedBy: {
          id: currentUser.uid,
          role: 'retailer'
        },
        saleDetails: saleData
      };

      const updateData = {
        status: remainingQuantity > 0 ? CONSIGNMENT_STATUS.READY_FOR_SALE : CONSIGNMENT_STATUS.SOLD,
        quantity: remainingQuantity,
        trackingHistory: [...(consignment.trackingHistory || []), statusUpdate],
        sales: [...(consignment.sales || []), saleData]
      };

      // Update in Firebase
      const consignmentRef = doc(db, 'consignments', id);
      await updateDoc(consignmentRef, updateData);
      
      try {
        // Update blockchain
        await updateConsignmentStatus(id, remainingQuantity > 0 ? CONSIGNMENT_STATUS.READY_FOR_SALE : CONSIGNMENT_STATUS.SOLD);
        toast.success('Sale recorded on blockchain');
      } catch (blockchainError) {
        console.error('Blockchain update error:', blockchainError);
        toast.error('Failed to update blockchain but sale was recorded');
      }

      setSaleDetails({
        ...saleData,
        consignmentId: consignment.id,
        vegetableName: consignment.vegetableName,
        unit: consignment.unit,
        farmerName: consignment.farmerName,
        distributorName: consignment.distributorName,
        remainingQuantity
      });
      
      setShowReceipt(true);
    } catch (error) {
      console.error('Error processing sale:', error);
      toast.error('Failed to process sale');
    }
  };

  const printReceipt = () => {
    const receiptWindow = window.open('', '_blank');
    const receipt = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sale Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .receipt { max-width: 400px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .details { margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .total { border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h2>Farm-to-Table</h2>
              <p>Sale Receipt</p>
            </div>
            <div class="details">
              <div class="row">
                <span>Date:</span>
                <span>${new Date(saleDetails.timestamp).toLocaleString()}</span>
              </div>
              <div class="row">
                <span>Receipt No:</span>
                <span>${saleDetails.consignmentId.substring(0, 8)}</span>
              </div>
              <div class="row">
                <span>Item:</span>
                <span>${saleDetails.vegetableName}</span>
              </div>
              <div class="row">
                <span>Quantity:</span>
                <span>${saleDetails.quantity} ${saleDetails.unit}</span>
              </div>
              <div class="row">
                <span>Customer:</span>
                <span>${saleDetails.customerName}</span>
              </div>
              <div class="row">
                <span>Email:</span>
                <span>${saleDetails.customerEmail}</span>
              </div>
              <div class="row">
                <span>Phone:</span>
                <span>${saleDetails.customerPhone || 'N/A'}</span>
              </div>
              <div class="row">
                <span>Address:</span>
                <span>${saleDetails.customerAddress || 'N/A'}</span>
              </div>
              <div class="row">
                <span>Payment Method:</span>
                <span>${saleDetails.paymentMethod}</span>
              </div>
              <div class="total">
                <div class="row">
                  <strong>Total Amount:</strong>
                  <strong>₹${saleDetails.amount}</strong>
                </div>
              </div>
            </div>
            <div class="footer">
              <p>Thank you for your purchase!</p>
              <p>This is a blockchain-verified transaction</p>
            </div>
            <div class="no-print" style="text-align: center; margin-top: 20px;">
              <button onclick="window.print()">Print Receipt</button>
            </div>
          </div>
        </body>
      </html>
    `;
    
    receiptWindow.document.write(receipt);
    receiptWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!consignment) {
    return null;
  }

  if (showReceipt) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Sale Completed</h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Customer:</span>
              <span className="font-medium">{saleDetails.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Quantity:</span>
              <span className="font-medium">{saleDetails.quantity} {saleDetails.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">₹{saleDetails.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Method:</span>
              <span className="font-medium">{saleDetails.paymentMethod}</span>
            </div>
            {saleDetails.remainingQuantity > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Remaining Quantity:</span>
                <span className="font-medium">{saleDetails.remainingQuantity} {saleDetails.unit}</span>
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={() => navigate('/retailer')}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Back to Dashboard
            </button>
            <button
              onClick={printReceipt}
              className="px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-md"
            >
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Complete Sale</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
              <p className="text-gray-600 mb-4">Enter the customer's information to complete the sale</p>
              
              <form onSubmit={handleSale} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Address (Optional)
                  </label>
                  <textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sale Quantity ({consignment.unit})
                  </label>
                  <input
                    type="number"
                    value={saleQuantity}
                    onChange={(e) => setSaleQuantity(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                    min="0.01"
                    max={consignment.quantity}
                    step="0.01"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Available: {consignment.quantity} {consignment.unit}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/retailer')}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-md"
                  >
                    Complete Sale
                  </button>
                </div>
              </form>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Product Details</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <h4 className="font-medium">{consignment.vegetableName}</h4>
                  <p className="text-gray-600">Available Quantity: {consignment.quantity} {consignment.unit}</p>
                </div>
                
                <div>
                  <p className="text-gray-600">Quality: {consignment.quality}</p>
                  <p className="text-gray-600">Origin: {consignment.origin || 'Local'}</p>
                </div>

                <div>
                  <p className="text-gray-600">Farmer: {consignment.farmerName || 'Not specified'}</p>
                  <p className="text-gray-600">Harvest Date: {consignment.harvestDate || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 