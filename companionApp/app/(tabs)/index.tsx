import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Alert, TextInput, View, Text, ActivityIndicator } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import { useWallet } from '@/contexts/WalletContext';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import Svg, { Path } from 'react-native-svg';

// Gaze Logo Component
const GazeLogo = ({ size = 80, color = '#111827' }) => (
  <Svg width="150" height="50" viewBox="0 0 77 24" fill="none">
  <Path d="M20.75 12C20.75 12 16.8375 17 12 17C7.1625 17 3.25 12 3.25 12C3.25 12 7.1625 7 12 7C16.8375 7 20.75 12 20.75 12ZM12 9.5C11.5055 9.5 11.0222 9.64662 10.6111 9.92133C10.2 10.196 9.87952 10.5865 9.6903 11.0433C9.50108 11.5001 9.45157 12.0028 9.54804 12.4877C9.6445 12.9727 9.8826 13.4181 10.2322 13.7678C10.5819 14.1174 11.0273 14.3555 11.5123 14.452C11.9972 14.5484 12.4999 14.4989 12.9567 14.3097C13.4135 14.1205 13.804 13.8 14.0787 13.3889C14.3534 12.9778 14.5 12.4945 14.5 12C14.5 11.337 14.2366 10.7011 13.7678 10.2322C13.2989 9.76339 12.663 9.5 12 9.5Z" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <Path d="M0.75 5.75V2C0.75 1.66848 0.881696 1.35054 1.11612 1.11612C1.35054 0.881696 1.66848 0.75 2 0.75H5.75" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <Path d="M23.25 5.75V2C23.25 1.66848 23.1183 1.35054 22.8839 1.11612C22.6495 0.881696 22.3315 0.75 22 0.75H18.25" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <Path d="M0.75 18.25V22C0.75 22.3315 0.881696 22.6495 1.11612 22.8839C1.35054 23.1183 1.66848 23.25 2 23.25H5.75" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <Path d="M23.25 18.25V22C23.25 22.3315 23.1183 22.6495 22.8839 22.8839C22.6495 23.1183 22.3315 23.25 22 23.25H18.25" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <Path d="M42.326 18.18C41.402 18.18 40.544 18.018 39.752 17.694C38.972 17.358 38.282 16.896 37.682 16.308C37.094 15.72 36.632 15.036 36.296 14.256C35.972 13.464 35.81 12.612 35.81 11.7C35.81 10.776 35.972 9.924 36.296 9.144C36.632 8.352 37.094 7.662 37.682 7.074C38.282 6.486 38.972 6.03 39.752 5.706C40.544 5.382 41.402 5.22 42.326 5.22C42.938 5.22 43.526 5.292 44.09 5.436C44.666 5.568 45.188 5.778 45.656 6.066C45.776 6.126 45.86 6.21 45.908 6.318C45.968 6.426 45.998 6.54 45.998 6.66C45.998 6.864 45.926 7.038 45.782 7.182C45.65 7.326 45.494 7.398 45.314 7.398C45.242 7.398 45.17 7.386 45.098 7.362C45.038 7.338 44.972 7.314 44.9 7.29C44.528 7.098 44.126 6.948 43.694 6.84C43.262 6.72 42.806 6.66 42.326 6.66C41.378 6.66 40.526 6.882 39.77 7.326C39.026 7.77 38.438 8.37 38.006 9.126C37.574 9.882 37.358 10.74 37.358 11.7C37.358 12.648 37.574 13.506 38.006 14.274C38.438 15.03 39.026 15.63 39.77 16.074C40.526 16.518 41.378 16.74 42.326 16.74C42.806 16.74 43.298 16.674 43.802 16.542C44.318 16.41 44.756 16.242 45.116 16.038L44.99 16.47V12.672L45.278 12.924H42.524C42.32 12.924 42.146 12.858 42.002 12.726C41.87 12.582 41.804 12.408 41.804 12.204C41.804 12 41.87 11.832 42.002 11.7C42.146 11.556 42.32 11.484 42.524 11.484H45.8C46.016 11.484 46.19 11.556 46.322 11.7C46.454 11.844 46.52 12.018 46.52 12.222V16.38C46.52 16.524 46.484 16.65 46.412 16.758C46.352 16.866 46.268 16.956 46.16 17.028C45.62 17.376 45.02 17.658 44.36 17.874C43.712 18.078 43.034 18.18 42.326 18.18ZM56.7617 8.604C56.9657 8.604 57.1337 8.676 57.2657 8.82C57.4097 8.952 57.4817 9.12 57.4817 9.324V17.262C57.4817 17.466 57.4097 17.64 57.2657 17.784C57.1337 17.928 56.9657 18 56.7617 18C56.5457 18 56.3717 17.928 56.2397 17.784C56.1077 17.64 56.0417 17.466 56.0417 17.262V15.552L56.3837 15.516C56.3837 15.78 56.2937 16.068 56.1137 16.38C55.9337 16.692 55.6877 16.986 55.3757 17.262C55.0637 17.526 54.6917 17.748 54.2597 17.928C53.8397 18.096 53.3837 18.18 52.8917 18.18C52.0757 18.18 51.3437 17.97 50.6957 17.55C50.0477 17.118 49.5317 16.536 49.1477 15.804C48.7757 15.072 48.5897 14.238 48.5897 13.302C48.5897 12.354 48.7757 11.52 49.1477 10.8C49.5317 10.068 50.0477 9.498 50.6957 9.09C51.3437 8.67 52.0637 8.46 52.8557 8.46C53.3717 8.46 53.8517 8.544 54.2957 8.712C54.7397 8.88 55.1237 9.108 55.4477 9.396C55.7837 9.684 56.0417 10.002 56.2217 10.35C56.4137 10.698 56.5097 11.046 56.5097 11.394L56.0417 11.286V9.324C56.0417 9.12 56.1077 8.952 56.2397 8.82C56.3717 8.676 56.5457 8.604 56.7617 8.604ZM53.0537 16.848C53.6537 16.848 54.1817 16.692 54.6377 16.38C55.1057 16.068 55.4657 15.648 55.7177 15.12C55.9817 14.58 56.1137 13.974 56.1137 13.302C56.1137 12.642 55.9817 12.048 55.7177 11.52C55.4657 10.98 55.1057 10.56 54.6377 10.26C54.1817 9.948 53.6537 9.792 53.0537 9.792C52.4657 9.792 51.9377 9.942 51.4697 10.242C51.0137 10.542 50.6537 10.956 50.3897 11.484C50.1257 12.012 49.9937 12.618 49.9937 13.302C49.9937 13.974 50.1197 14.58 50.3717 15.12C50.6357 15.648 50.9957 16.068 51.4517 16.38C51.9197 16.692 52.4537 16.848 53.0537 16.848ZM66.0544 16.668C66.2464 16.668 66.4084 16.734 66.5404 16.866C66.6724 16.986 66.7384 17.142 66.7384 17.334C66.7384 17.514 66.6724 17.67 66.5404 17.802C66.4084 17.934 66.2464 18 66.0544 18H60.2224C60.0064 18 59.8384 17.922 59.7184 17.766C59.5984 17.61 59.5384 17.466 59.5384 17.334C59.5504 17.214 59.5684 17.112 59.5924 17.028C59.6164 16.944 59.6704 16.848 59.7544 16.74L64.9024 9.774L64.9204 9.972H60.5644C60.3724 9.972 60.2104 9.906 60.0784 9.774C59.9464 9.642 59.8804 9.48 59.8804 9.288C59.8804 9.108 59.9464 8.958 60.0784 8.838C60.2104 8.706 60.3724 8.64 60.5644 8.64H66.0904C66.2824 8.64 66.4384 8.712 66.5584 8.856C66.6904 8.988 66.7564 9.156 66.7564 9.36C66.7444 9.444 66.7264 9.528 66.7024 9.612C66.6784 9.684 66.6304 9.774 66.5584 9.882L61.4644 16.758L61.3384 16.668H66.0544ZM72.9426 18.18C71.9826 18.18 71.1426 17.976 70.4226 17.568C69.7026 17.16 69.1386 16.602 68.7306 15.894C68.3346 15.174 68.1366 14.346 68.1366 13.41C68.1366 12.366 68.3406 11.478 68.7486 10.746C69.1686 10.002 69.7086 9.438 70.3686 9.054C71.0406 8.658 71.7486 8.46 72.4926 8.46C73.0446 8.46 73.5786 8.562 74.0946 8.766C74.6106 8.97 75.0666 9.27 75.4626 9.666C75.8586 10.05 76.1766 10.518 76.4166 11.07C76.6566 11.61 76.7826 12.216 76.7946 12.888C76.7946 13.08 76.7226 13.242 76.5786 13.374C76.4346 13.506 76.2666 13.572 76.0746 13.572H68.9646L68.6406 12.33H75.5706L75.2826 12.582V12.186C75.2346 11.694 75.0666 11.274 74.7786 10.926C74.5026 10.566 74.1606 10.29 73.7526 10.098C73.3566 9.906 72.9366 9.81 72.4926 9.81C72.1326 9.81 71.7726 9.876 71.4126 10.008C71.0646 10.128 70.7466 10.332 70.4586 10.62C70.1826 10.896 69.9546 11.256 69.7746 11.7C69.6066 12.144 69.5226 12.678 69.5226 13.302C69.5226 13.998 69.6606 14.61 69.9366 15.138C70.2246 15.666 70.6206 16.086 71.1246 16.398C71.6286 16.698 72.2166 16.848 72.8886 16.848C73.3086 16.848 73.6746 16.794 73.9866 16.686C74.2986 16.578 74.5686 16.446 74.7966 16.29C75.0246 16.122 75.2166 15.954 75.3726 15.786C75.5286 15.678 75.6786 15.624 75.8226 15.624C76.0026 15.624 76.1466 15.684 76.2546 15.804C76.3746 15.924 76.4346 16.068 76.4346 16.236C76.4346 16.44 76.3386 16.62 76.1466 16.776C75.8106 17.148 75.3546 17.478 74.7786 17.766C74.2026 18.042 73.5906 18.18 72.9426 18.18Z" fill="black"/>
  </Svg>
  
);

export default function HomeScreen() {
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [userStatus, setUserStatus] = useState<'not_registered' | 'wallet_connected' | 'face_registered'>('not_registered');
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);
  const [shownTransactions, setShownTransactions] = useState<Set<string>>(new Set());
  const [isShowingAlert, setIsShowingAlert] = useState(false);
  const pollingEnabledRef = useRef(true);
  const cameraRef = useRef<CameraView>(null);

  // Wallet connection
  const { 
    isConnected, 
    walletAddress, 
    connect, 
    disconnect, 
    signTransaction,
    isLoading: walletLoading, 
    error: walletError,
    isSubmittingTransaction,
    lastTransactionSignature
  } = useWallet();

  // Check user status when wallet connects
  useEffect(() => {
    if (isConnected && walletAddress) {
      checkUserStatus();
      // Reset polling state when wallet connects
      pollingEnabledRef.current = true;
      setIsShowingAlert(false);
    } else {
      setUserStatus('not_registered');
      pollingEnabledRef.current = false;
    }
  }, [isConnected, walletAddress]);

  // Poll for pending transactions when wallet is connected
  useEffect(() => {
    if (!isConnected || !walletAddress) return;

    
    const pollInterval = setInterval(async () => {
      try {
        // Skip if polling is disabled or already showing an alert
        if (!pollingEnabledRef.current || isShowingAlert) {
          return;
        }
        
        const response = await fetch(`http://10.161.2.236:3001/api/pending-transactions/${walletAddress}`);
        const data = await response.json();
        
        if (data.success && data.transactions.length > 0) {
          // Show only new transactions that haven't been shown yet
          const newTransactions = data.transactions.filter(
            (tx: any) => !shownTransactions.has(tx.transactionId)
          );
          
          if (newTransactions.length > 0) {
            const latestTransaction = newTransactions[0];
            
            // STOP POLLING IMMEDIATELY when transaction is found
            pollingEnabledRef.current = false;
            
            // Mark this transaction as shown immediately
            setShownTransactions(prev => new Set([...prev, latestTransaction.transactionId]));
            
            // Set alert flag to prevent duplicate alerts
            setIsShowingAlert(true);
            
            // Show transaction confirmation dialog
            Alert.alert(
              'Payment Request',
              `Face verified! Send ${latestTransaction.amount} SOL to ${latestTransaction.recipient.substring(0, 8)}...?\n\nSimilarity: ${(latestTransaction.similarity * 100).toFixed(1)}%`,
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => {
                    // Update transaction status to cancelled
                    fetch(`http://10.161.2.236:3001/api/transaction-status/${latestTransaction.transactionId}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'cancelled' })
                    }).catch(error => {
                      console.error('Error sending cancellation status:', error);
                    });
                    // Reset flags and restart polling
                    setIsShowingAlert(false);
                    pollingEnabledRef.current = true;
                  }
                },
                {
                  text: 'Confirm Payment',
                  style: 'default',
                  onPress: () => {
                    // Reset flags and restart polling
                    setIsShowingAlert(false);
                    pollingEnabledRef.current = true;
                    processTransaction(latestTransaction);
                  }
                }
              ],
              {
                onDismiss: () => {
                  // Reset flags and restart polling
                  setIsShowingAlert(false);
                  pollingEnabledRef.current = true;
                }
              }
            );
          }
        }
      } catch (error) {
        console.error('❌ Error polling for transactions:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [isConnected, walletAddress]);

  // Handle transaction completion
  useEffect(() => {
    if (lastTransactionSignature && !isSubmittingTransaction && pendingTransaction) {
      console.log('Transaction completed:', lastTransactionSignature);
      
      // Update transaction status in backend
      fetch(`http://10.161.2.236:3001/api/transaction-status/${pendingTransaction.transactionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'completed',
          signature: lastTransactionSignature
        })
      }).catch(error => {
        console.error('Error sending completion status:', error);
      });

      Alert.alert(
        'Payment Successful! 🎉',
        `Successfully sent ${pendingTransaction.amount} SOL to ${pendingTransaction.recipient.substring(0, 8)}...`,
        [
          {
            text: 'OK',
            onPress: () => {
              setPendingTransaction(null);
              setShowWebView(false);
              setIsProcessingTransaction(false);
            }
          }
        ]
      );
    }
  }, [lastTransactionSignature, isSubmittingTransaction, pendingTransaction]);

  const checkUserStatus = async () => {
    if (!walletAddress) return;
    
    try {
      const response = await fetch(`http://10.161.2.236:3001/api/user/${walletAddress}`);
      const data = await response.json();
      
      if (data.success && data.exists) {
        setUserStatus(data.faceRegistered ? 'face_registered' : 'wallet_connected');
      } else {
        setUserStatus('wallet_connected');
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      setUserStatus('wallet_connected');
    }
  };

  const createUser = async () => {
    if (!walletAddress) return;
    
    try {
      const response = await fetch('http://10.161.2.236:3001/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: walletAddress
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('User created successfully');
        setUserStatus('wallet_connected');
      } else {
        console.error('Error creating user:', data.error);
      }
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const processTransaction = async (transactionData: any) => {
    try {
      setIsProcessingTransaction(true);
      setPendingTransaction(transactionData);
      
      // Create Solana connection (devnet for testing)
      const connection = new Connection('https://api.devnet.solana.com');
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      
      // Create transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: new PublicKey(walletAddress!),
      });
      
      // Add transfer instruction
      const recipientPublicKey = new PublicKey(transactionData.recipient);
      const lamports = transactionData.amount * LAMPORTS_PER_SOL;
      
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(walletAddress!),
          toPubkey: recipientPublicKey,
          lamports: lamports,
        })
      );
      
      // Sign transaction using Phantom wallet via deeplink
      await signTransaction(transaction);
      
    } catch (error) {
      console.error('Transaction error:', error);
      
      // Update transaction status to failed in backend
      if (transactionData.transactionId) {
        try {
          await fetch(`http://10.161.2.236:3001/api/transaction-status/${transactionData.transactionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              status: 'failed',
              error: (error as Error).message
            })
          });
        } catch (fetchError) {
          console.error('Error sending failure status to backend:', fetchError);
        }
      }
      
      Alert.alert(
        'Transaction Failed',
        (error as Error).message || 'Failed to process payment',
        [
          {
            text: 'OK',
            onPress: () => {
              setPendingTransaction(null);
            }
          }
        ]
      );
      
      setIsProcessingTransaction(false);
    }
  };

  const captureImage = async (isRegister: boolean) => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Camera permission is required to capture images.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9, // Higher quality for better face detection
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setCapturedImage(imageUri);
        setIsRegisterMode(isRegister);
        
        // Convert image to base64 for URL parameter
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        console.log('Uploading image to backend...');
        
        // Upload image to backend and get token
        try {
          console.log('Uploading image to backend...');
          const uploadResponse = await fetch('http://10.161.2.236:3001/api/store-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageData: base64Image,
              walletAddress: walletAddress, // Include wallet address
              isRegister: isRegister
            }),
          });
          
          console.log('Upload response status:', uploadResponse.status);
          console.log('Upload response headers:', uploadResponse.headers);
          
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Upload failed:', errorText);
            throw new Error(`Upload failed with status ${uploadResponse.status}: ${errorText}`);
          }
          
          const uploadResult = await uploadResponse.json();
          console.log('Upload result:', uploadResult);
          
          if (uploadResult.success) {
            console.log('Image uploaded, token:', uploadResult.token);
            
            // Create WebView URL with token and wallet address for registration page
            const webViewUrl = `http://10.161.2.236:5173/?page=register&mode=webview&token=${uploadResult.token}&walletAddress=${walletAddress}`;
            console.log('WebView URL:', webViewUrl);
            
            setWebViewUrl(webViewUrl);
            setShowWebView(true);
          } else {
            throw new Error(uploadResult.error || 'Failed to upload image');
          }
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          Alert.alert('Error', 'Failed to upload image: ' + (uploadError as Error).message);
        }
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image');
    }
  };

  const handleRegister = async () => {
    if (!isConnected) {
      Alert.alert('Wallet Required', 'Please connect your Phantom wallet first to register your face.');
      return;
    }
    
    // If user doesn't exist, create them first
    if (userStatus === 'not_registered') {
      await createUser();
    }
    
    await captureImage(true);
  };

  const handleWebViewMessage = (event: any) => {
    try {
      console.log('📨 WebView message received:', event.nativeEvent.data);
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📋 Parsed message data:', data);
      
      switch (data.type) {
        case 'test_message':
          console.log('🧪 Test message received from WebView:', data.message);
          Alert.alert('WebView Test', data.message);
          break;
        case 'registration_success':
          Alert.alert('Account Created!', 'Your face has been registered successfully.');
          setShowWebView(false);
          setMessage('Account created successfully!');
          setUserStatus('face_registered');
          break;
        case 'transaction_request':
          console.log('💰 Transaction request received:', data);
          console.log('📊 Transaction details:', {
            amount: data.amount,
            recipient: data.recipient,
            walletAddress: data.walletAddress,
            similarity: data.similarity,
            similarityPercent: (data.similarity * 100).toFixed(1) + '%'
          });
          setPendingTransaction(data);
          
          // Show transaction confirmation dialog
          Alert.alert(
            'Payment Confirmation',
            `Face verified! Send ${data.amount} SOL to ${data.recipient.substring(0, 8)}...?\n\nSimilarity: ${(data.similarity * 100).toFixed(1)}%`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  console.log('❌ User cancelled transaction');
                  setPendingTransaction(null);
                  setShowWebView(false);
                }
              },
              {
                text: 'Confirm Payment',
                style: 'default',
                onPress: () => {
                  console.log('✅ User confirmed transaction, processing...');
                  processTransaction(data);
                }
              }
            ]
          );
          break;
        case 'verification_failed':
          Alert.alert('Payment Cancelled', data.message);
          setShowWebView(false);
          setMessage('Payment cancelled - Face not recognized');
          break;
        case 'error':
          Alert.alert('Error', data.message);
          setShowWebView(false);
          setMessage(data.message);
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  if (showWebView) {
    return (
      <View style={styles.container}>
        <WebView
          source={{ uri: webViewUrl }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
          onLoadStart={() => console.log('WebView load started')}
          onLoadEnd={() => console.log('WebView load ended')}
          onError={(error) => console.log('WebView error:', error)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <GazeLogo size={100} color="#111827" />
        </View>

        
        {/* Account Status */}
        {userStatus === 'face_registered' ? (
          <View style={styles.accountReady}>
            <View style={styles.statusIndicator}>
              <IconSymbol name="checkmark.circle.fill" size={24} color="#28a745" />
              <Text style={styles.statusText}>Account Ready</Text>
            </View>
            <Text style={styles.statusSubtext}>
              Wallet: {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-8)}
            </Text>
          </View>
        ) : (
          <>
            {isConnected ? (
              <View style={styles.walletConnected}>
                <View style={styles.walletStatus}>
                  <View style={styles.greenDot} />
                  <Text style={styles.walletText}>
                    Connected: {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-8)}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.disconnectButton} 
                  onPress={disconnect}
                  disabled={walletLoading}
                >
                  <IconSymbol name="xmark.circle" size={20} color="#ffffff" />
                  <Text style={styles.buttonText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.walletDisconnected}>
                <TouchableOpacity 
                  style={styles.connectButton} 
                  onPress={connect}
                  disabled={walletLoading}
                >
                  {walletLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <IconSymbol name="wallet.pass" size={20} color="#ffffff" />
                  )}
                  <Text style={styles.buttonText}>
                    {walletLoading ? 'Connecting...' : 'Connect Phantom'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
            {walletError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{walletError}</Text>
              </View>
            )}
            
            {isProcessingTransaction && (
              <View style={styles.transactionProcessing}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.processingText}>Processing Payment...</Text>
                <Text style={styles.processingSubtext}>Please wait while we confirm your transaction</Text>
              </View>
            )}
          </>
        )}
        
        {/* Register Button - only show if wallet connected and not face registered */}
        {userStatus !== 'face_registered' && isConnected && (
          <TouchableOpacity 
            style={styles.registerButton} 
            onPress={handleRegister}
            disabled={isLoading}
          >
            <IconSymbol name="person.crop.circle.badge.plus" size={24} color="#ffffff" />
            <Text style={styles.buttonText}>
              {isLoading ? 'Processing...' : 'Register'}
            </Text>
          </TouchableOpacity>
        )}

        {message ? (
          <View style={[
            styles.messageContainer,
            message.includes('Error') || message.includes('not recognized') 
              ? styles.errorMessage 
              : styles.successMessage
          ]}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webView: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 10,
    textAlign: 'center',
    lineHeight: 24,
  },
  accountReady: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 16,
    marginBottom: 24,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0369a1',
    marginLeft: 8,
  },
  statusSubtext: {
    fontSize: 14,
    color: '#0369a1',
    opacity: 0.8,
  },
  walletConnected: {
    alignItems: 'center',
    marginBottom: 20,
  },
  walletDisconnected: {
    alignItems: 'center',
    marginBottom: 20,
  },
  walletStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#28a745',
    marginRight: 8,
  },
  walletText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  connectButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 36,
  },
  disconnectButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
  },
  registerButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 50,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cameraButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 25,
  },
  captureButton: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 40,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  messageContainer: {
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginTop: 20,
  },
  successMessage: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
  },
  transactionProcessing: {
    backgroundColor: '#f0f9ff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  processingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginTop: 12,
    marginBottom: 4,
  },
  processingSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
