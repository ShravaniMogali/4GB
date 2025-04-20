import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';

const QRScanner = ()=> {
  const [scanResult, setScanResult] = useState(null);
  const [scannerReady, setScannerReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const processQrResult = (result) => {
    setScanResult(result);
    // Extract consignment ID from the scanned URL
    const consignmentId = result.split('/').pop();
    if (consignmentId) {
      toast.success('QR code scanned successfully!');
      navigate(`/consignment/${consignmentId}`);
    } else {
      toast.error('Invalid QR code format');
    }
  };

  useEffect(() => {
    // Set up the QR code scanner
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: {
        width: 250,
        height: 250,
      },
      fps: 5,
      rememberLastUsedCamera: true,
      showTorchButtonIfSupported: true,
    });

    function success(result) {
      scanner.clear();
      processQrResult(result);
    }

    function error(err) {
      console.warn(err);
      if (
        err.includes("Camera access is denied") || 
        err.includes("Permission denied") ||
        err.includes("NotAllowedError") ||
        err.includes("PermissionDeniedError")
      ) {
        setCameraError("Camera access was denied. Please grant permission or try uploading an image instead.");
      } else if (err.includes("No camera found")) {
        setCameraError("No camera detected on your device. Please try uploading an image instead.");
      } else {
        setCameraError("Error accessing camera. Please try uploading an image instead.");
      }
    }

    scanner.render(success, error);
    scannerRef.current = scanner;
    setScannerReady(true);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [navigate]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsScanning(true);
      
      // Create a file URL
      const fileUrl = URL.createObjectURL(file);
      
      // Create an image element to get dimensions
      const img = new Image();
      img.src = fileUrl;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      // Clean up scanner if active
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
      
      // Use Html5Qrcode directly for file scanning
      const html5QrCode = new Html5Qrcode("reader");
      const config = { experimentalFeatures: { useBarCodeDetectorIfSupported: true } };
      
      try {
        const qrCodeMessage = await html5QrCode.scanFile(file, config);
        html5QrCode.clear();
        processQrResult(qrCodeMessage);
      } catch (err) {
        console.error("QR Code scan error:", err);
        toast.error("Couldn't detect a valid QR code in this image");
        // Reinitialize the scanner
        if (scannerRef.current) {
          scannerRef.current.render(
            (result) => processQrResult(result),
            (err) => console.warn(err)
          );
        }
      }
      
      // Clean up the object URL
      URL.revokeObjectURL(fileUrl);
    } catch (error) {
      console.error("File processing error:", error);
      toast.error("Error processing image");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Scan Consignment QR Code</h2>
      
      <div className="bg-white p-4 rounded-lg shadow">
        {scanResult ? (
          <div className="text-center">
            <p className="text-green-600 font-medium">QR Code Scanned Successfully!</p>
            <p className="text-sm text-gray-600 mt-2">Redirecting to consignment details...</p>
            <button 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => {
                setScanResult(null);
                if (scannerRef.current) {
                  scannerRef.current.render(
                    (result) => processQrResult(result),
                    (err) => console.warn(err)
                  );
                }
              }}
            >
              Scan Another Code
            </button>
          </div>
        ) : (
          <div>
            <div id="reader" className="mb-4"></div>
            
            {cameraError && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-yellow-700">{cameraError}</p>
              </div>
            )}
            
            <div className="mt-6">
              <p className="text-sm text-gray-600 text-center mb-4">
                {scannerReady ? 
                  "Position the QR code within the frame to scan" : 
                  "Loading scanner..."}
              </p>
              
              <p className="text-center text-gray-600 mb-2">- OR -</p>
              
              <div className="flex flex-col items-center">
                <label 
                  htmlFor="qr-file" 
                  className="cursor-pointer px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {isScanning ? "Processing..." : "Upload QR Code Image"}
                </label>
                <input
                  id="qr-file"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  disabled={isScanning}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Upload a clear image containing a QR code
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
  export default QRScanner;