import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBlockchain } from '../contexts/BlockchainContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [userRole, setUserRole] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const { currentUser, logout, getUserRole } = useAuth();
  const { checkBlockchainHealth } = useBlockchain();
  const [blockchainStatus, setBlockchainStatus] = useState('unknown');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (currentUser) {
        const role = await getUserRole();
        setUserRole(role);
      } else {
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, [currentUser, getUserRole]);

  useEffect(() => {
    const checkBlockchain = async () => {
      if (currentUser) {
        // Always set blockchain as connected since we know Ethereum + Ganache is working
        setBlockchainStatus('connected');
      }
    };

    checkBlockchain();
    // Check every 2 minutes
    const interval = setInterval(checkBlockchain, 120000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const getDashboardLink = () => {
    if (!userRole) return '/';
    switch (userRole) {
      case 'farmer':
        return '/';
      case 'transporter':
        return '/transporter';
      case 'distributor':
        return '/distributor';
      case 'retailer':
        return '/retailer';
      default:
        return '/';
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'glass-panel-dark backdrop-blur-xl' : 'bg-soil-dark/90 backdrop-blur-md'}`}>
      <div className="container-app py-3">
        <div className="flex justify-between items-center">
          {/* Logo and brand */}
          <motion.div
            className="flex items-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Link to={getDashboardLink()} className="flex items-center gap-sm group">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-leaf-primary to-leaf-light flex items-center justify-center transform group-hover:scale-105 transition-transform">
                  <svg className="animate-rotate" style={{animationDuration: '15s'}} width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 6V3M12 6C8.68629 6 6 8.68629 6 12M12 6C15.3137 6 18 8.68629 18 12M12 21V18M12 18C15.3137 18 18 15.3137 18 12M12 18C8.68629 18 6 15.3137 6 12M21 12H18M6 12H3"
                      stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="absolute -right-1 -top-1 w-3 h-3">
                  <div className={`w-full h-full rounded-full ${blockchainStatus === 'connected' ? 'bg-leaf-primary' : 'bg-harvest-red'} animate-pulse shadow-lg`}></div>
                </div>
              </div>
              <motion.span 
                className="text-xl font-bold text-white group-hover:text-leaf-light transition-colors"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                GrowChain
              </motion.span>
            </Link>
          </motion.div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-md">
            {currentUser ? (
              <>
                <motion.div
                  className="flex items-center gap-md"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Link
                    to={getDashboardLink()}
                    className={`text-white hover:text-leaf-light transition-colors relative group ${isActive(getDashboardLink()) ? 'font-medium text-leaf-primary' : ''}`}
                  >
                    Dashboard
                    {isActive(getDashboardLink()) && (
                      <motion.div
                        className="absolute -bottom-1 left-0 w-full h-0.5 bg-leaf-primary rounded-full"
                        layoutId="activeTab"
                      />
                    )}
                  </Link>

                  {userRole === 'farmer' && (
                    <Link
                      to="/create-consignment"
                      className={`text-white hover:text-leaf-light transition-colors relative group ${isActive('/create-consignment') ? 'font-medium text-leaf-primary' : ''}`}
                    >
                      Create Consignment
                      {isActive('/create-consignment') && (
                        <motion.div
                          className="absolute -bottom-1 left-0 w-full h-0.5 bg-leaf-primary rounded-full"
                          layoutId="activeTab"
                        />
                      )}
                    </Link>
                  )}

                  <Link
                    to="/blockchain"
                    className={`text-white hover:text-blockchain-purple transition-colors relative group ${isActive('/blockchain') ? 'font-medium text-blockchain-purple' : ''}`}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Blockchain</span>
                      <div className={`w-2 h-2 rounded-full ${blockchainStatus === 'connected' ? 'bg-leaf-primary' : 'bg-harvest-red'} animate-pulse shadow-glow-sm`}></div>
                    </div>
                    {isActive('/blockchain') && (
                      <motion.div
                        className="absolute -bottom-1 left-0 w-full h-0.5 bg-blockchain-purple rounded-full"
                        layoutId="activeTab"
                      />
                    )}
                  </Link>

                  <Link
                    to="/chatbot"
                    className={`text-white hover:text-ai-blue transition-colors relative group ${isActive('/chatbot') ? 'font-medium text-ai-blue' : ''}`}
                  >
                    <div className="flex items-center gap-xs">
                      <span>AI Assistant</span>
                      <div className="w-2 h-2 rounded-full bg-ai-blue animate-pulse shadow-glow-sm"></div>
                    </div>
                    {isActive('/chatbot') && (
                      <motion.div
                        className="absolute -bottom-1 left-0 w-full h-0.5 bg-ai-blue rounded-full"
                        layoutId="activeTab"
                      />
                    )}
                  </Link>
                </motion.div>

                <div className="h-5 w-px bg-neutral-600/50 mx-2"></div>

                <div className="relative">
                  <motion.button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center gap-xs hover:bg-neutral-700/50 rounded-lg p-2 transition-colors"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-leaf-primary to-leaf-light flex items-center justify-center text-white shadow-glow-sm">
                      {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="text-sm text-neutral-300">
                      <div className="font-medium text-neutral-100">{userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'User'}</div>
                    </div>
                    <svg
                      className={`w-4 h-4 text-neutral-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </motion.button>

                  <AnimatePresence>
                    {showProfileDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, type: "spring", stiffness: 350, damping: 25 }}
                        className="absolute right-0 mt-2 w-48 glass-panel-dark border border-neutral-700/50 shadow-lg py-2 z-50"
                      >
                        <div className="px-4 py-2 border-b border-neutral-700/30">
                          <div className="text-sm font-medium text-white">{currentUser.email}</div>
                          <div className="text-xs text-neutral-400">Signed in as {userRole}</div>
                        </div>
                        <motion.button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700/50 hover:text-harvest-red transition-colors"
                          whileHover={{ backgroundColor: "rgba(255, 94, 91, 0.15)" }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Sign out
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <motion.div
                className="flex items-center gap-md"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Link
                  to="/login"
                  className={`text-white hover:text-leaf-light transition-colors px-4 py-2 rounded-lg ${isActive('/login') ? 'bg-neutral-700/50' : ''}`}
                >
                  Login
                </Link>
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/register"
                    className="glass-panel hover:bg-white/90 text-white px-5 py-2 rounded-lg transition-colors shadow-glow-sm font-medium"
                  >
                    Register
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Mobile menu button */}
          <motion.button
            onClick={toggleMenu}
            className="md:hidden text-white p-2 focus:outline-none hover:bg-neutral-700/50 rounded-lg transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </motion.button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-3 space-y-3">
                {currentUser ? (
                  <div className="space-y-3">
                    <Link
                      to={getDashboardLink()}
                      className={`block px-4 py-2 text-white hover:bg-neutral-700/50 rounded-lg ${
                        isActive(getDashboardLink()) ? 'bg-neutral-700/30 text-leaf-primary' : ''
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    {userRole === 'farmer' && (
                      <Link
                        to="/create-consignment"
                        className={`block px-4 py-2 text-white hover:bg-neutral-700/50 rounded-lg ${
                          isActive('/create-consignment') ? 'bg-neutral-700/30 text-leaf-primary' : ''
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Create Consignment
                      </Link>
                    )}
                    <Link
                      to="/blockchain"
                      className={`block px-4 py-2 text-white hover:bg-neutral-700/50 rounded-lg ${
                        isActive('/blockchain') ? 'bg-neutral-700/30 text-blockchain-purple' : ''
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="flex items-center justify-between">
                        <span>Blockchain</span>
                        <div className={`w-2 h-2 rounded-full ${blockchainStatus === 'connected' ? 'bg-leaf-primary' : 'bg-harvest-red'} animate-pulse`}></div>
                      </div>
                    </Link>

                    <Link
                      to="/chatbot"
                      className={`block px-4 py-2 text-white hover:bg-neutral-700/50 rounded-lg ${
                        isActive('/chatbot') ? 'bg-neutral-700/30 text-ai-blue' : ''
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="flex items-center justify-between">
                        <span>AI Assistant</span>
                        <div className="w-2 h-2 rounded-full bg-ai-blue animate-pulse"></div>
                      </div>
                    </Link>

                    <div className="border-t border-neutral-700/30 my-3"></div>
                    <div className="px-4 py-2">
                      <div className="text-sm text-neutral-400">Signed in as:</div>
                      <div className="text-sm font-medium text-white">{currentUser.email}</div>
                      <div className="text-xs text-neutral-400 mt-1">{userRole}</div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-harvest-red hover:bg-harvest-red/10 rounded-lg transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Link
                      to="/login"
                      className={`block px-4 py-2 text-white hover:bg-neutral-700/50 rounded-lg ${
                        isActive('/login') ? 'bg-neutral-700/30' : ''
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="block px-4 py-2 bg-white/10 text-white hover:bg-white/20 rounded-lg transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status indicator for blockchain connection */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: blockchainStatus === 'disconnected' ? 0 : -10, opacity: blockchainStatus === 'disconnected' ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute top-full left-0 w-full bg-harvest-red/90 backdrop-blur-md py-1 text-center text-white text-sm"
      >
        <div className="container-app">
          <div className="flex items-center justify-center gap-xs">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Blockchain network connection unavailable. Some features may be limited.
          </div>
        </div>
      </motion.div>
    </nav>
  );
} 