import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Alert, TextInput, View, Text, ActivityIndicator } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import { useWallet } from '@/contexts/WalletContext';

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
  const cameraRef = useRef<CameraView>(null);

  // Wallet connection
  const { isConnected, walletAddress, connect, disconnect, isLoading: walletLoading, error: walletError } = useWallet();

  // Check user status when wallet connects
  useEffect(() => {
    if (isConnected && walletAddress) {
      checkUserStatus();
    } else {
      setUserStatus('not_registered');
    }
  }, [isConnected, walletAddress]);

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
            
            // Create WebView URL with token and wallet address
            const webViewUrl = `http://10.161.2.236:5173/?mode=webview&token=${uploadResult.token}&walletAddress=${walletAddress}`;
            console.log('WebView URL:', webViewUrl);
            
            setWebViewUrl(webViewUrl);
            setShowWebView(true);
          } else {
            throw new Error(uploadResult.error || 'Failed to upload image');
          }
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          Alert.alert('Error', 'Failed to upload image: ' + uploadError.message);
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
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'registration_success':
          Alert.alert('Account Created!', 'Your face has been registered successfully.');
          setShowWebView(false);
          setMessage('Account created successfully!');
          setUserStatus('face_registered');
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
      <ThemedView style={styles.container}>
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
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          FacePay Companion
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {userStatus === 'face_registered' 
            ? 'Your account is ready for secure payments'
            : 'Connect your wallet and register your face for secure payments'
          }
        </ThemedText>
        
        {/* Account Status */}
        <View style={styles.statusSection}>
          {userStatus === 'face_registered' ? (
            <View style={styles.accountReady}>
              <View style={styles.statusIndicator}>
                <IconSymbol name="checkmark.circle.fill" size={24} color="#28a745" />
                <ThemedText style={styles.statusText}>Account Ready</ThemedText>
              </View>
              <ThemedText style={styles.statusSubtext}>
                Wallet: {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-8)}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.walletSection}>
              {isConnected ? (
                <View style={styles.walletConnected}>
                  <View style={styles.walletStatus}>
                    <View style={styles.greenDot} />
                    <ThemedText style={styles.walletText}>
                      Connected: {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-8)}
                    </ThemedText>
                  </View>
                  <TouchableOpacity 
                    style={styles.disconnectButton} 
                    onPress={disconnect}
                    disabled={walletLoading}
                  >
                    <IconSymbol name="xmark.circle" size={20} color="#ffffff" />
                    <ThemedText style={styles.buttonText}>Disconnect</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.walletDisconnected}>
                  <ThemedText style={styles.walletText}>No wallet connected</ThemedText>
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
                    <ThemedText style={styles.buttonText}>
                      {walletLoading ? 'Connecting...' : 'Connect Phantom'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}
              
              {walletError && (
                <View style={styles.errorContainer}>
                  <ThemedText style={styles.errorText}>{walletError}</ThemedText>
                </View>
              )}
            </View>
          )}
        </View>
        
        {/* Register Button - only show if not face registered */}
        {userStatus !== 'face_registered' && (
          <TouchableOpacity 
            style={[
              styles.registerButton, 
              !isConnected && styles.disabledButton
            ]} 
            onPress={handleRegister}
            disabled={!isConnected || isLoading}
          >
            <IconSymbol name="person.crop.circle.badge.plus" size={24} color="#ffffff" />
            <ThemedText style={styles.buttonText}>
              {isLoading ? 'Processing...' : 'Register'}
            </ThemedText>
          </TouchableOpacity>
        )}

        {message ? (
          <ThemedView style={[
            styles.messageContainer,
            message.includes('Error') || message.includes('not recognized') 
              ? styles.errorMessage 
              : styles.successMessage
          ]}>
            <ThemedText style={styles.messageText}>{message}</ThemedText>
          </ThemedView>
        ) : null}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webView: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 30,
    textAlign: 'center',
    opacity: 0.7,
  },
  statusSection: {
    width: '100%',
    marginBottom: 30,
  },
  accountReady: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#d4edda',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#155724',
    marginLeft: 8,
  },
  statusSubtext: {
    fontSize: 14,
    color: '#155724',
    opacity: 0.8,
  },
  walletSection: {
    width: '100%',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  walletConnected: {
    alignItems: 'center',
  },
  walletDisconnected: {
    alignItems: 'center',
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
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  connectButton: {
    backgroundColor: '#6f42c1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disconnectButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f8d7da',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  errorText: {
    fontSize: 12,
    color: '#721c24',
    textAlign: 'center',
  },
  registerButton: {
    backgroundColor: '#007AFF',
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
  disabledButton: {
    backgroundColor: '#ccc',
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
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  errorMessage: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
