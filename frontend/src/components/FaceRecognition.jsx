import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';

const FaceRecognition = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [isWebViewMode, setIsWebViewMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('idle'); // 'idle', 'verifying', 'waiting_approval', 'completed', 'failed'
  const [pollingInterval, setPollingInterval] = useState(null);
  const [currentWalletAddress, setCurrentWalletAddress] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const modalVideoRef = useRef(null);
  const modalCanvasRef = useRef(null);

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
    
    console.log('🔍 Checking WebView mode...');
    console.log('📋 URL parameters:', {
      mode,
      hasImageData: !!imageData,
      hasToken: !!token,
      walletAddress
    });
    
    if (mode === 'webview') {
      console.log('✅ WebView mode detected!');
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
              setMessage('Image loaded from iOS app. Ready to process.');
              console.log('✅ Image loaded successfully from token');
              // Store wallet address for later use
              if (walletAddress) {
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
        setMessage('Image loaded from iOS app. Ready to process.');
        console.log('✅ Image loaded successfully from direct data');
        // Store wallet address for later use
        if (walletAddress) {
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
      console.log('Starting to load models...');
      console.log('WebView mode:', isWebViewMode);
      const MODEL_URL = '/models';
      console.log('Model URL:', MODEL_URL);
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      
      console.log('Models loaded successfully');
      setModelsLoaded(true);
      setMessage('Models loaded successfully');
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

  const startModalCamera = async () => {
    try {
      setModalMessage('Requesting camera access...');
      
      // First, try to get available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Available video devices:', videoDevices);
      
      if (videoDevices.length === 0) {
        setModalMessage('No camera devices found. Please check your camera connection.');
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
          console.log('Trying constraint:', constraint);
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          console.log('Camera access successful with constraint:', constraint);
          break;
        } catch (err) {
          console.log('Failed with constraint:', constraint, err.message);
          continue;
        }
      }
      
      if (!stream) {
        setModalMessage('Unable to access camera. Please check permissions and try again.');
        return;
      }
      
      modalVideoRef.current.srcObject = stream;
      setModalMessage('Camera ready. Position your face in view.');
      
    } catch (error) {
      console.error('Camera access error:', error);
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
      
      setModalMessage(errorMessage);
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
    console.log('Starting face detection...');
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
      
      console.log('Processing image blob:', blob.type, blob.size);
      console.log('Image dimensions check - blob size:', blob.size, 'bytes');
      const detection = await detectFace(blob);
      
      if (!detection) {
        setMessage('No face detected in the image. Try: 1) Better lighting 2) Face the camera directly 3) Remove glasses/masks 4) Capture a clearer image');
        setIsLoading(false);
        return;
      }

      const embedding = Array.from(detection.descriptor);
      const walletAddress = window.walletAddress || 'unknown';
      
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

      setMessage('Face registered successfully');
      
      // If in WebView mode, close the WebView after successful registration
      if (isWebViewMode) {
        setTimeout(() => {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'registration_success',
              message: 'Face registered successfully'
            }));
          }
        }, 2000);
      }
    } catch (error) {
      setMessage('Error registering face: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyFaceInModal = async () => {
    setIsModalLoading(true);
    setModalMessage('');
    setPaymentStatus('verifying');

    try {
      // Capture photo from modal camera
      const imageData = captureModalPhoto();
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      console.log('Processing modal image blob for verification:', blob.type, blob.size);
      const detection = await detectFace(blob);
      
      if (!detection) {
        setModalMessage('No face detected. Try: 1) Better lighting 2) Face the camera directly 3) Remove glasses/masks');
        setIsModalLoading(false);
        setPaymentStatus('idle');
        return;
      }

      const embedding = Array.from(detection.descriptor);
      
      const result = await axios.post('http://10.161.2.236:3001/api/verify', {
        embedding: embedding,
        threshold: 0.9
      });

      if (result.data.match) {
        console.log('✅ Face verification SUCCESS!');
        setPaymentStatus('waiting_approval');
        setModalMessage(`Face verified! Initiating payment of 0.02 SOL... (Similarity: ${(result.data.similarity * 100).toFixed(1)}%)`);
        
        const transactionData = {
          walletAddress: result.data.walletAddress,
          amount: 0.02,
          recipient: 'DBQcu1AKR6gJxhd3aE3dgZsTp51zzYX4avGk6c448ak5',
          similarity: result.data.similarity,
          message: 'Face verified! Please sign transaction to complete payment.',
          timestamp: Date.now()
        };
        
        try {
          const response = await axios.post('http://10.161.2.236:3001/api/transaction-request', transactionData);
          
          // Start polling by wallet address (much simpler!)
          const walletAddress = result.data.walletAddress;
          setModalMessage('Check your phone to approve the transaction');
          
          // Wait a moment before starting to poll to give iOS app time to receive the request
          setTimeout(() => {
            startPaymentPolling(walletAddress);
          }, 2000); // Wait 2 seconds before first poll
          
        } catch (error) {
          console.error('❌ Error sending transaction request to buyer:', error);
          setModalMessage('Error sending transaction request to buyer\'s phone');
          setPaymentStatus('failed');
        }
      } else {
        console.log('❌ Face verification FAILED - no match found');
        setModalMessage('Face not recognized - Payment cancelled');
        setPaymentStatus('failed');
        
        try {
          const response = await axios.post('http://10.161.2.236:3001/api/transaction-request', {
            walletAddress: result.data.walletAddress || 'unknown',
            amount: 0.02,
            recipient: 'DBQcu1AKR6gJxhd3aE3dgZsTp51zzYX4avGk6c448ak5',
            similarity: 0,
            message: 'Face not recognized - Payment cancelled',
            timestamp: Date.now(),
            status: 'failed'
          });
          console.log('✅ Verification failure sent to buyer\'s app successfully!');
        } catch (error) {
          console.error('❌ Error sending verification failure to buyer:', error);
        }
      }
    } catch (error) {
      setModalMessage('Error verifying face: ' + error.message);
      setPaymentStatus('failed');
    } finally {
      setIsModalLoading(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const stopModalCamera = () => {
    if (modalVideoRef.current && modalVideoRef.current.srcObject) {
      const tracks = modalVideoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      modalVideoRef.current.srcObject = null;
    }
  };

  const openModal = async () => {
    setIsModalOpen(true);
    setModalMessage('Initializing camera...');
    setPaymentStatus('idle');
    
    // Check if camera is available before starting
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setModalMessage('Camera not supported on this device.');
        return;
      }
      
      // Start camera automatically when modal opens
      setTimeout(() => {
        startModalCamera();
      }, 100);
    } catch (error) {
      setModalMessage('Camera not available: ' + error.message);
    }
  };

  const closeModal = () => {
    stopModalCamera();
    stopPaymentPolling();
    setIsModalOpen(false);
    setModalMessage('');
    setIsModalLoading(false);
    setPaymentStatus('idle');
    setCurrentWalletAddress(null);
  };

  const captureModalPhoto = () => {
    const video = modalVideoRef.current;
    const canvas = modalCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/jpeg');
  };

  const startPaymentPolling = (walletAddress) => {
    setCurrentWalletAddress(walletAddress);
    
    let pollCount = 0;
    const maxPolls = 30; // Maximum 30 polls (1 minute at 2-second intervals)
    
    const interval = setInterval(async () => {
      pollCount++;
      
      try {
        const response = await axios.get(`http://10.161.2.236:3001/api/payment-status/${walletAddress}`);
        const status = response.data;
        
        if (status.status === 'completed' || status.status === 'approved') {
          setPaymentStatus('completed');
          setModalMessage('Payment completed successfully!');
          clearInterval(interval);
          setPollingInterval(null);
          
          // Auto-close modal after showing success
          setTimeout(() => {
            closeModal();
          }, 3000);
        } else if (status.status === 'failed' || status.status === 'rejected' || status.status === 'cancelled') {
          setPaymentStatus('failed');
          setModalMessage(status.message || 'Payment was cancelled or failed');
          clearInterval(interval);
          setPollingInterval(null);
        } else if (status.status === 'waiting' || status.status === 'pending') {
          // Keep polling - status is still pending
          setModalMessage('Check your phone to approve the transaction');
        } else if (status.status === 'none') {
          // No payment pending yet - continue polling
          setModalMessage('Waiting for transaction to be processed...');
          // Don't stop polling - continue until timeout
        }
        
        // Stop polling if we've reached max attempts
        if (pollCount >= maxPolls) {
          setPaymentStatus('failed');
          setModalMessage('Payment timeout - please try again');
          clearInterval(interval);
          setPollingInterval(null);
        }
        
      } catch (error) {
        console.error('Error checking payment status:', error);
        
        // Only show error message after a few failed attempts
        if (pollCount > 3) {
          setModalMessage('Network error - retrying...');
        }
        
        // Stop polling if we've had too many consecutive errors
        if (pollCount >= maxPolls) {
          setPaymentStatus('failed');
          setModalMessage('Unable to check payment status');
          clearInterval(interval);
          setPollingInterval(null);
        }
      }
    }, 2000); // Poll every 2 seconds
    
    setPollingInterval(interval);
  };

  const stopPaymentPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
              {/* Navbar */}
              <div className="flex items-center justify-center mb-8 shadow-md py-4">
          <div className="flex items-center space-x-4">
            {/* SVG Placeholder */}
            <div className="">
            <svg width="40" height="40" viewBox="0 0 79 79" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M62.5413 39.4999C62.5413 39.4999 52.2384 52.6666 39.4997 52.6666C26.7609 52.6666 16.458 39.4999 16.458 39.4999C16.458 39.4999 26.7609 26.3333 39.4997 26.3333C52.2384 26.3333 62.5413 39.4999 62.5413 39.4999ZM39.4997 32.9166C38.1976 32.9166 36.9248 33.3027 35.8422 34.0261C34.7595 34.7495 33.9157 35.7776 33.4175 36.9806C32.9192 38.1835 32.7888 39.5072 33.0428 40.7843C33.2969 42.0613 33.9239 43.2343 34.8446 44.155C35.7653 45.0757 36.9383 45.7027 38.2153 45.9568C39.4924 46.2108 40.8161 46.0804 42.019 45.5821C43.222 45.0838 44.2501 44.24 44.9735 43.1574C45.6969 42.0748 46.083 40.802 46.083 39.4999C46.083 37.7539 45.3894 36.0794 44.1548 34.8448C42.9202 33.6102 41.2457 32.9166 39.4997 32.9166Z" stroke="black" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9.875 23.0417V13.1667C9.875 12.2937 10.2218 11.4564 10.8391 10.8391C11.4564 10.2218 12.2937 9.875 13.1667 9.875H23.0417" stroke="black" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M69.1247 23.0417V13.1667C69.1247 12.2937 68.7779 11.4564 68.1606 10.8391C67.5433 10.2218 66.706 9.875 65.833 9.875H55.958" stroke="black" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9.875 55.9583V65.8333C9.875 66.7063 10.2218 67.5435 10.8391 68.1608C11.4564 68.7781 12.2937 69.1249 13.1667 69.1249H23.0417" stroke="black" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M69.1247 55.9583V65.8333C69.1247 66.7063 68.7779 67.5435 68.1606 68.1608C67.5433 68.7781 66.706 69.1249 65.833 69.1249H55.958" stroke="black" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

            </div>
            
            {/* Vertical Line */}
            <div className="w-px h-8 bg-gray-300"></div>
            
            {/* Checkout Heading */}
            <h1 className="text-3xl font-medium text-black">Checkout</h1>
          </div>
        </div>
      <div className="max-w-4xl mx-auto p-6">


        {/* Checkout Card */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Payment Details */}
            <div className="space-y-6">
              <div className="border-b border-gray-300 pb-4">
                <h2 className="text-2xl font-semibold text-black mb-4">Payment Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-semibold">0.02 SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Network Fee</span>
                    <span className="font-semibold">~0.0005 SOL</span>
                  </div>
                  <div className="border-t border-gray-300 pt-3 flex justify-between text-lg">
                    <span className="font-bold text-black">Total</span>
                    <span className="font-bold text-black">~0.0205 SOL</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-black">Recipient:</h3>
                <div className="">
                  <p className="font-mono text-sm break-all text-gray-800">DBQcu1AKR6gJxhd3aE3dgZsTp51zzYX4avGk6c448ak5</p>
                </div>
              </div>

            </div>

            {/* Action Section */}
            <div className="space-y-6">

              <div className="space-y-4 flex justify-end">
                <button
                  onClick={openModal}
                  disabled={!modelsLoaded}
                  className=" px-16 py-4 bg-black text-white rounded-[10px]  w-fit hover:bg-[#333] cursor-pointer disabled:bg-gray-400 font-semibold text-lg transition-colors duration-200"
                >
                  Pay 0.02 SOL
                </button>


              </div>




            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by Gaze</p>
        </div>
      </div>

      {/* Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#13131377] flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-[20px] py-10 px-20 max-w-4xl w-full mx-4 animate-slide-up">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-black mb-2">Face Verification</h2>
              <p className="text-gray-600">
                {paymentStatus === 'verifying' ? 'Verifying your identity...' :
                 paymentStatus === 'waiting_approval' ? 'Waiting for transaction approval...' :
                 paymentStatus === 'completed' ? 'Payment completed!' :
                 paymentStatus === 'failed' ? 'Payment failed' :
                 'Position your face in the camera to complete payment'}
              </p>
            </div>
            
            {/* Camera Feed or Status Display */}
            <div className="relative mb-6 flex justify-center">
              {paymentStatus === 'verifying' ? (
                <div className="w-fit h-96 flex items-center justify-center bg-gray-100 rounded-[10px] border border-[#5a5a5a] px-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-black mx-auto mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700">Verifying Identity...</p>
                    <p className="text-sm text-gray-500 mt-2">Processing face recognition</p>
                  </div>
                </div>
              ) : paymentStatus === 'waiting_approval' ? (
                <div className="w-fit h-96 flex items-center justify-center bg-gray-100 rounded-[10px] border border-[#5a5a5a] px-20">
                  <div className="text-center">
                    <div className="animate-pulse">
                      <div className="w-16 h-16 bg-black rounded-full mx-auto mb-4 flex items-center justify-center">
                        <div className="w-8 h-8 bg-white rounded-full animate-ping"></div>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-gray-700">Check Your Phone</p>
                    <p className="text-sm text-gray-500 mt-2">Approve the transaction on your device</p>
                  </div>
                </div>
              ) : paymentStatus === 'completed' ? (
                <div className="w-fit h-96 flex items-center justify-center bg-green-50 rounded-[10px] border border-green-200 px-20">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-green-700">Payment Complete!</p>
                    <p className="text-sm text-green-600 mt-2">0.02 SOL transferred successfully</p>
                  </div>
                </div>
              ) : paymentStatus === 'failed' ? (
                <div className="w-fit h-96 flex items-center justify-center bg-red-50 rounded-[10px] border border-red-200 px-20">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-red-700">Payment Failed</p>
                    <p className="text-sm text-red-600 mt-2">Transaction could not be completed</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <video
                    ref={modalVideoRef}
                    autoPlay
                    muted
                    className="w-full h-96 object-contain rounded-[10px] border border-[#5a5a5a] mx-auto"
                    style={{ display: 'block' }}
                  />
                  <canvas
                    ref={modalCanvasRef}
                    className="hidden"
                  />
                  {/* Camera status indicator - positioned at bottom right */}
                  <div className="absolute bottom-2 right-3">
                    <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                      Camera Active
                    </div>
                  </div>
                </div>
              )}
            </div>
            

            {/* Modal Buttons */}
            <div className="flex gap-3">
              {(paymentStatus === 'idle' || paymentStatus === 'failed') && (
                <>
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 bg-[#cacaca] text-[#1b1b1b] rounded-[8px] hover:bg-gray-500 font-medium"
                  >
                    Cancel
                  </button>
                  
                  {/* Show retry button if camera failed */}
                  {modalMessage && (modalMessage.includes('Error') || modalMessage.includes('camera') || modalMessage.includes('Camera')) && !modalMessage.includes('ready') && !modalMessage.includes('Verifying') ? (
                    <button
                      onClick={startModalCamera}
                      className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-[8px] border border-gray-600 hover:bg-gray-700 font-medium"
                    >
                      Retry Camera
                    </button>
                  ) : (
                    <button
                      onClick={verifyFaceInModal}
                      disabled={isModalLoading || (modalMessage && modalMessage.includes('Error'))}
                      className="flex-1 px-4 py-2 bg-black text-white rounded-[8px] border border-gray-800 hover:bg-gray-800 disabled:bg-gray-400 font-medium"
                    >
                      Done
                    </button>
                  )}
                </>
              )}
              
              {/* Show only close button during processing states */}
              {(paymentStatus === 'verifying' || paymentStatus === 'waiting_approval' || paymentStatus === 'completed') && (
                <button
                  onClick={closeModal}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-[8px] hover:bg-gray-500 font-medium"
                  disabled={paymentStatus === 'verifying' || paymentStatus === 'waiting_approval'}
                >
                  {paymentStatus === 'completed' ? 'Close' : 'Cancel'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceRecognition;
