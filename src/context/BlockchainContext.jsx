import { createContext, useContext, useState, useEffect } from 'react';
import { initializeBlockchain, checkBlockchainHealth } from '../services/hyperledger';

const BlockchainContext = createContext();

export function BlockchainProvider({ children }) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isHealthy, setIsHealthy] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const initialize = async () => {
            try {
                // First initialize the blockchain service
                await initializeBlockchain();

                if (mounted) {
                    setIsInitialized(true);

                    // Then perform health check
                    const health = await checkBlockchainHealth();
                    if (mounted) {
                        setIsHealthy(health);
                        setError(null);
                    }
                }
            } catch (err) {
                console.error('Blockchain initialization error:', err);
                if (mounted) {
                    setError(err.message || 'Failed to initialize blockchain service');
                    setIsHealthy(false);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        initialize();

        return () => {
            mounted = false;
        };
    }, []);

    const value = {
        isInitialized,
        isHealthy,
        error,
        loading
    };

    return (
        <BlockchainContext.Provider value={value}>
            {children}
        </BlockchainContext.Provider>
    );
}

export function useBlockchain() {
    const context = useContext(BlockchainContext);
    if (context === undefined) {
        throw new Error('useBlockchain must be used within a BlockchainProvider');
    }
    return context;
} 