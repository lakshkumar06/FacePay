import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';

const FaceRecognition = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [isWebViewMode, setIsWebViewMode] = useState(false);
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
    
    if (mode === 'webview') {
      setIsWebViewMode(true);
      
      if (token) {
        console.log('Fetching image with token:', token);
        // Fetch image data using token
        fetch(`http://10.161.2.236:3001/api/get-image/${token}`)
          .then(response => {
            console.log('Image fetch response status:', response.status);
            return response.json();
          })
          .then(data => {
            console.log('Image fetch result:', data);
            if (data.success) {
              setCapturedImage(data.imageData);
              setMessage('Image loaded from iOS app. Ready to process.');
            } else {
              setMessage('Error loading image: ' + data.error);
            }
          })
          .catch(error => {
            console.error('Error fetching image:', error);
            setMessage('Error loading image: ' + error.message);
          });
      } else if (imageData) {
        setCapturedImage(imageData);
        setMessage('Image loaded from iOS app. Ready to process.');
      }
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
    } catch (error) {
      setMessage('Error accessing camera: ' + error.message);
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
    
    const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    console.log('Face detection result:', detection ? 'Face found' : 'No face found');
    if (detection) {
      console.log('Face descriptor length:', detection.descriptor.length);
    }
    return detection;
  };

  const detectFaceFromDataURL = async (dataURL) => {
    const response = await fetch(dataURL);
    const blob = await response.blob();
    return await detectFace(blob);
  };


  const registerFace = async () => {
    if (!name.trim()) {
      setMessage('Please enter a name');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      let imageData;
      if (isWebViewMode && capturedImage) {
        imageData = capturedImage;
      } else {
        imageData = capturePhoto();
      }
      
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      const detection = await detectFace(blob);
      
      if (!detection) {
        setMessage('No face detected in the image');
        setIsLoading(false);
        return;
      }

      const embedding = Array.from(detection.descriptor);
      
      await axios.post('http://10.161.2.236:3001/api/register', {
        name: name.trim(),
        embedding: embedding
      });

      setMessage(`Face registered successfully for ${name}`);
      setName('');
      
      // If in WebView mode, close the WebView after successful registration
      if (isWebViewMode) {
        setTimeout(() => {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'registration_success',
              message: `Face registered successfully for ${name}`
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

  const verifyFace = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      let imageData;
      if (isWebViewMode && capturedImage) {
        imageData = capturedImage;
      } else {
        imageData = capturePhoto();
      }
      
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      const detection = await detectFace(blob);
      
      if (!detection) {
        setMessage('No face detected in the image');
        setIsLoading(false);
        return;
      }

      const embedding = Array.from(detection.descriptor);
      
      const result = await axios.post('http://10.161.2.236:3001/api/verify', {
        embedding: embedding,
        threshold: 0.9
      });

      if (result.data.match) {
        setMessage(`Face verified! Welcome ${result.data.name} (Similarity: ${(result.data.similarity * 100).toFixed(1)}%)`);
        
        // If in WebView mode, send result back to iOS app
        if (isWebViewMode) {
          setTimeout(() => {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'verification_success',
                name: result.data.name,
                similarity: result.data.similarity,
                message: `Face verified! Welcome ${result.data.name}`
              }));
            }
          }, 2000);
        }
      } else {
        setMessage('Face not recognized');
        
        // If in WebView mode, send failure result back to iOS app
        if (isWebViewMode) {
          setTimeout(() => {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'verification_failed',
                message: 'Face not recognized'
              }));
            }
          }, 2000);
        }
      }
    } catch (error) {
      setMessage('Error verifying face: ' + error.message);
      
      // If in WebView mode, send error back to iOS app
      if (isWebViewMode) {
        setTimeout(() => {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: 'Error verifying face: ' + error.message
            }));
          }
        }, 2000);
      }
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
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Face Recognition App</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Camera/Image Section */}
        <div className="space-y-4">
          <div className="relative">
            {isWebViewMode && capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured face"
                className="w-full rounded-lg border-2 border-gray-300"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-full rounded-lg border-2 border-gray-300"
                  style={{ display: 'block' }}
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
              </>
            )}
          </div>
          
          {!isWebViewMode && (
            <div className="flex gap-2">
              <button
                onClick={startCamera}
                disabled={!modelsLoaded}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                Start Camera
              </button>
              <button
                onClick={stopCamera}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Stop Camera
              </button>
            </div>
          )}
        </div>

        {/* Controls Section */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Name (for registration):</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-3">
            <button
              onClick={registerFace}
              disabled={!modelsLoaded || isLoading}
              className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 font-medium"
            >
              {isLoading ? 'Processing...' : 'Register Face'}
            </button>
            
            <button
              onClick={verifyFace}
              disabled={!modelsLoaded || isLoading}
              className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 font-medium"
            >
              {isLoading ? 'Processing...' : 'Verify Face'}
            </button>
          </div>

          {message && (
            <div className={`p-3 rounded-md ${
              message.includes('Error') || message.includes('not recognized') 
                ? 'bg-red-100 text-red-700 border border-red-300' 
                : 'bg-green-100 text-green-700 border border-green-300'
            }`}>
              {message}
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p>Status: {modelsLoaded ? '✅ Models loaded' : '⏳ Loading models...'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;
