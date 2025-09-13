import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';

interface FaceRecognitionWebViewProps {
  onResult?: (result: any) => void;
}

export default function FaceRecognitionWebView({ onResult }: FaceRecognitionWebViewProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');

  const captureImage = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Camera permission is required to capture images.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setCapturedImage(imageUri);
        
        // Convert image to base64 for URL parameter
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        // Create WebView URL with image data
        const encodedImage = encodeURIComponent(base64Image);
        const webViewUrl = `http://YOUR_COMPUTER_IP:5173/?mode=webview&image=${encodedImage}`;
        
        setWebViewUrl(webViewUrl);
        setShowWebView(true);
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image');
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'registration_success':
          Alert.alert('Success', data.message);
          setShowWebView(false);
          onResult?.(data);
          break;
        case 'verification_success':
          Alert.alert('Face Verified', `Welcome ${data.name}!`);
          setShowWebView(false);
          onResult?.(data);
          break;
        case 'verification_failed':
          Alert.alert('Face Not Recognized', data.message);
          setShowWebView(false);
          onResult?.(data);
          break;
        case 'error':
          Alert.alert('Error', data.message);
          setShowWebView(false);
          onResult?.(data);
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  if (showWebView) {
    return (
      <View style={{ flex: 1 }}>
        <WebView
          source={{ uri: webViewUrl }}
          style={{ flex: 1 }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 30 }}>
        Face Recognition
      </Text>
      
      {capturedImage && (
        <View style={{ marginBottom: 20 }}>
          <Image
            source={{ uri: capturedImage }}
            style={{ width: 200, height: 150, borderRadius: 10 }}
          />
        </View>
      )}
      
      <TouchableOpacity
        onPress={captureImage}
        style={{
          backgroundColor: '#007AFF',
          paddingHorizontal: 30,
          paddingVertical: 15,
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
          {capturedImage ? 'Capture New Image' : 'Capture Image'}
        </Text>
      </TouchableOpacity>
      
      {capturedImage && (
        <TouchableOpacity
          onPress={() => setShowWebView(true)}
          style={{
            backgroundColor: '#34C759',
            paddingHorizontal: 30,
            paddingVertical: 15,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
            Process Image
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
