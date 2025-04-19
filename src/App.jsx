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
import { BlockchainProvider } from './contexts/BlockchainContext';
import BlockchainDashboard from './components/BlockchainDashboard';
import './styles/design-system.css';

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
        <div className="relative">
          <div className="w-16 h-16 border-2 border-leaf-primary rounded-full animate-spin border-t-transparent"></div>
          <div className="crypto-dot absolute top-0 animate-pulse"></div>
          <div className="crypto-dot absolute right-0 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          <div className="crypto-dot absolute bottom-0 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="crypto-dot absolute left-0 animate-pulse" style={{ animationDelay: '1.5s' }}></div>
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
        <BlockchainProvider>
          <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sky-light">
            <div className="crypto-grid absolute inset-0 opacity-5 pointer-events-none"></div>
            <Navbar />
            <main className="container-app py-8">
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
              </Routes>
            </main>
            <footer className="py-6 mt-12 bg-soil-dark text-neutral-100">
              <div className="container-app">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-neutral-50">Farm-to-Table Blockchain</h3>
                    <p className="text-sm text-neutral-300">Transparent supply chain tracking powered by Hyperledger Fabric</p>
                  </div>
                  <div className="flex gap-md">
                    <div className="blockchain-badge">Hyperledger Fabric</div>
                    <div className="blockchain-badge">Immutable</div>
                    <div className="blockchain-badge">Secure</div>
                  </div>
                </div>
              </div>
            </footer>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  borderRadius: 'var(--radius-md)',
                  background: 'white',
                  color: 'var(--neutral-900)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '16px',
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
        </BlockchainProvider>
      </AuthProvider>
    </Router>
  );
}

export default App; 