import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Linking from 'expo-linking';
import { PublicKey, Transaction, Connection } from '@solana/web3.js';
import { PhantomWalletService, PhantomResponse } from '@/services/PhantomWalletService';
import bs58 from 'bs58';

interface WalletContextType {
  isConnected: boolean;
  walletAddress: string | null;
  publicKey: PublicKey | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: Transaction) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isSubmittingTransaction: boolean;
  lastTransactionSignature: string | null;
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
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);
  const [lastTransactionSignature, setLastTransactionSignature] = useState<string | null>(null);
  const [connection] = useState(() => new Connection('https://api.devnet.solana.com'));

  // Initialize deeplink handling
  useEffect(() => {
    const initializeDeeplinks = async () => {
      console.log('🚀 Initializing deeplinks...');
      const initialUrl = await Linking.getInitialURL();
      console.log('🔗 Initial URL:', initialUrl);
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };
    
    initializeDeeplinks();
    
    const listener = Linking.addEventListener('url', ({ url }) => {
      console.log('📱 New deeplink event:', url);
      handleDeepLink(url);
    });

    return () => {
      listener.remove();
    };
  }, []);

  const handleDeepLink = async (url: string) => {
    console.log('🔗 Deep link received:', url);
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      console.log('🔍 Parsed URL pathname:', urlObj.pathname);
      console.log('🔍 URL search params:', Object.fromEntries(params.entries()));

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

      // Handle sign transaction response
      if (/onSignTransaction/.test(urlObj.pathname)) {
        console.log('✅ Processing onSignTransaction response');
        const phantomEncryptionPublicKey = params.get('phantom_encryption_public_key');
        const nonce = params.get('nonce');
        const data = params.get('data');
        console.log('🔑 Has encryption key:', !!phantomEncryptionPublicKey);
        console.log('🔑 Has nonce:', !!nonce);
        console.log('🔑 Has data:', !!data);
        
        if (nonce && data) {
          // For signTransaction, Phantom might not send the encryption key in the response
          // Let's try to handle it without the encryption key first
          const response: PhantomResponse = {
            phantom_encryption_public_key: phantomEncryptionPublicKey || '',
            nonce: nonce,
            data: data,
          };

          try {
            console.log('🔓 Attempting to decrypt response...');
            const signData = walletService.handleSignTransactionResponse(response);
            console.log('Sign data received:', signData);
            
            // The transaction field contains a base58-encoded signed transaction
            // Use bs58.decode to properly decode it
            const signedTransactionBuffer = bs58.decode(signData.transaction);
            console.log('Decoded transaction buffer length:', signedTransactionBuffer.length);
            
            const signature = await connection.sendRawTransaction(signedTransactionBuffer);
            console.log('Transaction broadcast signature:', signature);
            
            // Confirm the transaction
            await connection.confirmTransaction(signature, 'confirmed');
            
            setLastTransactionSignature(signature);
            setIsSubmittingTransaction(false);
            setError(null);
            console.log('Transaction signed and broadcast:', signature);
          } catch (error) {
            console.error('Error handling transaction response:', error);
            console.log('🔍 Trying alternative approach...');
            
            // Alternative approach: try to decode the data directly
            try {
              // If the data is already a base58-encoded transaction, try to decode it directly
              const directTransactionBuffer = bs58.decode(data);
              console.log('Direct decoded transaction buffer length:', directTransactionBuffer.length);
              
              const signature = await connection.sendRawTransaction(directTransactionBuffer);
              console.log('Direct transaction broadcast signature:', signature);
              
              // Confirm the transaction
              await connection.confirmTransaction(signature, 'confirmed');
              
              setLastTransactionSignature(signature);
              setIsSubmittingTransaction(false);
              setError(null);
              console.log('Transaction signed and broadcast (direct):', signature);
            } catch (directError) {
              console.error('Direct decoding also failed:', directError);
              setError('Failed to process transaction response');
              setIsSubmittingTransaction(false);
            }
          }
        } else {
          setError('Missing required parameters from transaction response');
          setIsSubmittingTransaction(false);
        }
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

  const signTransaction = async (transaction: Transaction) => {
    try {
      setIsSubmittingTransaction(true);
      setError(null);
      setLastTransactionSignature(null);
      await walletService.signTransaction(transaction);
    } catch (error) {
      console.error('Error signing transaction:', error);
      setError('Failed to sign transaction');
      setIsSubmittingTransaction(false);
    }
  };

  const value: WalletContextType = {
    isConnected,
    walletAddress,
    publicKey,
    connect,
    disconnect,
    signTransaction,
    isLoading,
    error,
    isSubmittingTransaction,
    lastTransactionSignature,
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
