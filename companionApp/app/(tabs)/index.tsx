import React, { useState, useRef } from 'react';
import { StyleSheet, TouchableOpacity, Alert, TextInput, View, Text } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';

export default function HomeScreen() {
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const cameraRef = useRef<CameraView>(null);

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
        quality: 0.7, // Increased quality for better face detection
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
              imageData: base64Image
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
            
            // Create WebView URL with token instead of image data
            const webViewUrl = `http://10.161.2.236:5173/?mode=webview&token=${uploadResult.token}`;
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
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    await captureImage(true);
  };

  const verifyFace = async () => {
    await captureImage(false);
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'registration_success':
          Alert.alert('Success', data.message);
          setShowWebView(false);
          setName('');
          setMessage(data.message);
          break;
        case 'verification_success':
          Alert.alert('Face Verified', `Welcome ${data.name}!`);
          setShowWebView(false);
          setMessage(data.message);
          break;
        case 'verification_failed':
          Alert.alert('Face Not Recognized', data.message);
          setShowWebView(false);
          setMessage(data.message);
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
          Register your face for secure payments
        </ThemedText>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#666"
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.registerButton, !name.trim() && styles.disabledButton]} 
          onPress={handleRegister}
          disabled={!name.trim() || isLoading}
        >
          <IconSymbol name="person.crop.circle.badge.plus" size={24} color="#ffffff" />
          <ThemedText style={styles.buttonText}>
            {isLoading ? 'Processing...' : 'Register Face'}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.verifyButton} 
          onPress={verifyFace}
          disabled={isLoading}
        >
          <IconSymbol name="checkmark.circle" size={24} color="#ffffff" />
          <ThemedText style={styles.buttonText}>
            {isLoading ? 'Processing...' : 'Verify Face'}
          </ThemedText>
        </TouchableOpacity>

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
    marginBottom: 40,
    textAlign: 'center',
    opacity: 0.7,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  textInput: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
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
  verifyButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
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
