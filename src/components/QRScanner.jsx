import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import toast from 'react-hot-toast';

export default function QRScanner() {
  const [scanResult, setScanResult] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: {
        width: 250,
        height: 250,
      },
      fps: 5,
    });

    function success(result) {
      scanner.clear();
      setScanResult(result);
      
      // Extract consignment ID from the scanned URL
      const consignmentId = result.split('/').pop();
      if (consignmentId) {
        navigate(`/consignment/${consignmentId}`);
      } else {
        toast.error('Invalid QR code');
      }
    }

    function error(err) {
      console.warn(err);
    }

    scanner.render(success, error);

    return () => {
      scanner.clear();
    };
  }, [navigate]);

  return (
    <div className="max-w-lg mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Scan Consignment QR Code</h2>
      
      <div className="bg-white p-4 rounded-lg shadow">
        {scanResult ? (
          <div className="text-center">
            <p className="text-green-600 font-medium">QR Code Scanned Successfully!</p>
            <p className="text-sm text-gray-600 mt-2">Redirecting to consignment details...</p>
          </div>
        ) : (
          <div>
            <div id="reader" className="mb-4"></div>
            <p className="text-sm text-gray-600 text-center">
              Position the QR code within the frame to scan
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 