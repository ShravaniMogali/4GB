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
        try {
          const status = await checkBlockchainHealth();
          setBlockchainStatus(status.status === 'ok' ? 'connected' : 'disconnected');
        } catch (error) {
          setBlockchainStatus('disconnected');
        }
      }
    };

    checkBlockchain();
    // Check every 2 minutes
    const interval = setInterval(checkBlockchain, 120000);
    return () => clearInterval(interval);
  }, [currentUser, checkBlockchainHealth]);

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
    <nav className={`sticky top-0 z-50 bg-soil-dark/95 backdrop-blur-sm transition-all duration-300 ${isScrolled ? 'shadow-lg' : ''}`}>
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
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 6V3M12 6C8.68629 6 6 8.68629 6 12M12 6C15.3137 6 18 8.68629 18 12M12 21V18M12 18C15.3137 18 18 15.3137 18 12M12 18C8.68629 18 6 15.3137 6 12M21 12H18M6 12H3"
                      stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="absolute -right-1 -top-1 w-3 h-3">
                  <div className={`w-full h-full rounded-full ${blockchainStatus === 'connected' ? 'bg-leaf-primary' : 'bg-harvest-red'} animate-pulse shadow-lg`}></div>
                </div>
              </div>
              <span className="text-xl font-bold text-white group-hover:text-leaf-light transition-colors">GrowChain</span>
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
                    className={`text-neutral-100 hover:text-leaf-light transition-colors relative group ${isActive(getDashboardLink()) ? 'font-medium text-leaf-primary' : ''}`}
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
                      className={`text-neutral-100 hover:text-leaf-light transition-colors relative group ${isActive('/create-consignment') ? 'font-medium text-leaf-primary' : ''}`}
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
                    className={`text-neutral-100 hover:text-blockchain-purple transition-colors relative group ${isActive('/blockchain') ? 'font-medium text-blockchain-purple' : ''}`}
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
                </motion.div>

                <div className="h-5 w-px bg-neutral-600/50 mx-2"></div>

                <div className="relative">
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center gap-xs hover:bg-neutral-700/50 rounded-lg p-2 transition-colors"
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
                  </button>

                  <AnimatePresence>
                    {showProfileDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-48 rounded-lg bg-soil-dark border border-neutral-700 shadow-lg py-2"
                      >
                        <div className="px-4 py-2 border-b border-neutral-700">
                          <div className="text-sm font-medium text-white">{currentUser.email}</div>
                          <div className="text-xs text-neutral-400">Signed in as {userRole}</div>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700/50 hover:text-harvest-red transition-colors"
                        >
                          Sign out
                        </button>
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
                  className={`text-neutral-100 hover:text-leaf-light transition-colors px-4 py-2 rounded-lg ${isActive('/login') ? 'bg-neutral-700/50' : ''}`}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-white hover:bg-neutral-100 text-leaf-primary px-4 py-2 rounded-lg transition-colors shadow-glow-sm font-medium"
                >
                  Register
                </Link>
              </motion.div>
            )}
          </div>

          {/* Mobile menu button */}
          <motion.button
            onClick={toggleMenu}
            className="md:hidden text-white p-2 focus:outline-none hover:bg-neutral-700/50 rounded-lg transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d={isMenuOpen ? "M15 5L5 15M5 5L15 15" : "M3 5H17M3 10H17M3 15H17"}
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.button>
        </div>

        {/* Mobile navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 border-t border-neutral-700 mt-4">
                <div className="flex flex-col gap-y-4">
                  {currentUser ? (
                    <>
                      <div className="flex items-center gap-sm mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-leaf-primary to-leaf-light flex items-center justify-center text-white text-lg shadow-glow-sm">
                          {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-medium text-white">{userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'User'}</div>
                          <div className="text-sm text-neutral-400">{currentUser.email}</div>
                        </div>
                      </div>

                      <Link
                        to={getDashboardLink()}
                        className={`text-neutral-100 py-2 px-3 rounded-lg hover:bg-neutral-700/50 transition-colors ${isActive(getDashboardLink()) ? 'font-medium text-leaf-primary bg-neutral-700/25' : ''}`}
                        onClick={toggleMenu}
                      >
                        Dashboard
                      </Link>

                      {userRole === 'farmer' && (
                        <Link
                          to="/create-consignment"
                          className={`text-neutral-100 py-2 px-3 rounded-lg hover:bg-neutral-700/50 transition-colors ${isActive('/create-consignment') ? 'font-medium text-leaf-primary bg-neutral-700/25' : ''}`}
                          onClick={toggleMenu}
                        >
                          Create Consignment
                        </Link>
                      )}

                      <Link
                        to="/blockchain"
                        className={`text-neutral-100 py-2 px-3 rounded-lg hover:bg-neutral-700/50 transition-colors ${isActive('/blockchain') ? 'font-medium text-blockchain-purple bg-neutral-700/25' : ''}`}
                        onClick={toggleMenu}
                      >
                        <div className="flex items-center gap-xs">
                          <span>Blockchain</span>
                          <div className={`w-2 h-2 rounded-full ${blockchainStatus === 'connected' ? 'bg-leaf-primary' : 'bg-harvest-red'} animate-pulse shadow-glow-sm`}></div>
                        </div>
                      </Link>

                      <div className="h-px bg-neutral-700 my-2"></div>

                      <button
                        onClick={() => {
                          handleLogout();
                          toggleMenu();
                        }}
                        className="btn btn-outline-leaf w-full hover:scale-[0.99] transform transition-transform"
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className={`text-neutral-100 py-2 px-3 rounded-lg hover:bg-neutral-700/50 transition-colors ${isActive('/login') ? 'font-medium text-leaf-primary bg-neutral-700/25' : ''}`}
                        onClick={toggleMenu}
                      >
                        Login
                      </Link>
                      <Link
                        to="/register"
                        className="bg-white hover:bg-neutral-100 text-leaf-primary px-4 py-2 rounded-lg transition-colors shadow-glow-sm font-medium"
                        onClick={toggleMenu}
                      >
                        Register
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
} 