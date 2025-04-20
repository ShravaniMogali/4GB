import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import PrivateRoute from './components/auth/PrivateRoute';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/Dashboard';
import ConsignmentForm from './components/ConsignmentForm';
import QRScanner from './components/QRScanner';
import ConsignmentDetails from './components/ConsignmentDetails';
import LiveTracking from './components/LiveTracking';
import Navbar from './components/Navbar';
import TransporterDashboard from './components/transporter/TransporterDashboard';
import DistributorDashboard from './components/distributor/DistributorDashboard';
import RetailerDashboard from './components/retailer/RetailerDashboard';
import RetailerConsignmentDetails from './components/retailer/RetailerConsignmentDetails';
import ConsignmentSale from './components/retailer/ConsignmentSale';
import SaleForm from './components/retailer/SaleForm';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import BlockchainDashboard from './components/BlockchainDashboard';
import BlockchainDataExplorer from './components/BlockchainDataExplorer';
import './styles/design-system.css';
import ChatbotPage from './components/ChatBot';

// Role-based route component
const RoleRoute = ({ children, allowedRoles }) => {
  const { currentUser, getUserRole } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (currentUser) {
        const role = await getUserRole();
        setUserRole(role);
      }
      setLoading(false);
    };
    fetchRole();
  }, [currentUser, getUserRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="glass-panel-dark p-10 rounded-xl flex flex-col items-center">
          <div className="relative">
            <div className="w-16 h-16 border-2 border-leaf-primary rounded-full animate-spin border-t-transparent"></div>
            <div className="crypto-dot absolute top-0 animate-pulse"></div>
            <div className="crypto-dot absolute right-0 animate-pulse" style={{animationDelay: '0.5s'}}></div>
            <div className="crypto-dot absolute bottom-0 animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="crypto-dot absolute left-0 animate-pulse" style={{animationDelay: '1.5s'}}></div>
          </div>
          <p className="text-leaf-primary mt-4 animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(userRole)) {
    // Redirect based on role
    if (userRole === 'transporter') {
      return <Navigate to="/transporter" />;
    }
    if (userRole === 'distributor') {
      return <Navigate to="/distributor" />;
    }
    if (userRole === 'retailer') {
      return <Navigate to="/retailer" />;
    }
    // Default redirect to main dashboard
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen relative overflow-hidden">
          {/* Background elements */}
          <div className="hex-grid absolute inset-0 opacity-10 pointer-events-none"></div>
          
          {/* Moving gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-sky-light to-neutral-50 z-[-2]"></div>
          
          {/* Animated blockchain patterns */}
          <div className="blockchain-grid absolute inset-0 opacity-5 pointer-events-none z-[-1]"></div>
          
          {/* Decorative elements */}
          <div className="absolute top-20 right-10 w-64 h-64 bg-gradient-to-br from-blockchain-purple/10 to-transparent rounded-full blur-3xl opacity-20 animate-float pointer-events-none"></div>
          <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-leaf-primary/10 to-transparent rounded-full blur-3xl opacity-20 animate-float pointer-events-none" style={{animationDelay: '1s'}}></div>
          
          <Navbar />
          <main className="container-app py-8 relative z-10">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['farmer']}>
                    <Dashboard />
                  </RoleRoute>
                </PrivateRoute>
              } />
              <Route path="/transporter" element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['transporter']}>
                    <TransporterDashboard />
                  </RoleRoute>
                </PrivateRoute>
              } />
              <Route path="/distributor" element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['distributor']}>
                    <DistributorDashboard />
                  </RoleRoute>
                </PrivateRoute>
              } />
              <Route path="/retailer" element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['retailer']}>
                    <RetailerDashboard />
                  </RoleRoute>
                </PrivateRoute>
              } />
              <Route path="/retailer/consignment/:id" element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['retailer']}>
                    <RetailerConsignmentDetails />
                  </RoleRoute>
                </PrivateRoute>
              } />
              <Route path="/retailer/sale/:id" element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['retailer']}>
                    <SaleForm />
                  </RoleRoute>
                </PrivateRoute>
              } />
              <Route path="/create-consignment" element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['farmer']}>
                    <ConsignmentForm />
                  </RoleRoute>
                </PrivateRoute>
              } />
              <Route path="/scan" element={<QRScanner />} />
              <Route path="/consignment/:id" element={<ConsignmentDetails />} />
              <Route path="/track/:id" element={<LiveTracking />} />
              <Route path="/blockchain" element={
                <PrivateRoute>
                  <BlockchainDashboard />
                </PrivateRoute>
              } />
              <Route path="/blockchain-explorer" element={
                <PrivateRoute>
                  <BlockchainDataExplorer />
                </PrivateRoute>
              } />
              <Route path="/chatbot" element={
                <PrivateRoute>
                  <ChatbotPage />
                </PrivateRoute>
              } />
            </Routes>
          </main>
          
          <Toaster 
            position="top-right" 
            toastOptions={{
              style: {
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                color: 'var(--neutral-900)',
                boxShadow: 'var(--shadow-lg)',
                padding: '16px',
                border: '1px solid rgba(219, 222, 231, 0.7)',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: 'var(--leaf-primary)',
                  secondary: 'white',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: 'var(--harvest-red)',
                  secondary: 'white',
                },
              },
            }}
          />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App; 