import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';

const FaceRegistration = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [isWebViewMode, setIsWebViewMode] = useState(false);
  const [currentWalletAddress, setCurrentWalletAddress] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    loadModels();
    checkForWebViewMode();
  }, []);

  const checkForWebViewMode = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const imageData = urlParams.get('image');
    const token = urlParams.get('token');
    const mode = urlParams.get('mode');
    const walletAddress = urlParams.get('walletAddress');
    
    console.log('🔍 Checking WebView mode for registration...');
    console.log('📋 URL parameters:', {
      mode,
      hasImageData: !!imageData,
      hasToken: !!token,
      walletAddress
    });
    
    if (mode === 'webview') {
      console.log('✅ WebView registration mode detected!');
      setIsWebViewMode(true);
      
      if (token) {
        console.log('🔄 Fetching image with token:', token);
        // Fetch image data using token
        fetch(`http://10.161.2.236:3001/api/get-image/${token}`)
          .then(response => {
            console.log('📡 Image fetch response status:', response.status);
            return response.json();
          })
          .then(data => {
            console.log('📷 Image fetch result:', data);
            if (data.success) {
              setCapturedImage(data.imageData);
              setMessage('Image loaded from mobile app. Ready to register your face.');
              console.log('✅ Image loaded successfully from token');
              // Store wallet address for later use
              if (walletAddress) {
                setCurrentWalletAddress(walletAddress);
                window.walletAddress = walletAddress;
                console.log('💰 Wallet address stored:', walletAddress);
              }
            } else {
              setMessage('Error loading image: ' + data.error);
              console.error('❌ Error loading image from token:', data.error);
            }
          })
          .catch(error => {
            console.error('❌ Error fetching image:', error);
            setMessage('Error loading image: ' + error.message);
          });
      } else if (imageData) {
        console.log('📷 Direct image data provided');
        setCapturedImage(imageData);
        setMessage('Image loaded from mobile app. Ready to register your face.');
        console.log('✅ Image loaded successfully from direct data');
        // Store wallet address for later use
        if (walletAddress) {
          setCurrentWalletAddress(walletAddress);
          window.walletAddress = walletAddress;
          console.log('💰 Wallet address stored:', walletAddress);
        }
      } else {
        console.log('⚠️ WebView mode but no image data or token provided');
      }
    } else {
      console.log('❌ Not in WebView mode. Mode:', mode);
    }
  };

  const loadModels = async () => {
    try {
      console.log('Starting to load models for registration...');
      const MODEL_URL = '/models';
      console.log('Model URL:', MODEL_URL);
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      
      console.log('Models loaded successfully for registration');
      setModelsLoaded(true);
      setMessage('Models loaded successfully. Ready for face registration.');
    } catch (error) {
      console.error('Error loading models:', error);
      setMessage('Error loading models: ' + error.message);
    }
  };

  const startCamera = async () => {
    try {
      // First, try to get available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        setMessage('No camera devices found. Please check your camera connection.');
        return;
      }
      
      // Try different camera constraints
      const constraints = [
        { video: { facingMode: 'user' } }, // Front camera
        { video: { facingMode: 'environment' } }, // Back camera
        { video: { deviceId: videoDevices[0].deviceId } }, // Specific device
        { video: true } // Default
      ];
      
      let stream = null;
      for (const constraint of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          break;
        } catch (err) {
          continue;
        }
      }
      
      if (!stream) {
        setMessage('Unable to access camera. Please check permissions and try again.');
        return;
      }
      
      videoRef.current.srcObject = stream;
    } catch (error) {
      let errorMessage = 'Camera access error: ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Camera permission denied. Please allow camera access and refresh.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found. Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is being used by another application.';
      } else {
        errorMessage += error.message;
      }
      
      setMessage(errorMessage);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/jpeg');
  };

  const detectFace = async (imageData) => {
    console.log('Starting face detection for registration...');
    console.log('Image data type:', typeof imageData);
    console.log('Image data size:', imageData.size || imageData.length);
    
    const img = await faceapi.bufferToImage(imageData);
    console.log('Image loaded, dimensions:', img.width, 'x', img.height);
    console.log('Detecting face...');
    
    // Use more lenient face detection options
    const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({
      inputSize: 320, // Smaller input size for better detection
      scoreThreshold: 0.3 // Lower threshold for better detection
    }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    console.log('Face detection result:', detection ? 'Face found' : 'No face found');
    if (detection) {
      console.log('Face descriptor length:', detection.descriptor.length);
      console.log('Face detection confidence:', detection.score);
    }
    return detection;
  };

  const detectFaceFromDataURL = async (dataURL) => {
    const response = await fetch(dataURL);
    const blob = await response.blob();
    return await detectFace(blob);
  };

  const registerFace = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      let blob;
      if (isWebViewMode && capturedImage) {
        // Handle base64 data URL from mobile app
        if (capturedImage.startsWith('data:')) {
          const response = await fetch(capturedImage);
          blob = await response.blob();
        } else {
          // Handle regular URL
          const response = await fetch(capturedImage);
          blob = await response.blob();
        }
      } else {
        // Handle camera capture
        const imageData = capturePhoto();
        const response = await fetch(imageData);
        blob = await response.blob();
      }
      
      console.log('Processing image blob for registration:', blob.type, blob.size);
      console.log('Image dimensions check - blob size:', blob.size, 'bytes');
      const detection = await detectFace(blob);
      
      if (!detection) {
        setMessage('No face detected in the image. Try: 1) Better lighting 2) Face the camera directly 3) Remove glasses/masks 4) Capture a clearer image');
        setIsLoading(false);
        return;
      }

      const embedding = Array.from(detection.descriptor);
      const walletAddress = currentWalletAddress || window.walletAddress || 'unknown';
      
      // First, check if user exists and create if needed
      try {
        const userResponse = await axios.get(`http://10.161.2.236:3001/api/user/${walletAddress}`);
        
        if (!userResponse.data.exists) {
          // User doesn't exist, create them
          await axios.post('http://10.161.2.236:3001/api/user', {
            walletAddress: walletAddress
          });
          console.log('User created successfully');
        }
      } catch (userError) {
        console.error('Error handling user creation:', userError);
        // Continue with registration even if user creation fails
        // The backend will handle the case where user doesn't exist
      }
      
      // Now register the face
      await axios.post('http://10.161.2.236:3001/api/register', {
        walletAddress: walletAddress,
        embedding: embedding
      });

      setMessage('Face registered successfully! Your account is now ready for secure payments.');
      
      // If in WebView mode, close the WebView after successful registration
      if (isWebViewMode) {
        setTimeout(() => {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'registration_success',
              message: 'Face registered successfully! Your account is now ready for secure payments.',
              walletAddress: walletAddress
            }));
          }
        }, 2000);
      }
    } catch (error) {
      setMessage('Error registering face: ' + error.message);
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">Face Registration</h1>
          <p className="text-gray-600">Register your face for secure payments</p>
        </div>

        {/* Registration Card */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Registration Details */}
            <div className="space-y-6">
              <div className="border-b border-gray-300 pb-4">
                <h2 className="text-2xl font-semibold text-black mb-4">Account Setup</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Wallet Address</span>
                    <span className="font-mono text-sm text-gray-800">
                      {currentWalletAddress ? 
                        `${currentWalletAddress.slice(0, 8)}...${currentWalletAddress.slice(-8)}` : 
                        'Not connected'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className="font-semibold text-orange-600">Registration Required</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-black">Instructions:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    Ensure good lighting on your face
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    Look directly at the camera
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    Remove glasses or masks if possible
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    Keep your face centered in the frame
                  </li>
                </ul>
              </div>
            </div>

            {/* Camera Section */}
            <div className="space-y-6">
              {!isWebViewMode && (
                <div className="space-y-4">
                  <button
                    onClick={startCamera}
                    disabled={!modelsLoaded}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
                  >
                    Start Camera
                  </button>
                  
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      className="w-full h-64 object-cover rounded-lg border border-gray-300"
                      style={{ display: 'block' }}
                    />
                    <canvas
                      ref={canvasRef}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {isWebViewMode && capturedImage && (
                <div className="space-y-4">
                  <div className="text-center">
                    <img
                      src={capturedImage}
                      alt="Captured face"
                      className="w-full h-64 object-cover rounded-lg border border-gray-300 mx-auto"
                    />
                    <p className="text-sm text-gray-600 mt-2">Image captured from mobile app</p>
                  </div>
                </div>
              )}

              <div className="space-y-4 flex justify-center">
                <button
                  onClick={registerFace}
                  disabled={!modelsLoaded || isLoading || (!capturedImage && !videoRef.current?.srcObject)}
                  className="px-16 py-4 bg-green-600 text-white rounded-lg w-fit hover:bg-green-700 cursor-pointer disabled:bg-gray-400 font-semibold text-lg transition-colors duration-200"
                >
                  {isLoading ? 'Registering...' : 'Register Face'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg ${
            message.includes('Error') || message.includes('No face detected') 
              ? 'bg-red-50 border border-red-200' 
              : message.includes('successfully')
              ? 'bg-green-50 border border-green-200'
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`text-center font-medium ${
              message.includes('Error') || message.includes('No face detected')
                ? 'text-red-700'
                : message.includes('successfully')
                ? 'text-green-700'
                : 'text-blue-700'
            }`}>
              {message}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by FacePay • Secure facial recognition registration</p>
        </div>
      </div>
    </div>
  );
};

export default FaceRegistration;
