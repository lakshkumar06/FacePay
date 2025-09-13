#!/bin/bash

# Script to download face-api.js models
echo "Downloading face-api.js models..."

MODELS_DIR="./frontend/public/models"
BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

# Create models directory if it doesn't exist
mkdir -p "$MODELS_DIR"

# Download model files
echo "Downloading TinyFaceDetector model..."
curl -o "$MODELS_DIR/tiny_face_detector_model-weights_manifest.json" "$BASE_URL/tiny_face_detector_model-weights_manifest.json"
curl -o "$MODELS_DIR/tiny_face_detector_model-shard1" "$BASE_URL/tiny_face_detector_model-shard1"

echo "Downloading FaceLandmark68Net model..."
curl -o "$MODELS_DIR/face_landmark_68_model-weights_manifest.json" "$BASE_URL/face_landmark_68_model-weights_manifest.json"
curl -o "$MODELS_DIR/face_landmark_68_model-shard1" "$BASE_URL/face_landmark_68_model-shard1"

echo "Downloading FaceRecognitionNet model..."
curl -o "$MODELS_DIR/face_recognition_model-weights_manifest.json" "$BASE_URL/face_recognition_model-weights_manifest.json"
curl -o "$MODELS_DIR/face_recognition_model-shard1" "$BASE_URL/face_recognition_model-shard1"
curl -o "$MODELS_DIR/face_recognition_model-shard2" "$BASE_URL/face_recognition_model-shard2"

echo "Models downloaded successfully!"
echo "You can now start the application."
