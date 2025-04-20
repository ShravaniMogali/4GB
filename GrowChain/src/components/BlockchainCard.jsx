import { useState } from 'react';
import { motion } from 'framer-motion';

export default function BlockchainCard({ 
  consignment, 
  selected = false, 
  onClick, 
  showDetails = true, 
  animate = true 
}) {
  const [isHovered, setIsHovered] = useState(false);

  if (!consignment) return null;
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'created':
        return 'blockchain-blue';
      case 'in-transit':
        return 'harvest-orange';
      case 'delivered':
      case 'completed':
        return 'leaf-primary';
      case 'rejected':
        return 'harvest-red';
      default:
        return 'blockchain-purple';
    }
  };
  
  const getStatusBg = (status) => {
    const color = getStatusColor(status);
    return `bg-${color}/10 border-${color}/30`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    hover: { y: -5, transition: { duration: 0.2 } },
    selected: { scale: 1.02, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)' }
  };

  // Generate a hash-like representation of the transaction ID
  const formatTxHash = (txId) => {
    if (!txId) return '0x0000...0000';
    const hash = txId.toString();
    return `0x${hash.substring(0, 4)}...${hash.substring(hash.length - 4)}`;
  };

  return (
    <motion.div
      className={`glass-panel relative overflow-hidden ${selected ? 'gradient-border' : ''}`}
      initial={animate ? "initial" : false}
      animate={animate ? "animate" : false}
      whileHover={animate ? "hover" : false}
      variants={cardVariants}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Decorative elements */}
      <div className="absolute -right-8 -top-8 w-16 h-16 rounded-full bg-gradient-to-br from-blockchain-purple/10 to-transparent opacity-70"></div>
      <div className="absolute -left-8 -bottom-8 w-16 h-16 rounded-full bg-gradient-to-tr from-leaf-primary/10 to-transparent opacity-70"></div>
      
      {/* Blockchain hash visual */}
      <div className="absolute top-3 right-3 flex items-center">
        <div className={`h-2 w-2 rounded-full bg-${getStatusColor(consignment.status)} animate-pulse mr-1.5`}></div>
        <span className="mono-text text-xs text-neutral-500">
          {formatTxHash(consignment.blockchainData?.transactionId || '')}
        </span>
      </div>
      
      <div className="p-4">
        <div className="flex flex-col">
          <h3 className="font-mono text-lg font-medium text-neutral-800 mt-6">{consignment.vegetableName}</h3>
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-neutral-500 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span className="text-sm text-neutral-500">{formatDate(consignment.createdAt)}</span>
            </div>
            
            <div className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${getStatusColor(consignment.status)}/10 text-${getStatusColor(consignment.status)}`}>
              {consignment.status?.charAt(0).toUpperCase() + consignment.status?.slice(1)}
            </div>
          </div>
          
          {showDetails && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-500">Farmer</span>
                <span className="text-sm font-medium">{consignment.farmerName || 'Unknown'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-500">Quantity</span>
                <span className="text-sm font-medium">{consignment.quantity || '0'} kg</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-500">Origin</span>
                <span className="text-sm font-medium">{consignment.farmLocation || 'Unknown'}</span>
              </div>
            </div>
          )}
        </div>
        
        {selected && (
          <motion.div 
            className="mt-4 pt-4 border-t border-neutral-200" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex justify-between">
              <button className="text-xs text-blockchain-purple">View History</button>
              <button className="text-xs text-leaf-primary">Details</button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
} 