import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Linking from 'expo-linking';
import { PublicKey } from '@solana/web3.js';
import { PhantomWalletService, PhantomResponse } from '@/services/PhantomWalletService';

interface WalletContextType {
  isConnected: boolean;
  walletAddress: string | null;
  publicKey: PublicKey | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [walletService] = useState(() => new PhantomWalletService());
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize deeplink handling
  useEffect(() => {
    const initializeDeeplinks = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };
    
    initializeDeeplinks();
    
    const listener = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      listener.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;

      // Handle error responses
      if (params.get('errorCode')) {
        const error = Object.fromEntries([...params]);
        const message = error?.errorMessage ?? JSON.stringify(error, null, 2);
        setError(message);
        setIsLoading(false);
        return;
      }

      // Handle connect response (proper encrypted response per docs)
      if (/onConnect/.test(urlObj.pathname)) {
        const phantomEncryptionPublicKey = params.get('phantom_encryption_public_key');
        const nonce = params.get('nonce');
        const data = params.get('data');
        
        if (phantomEncryptionPublicKey && nonce && data) {
          const response: PhantomResponse = {
            phantom_encryption_public_key: phantomEncryptionPublicKey,
            nonce: nonce,
            data: data,
          };

          const connectData = walletService.handleConnectResponse(response);
          setPublicKey(new PublicKey(connectData.public_key));
          setWalletAddress(connectData.public_key);
          setIsConnected(true);
          setError(null);
          setIsLoading(false);
          console.log(`Connected to wallet: ${connectData.public_key}`);
        } else {
          setError('Missing required parameters from Phantom response');
          setIsLoading(false);
        }
      }

      // Handle disconnect response
      if (/onDisconnect/.test(urlObj.pathname)) {
        walletService.handleDisconnectResponse();
        setIsConnected(false);
        setWalletAddress(null);
        setPublicKey(null);
        setError(null);
        setIsLoading(false);
        console.log('Disconnected from wallet');
      }
    } catch (error) {
      console.error('Error handling deeplink:', error);
      setError('Failed to handle wallet response');
      setIsLoading(false);
    }
  };

  const connect = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await walletService.connect();
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      setError('Failed to connect to wallet');
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await walletService.disconnect();
    } catch (error) {
      console.error('Error disconnecting from wallet:', error);
      setError('Failed to disconnect from wallet');
      setIsLoading(false);
    }
  };

  const value: WalletContextType = {
    isConnected,
    walletAddress,
    publicKey,
    connect,
    disconnect,
    isLoading,
    error,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
