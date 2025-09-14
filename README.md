# Gaze

## Inspiration

We all know the market's bullish on crypto and Web3, but there's still one major flaw: spendability. Using crypto for everyday payments still feels slow and clunky: copying addresses, scanning QR codes, switching apps. It's all too much of steps. I wanted it to feel instant and invisible, like contactless payments — but with no cards, no taps, just a glance. If we can prove identity safely and privately, why not use that to approve payments? My hackathon goal was to demonstrate a realistic, secure, and demo-friendly path to that future using Solana and wallet-native signing, while keeping user privacy front of mind.

## What it does

With Glaze, paying is as simple as looking.

1. You register once in the app with a quick selfie.
2. Next time you're buying a zero-sugar Monster from a vending machine, you just look at the camera.
3. A payment request pops up on your phone.
4. You tap once to approve and you're done.

No cards, no QR codes, no extra steps — just glance → approve → done.

## How we built it

**Devnet Solana** to handle transactions on-chain.
**React** for the vendor checkout demo.
**Face-api** to generate face embeddings for recognition.
**Node.js + SQLite** backend to match users and handle requests.
**Expo** (iOS app) for users device to register and approve transactionss.
**Phantom Deeplinks** to make the payment flow feel seamless.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend│    │   Node.js Backend│    │  Expo iOS App   │
│                 │    │                  │    │                 │
│ • Face Detection│◄──►│ • Face Matching  │◄──►│ • Registration  │
│ • Payment UI    │    │ • Payment Reqs   │    │ • Approvals     │
│ • Camera Feed   │    │ • SQLite DB      │    │ • Phantom Links │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌──────────────────┐
                    │  Solana Devnet   │
                    │                  │
                    │ • FacePay Program│
                    │ • Transaction    │
                    │ • Wallet Signing │
                    └──────────────────┘
```

## Technical Stack

### Smart Contract (Solana)
- **Language**: Rust
- **Framework**: Anchor
- **Network**: Solana Devnet
- **Program**: FacePay Program for handling payment transactions
- **Features**: 
  - Wallet address validation
  - Payment amount verification
  - Transaction signing

### Backend
- **Runtime**: Node.js
- **Database**: SQLite with face embeddings storage
- **Face Recognition**: face-api.js
  - TinyFaceDetector for face detection
  - FaceLandmark68Net for landmark detection
  - FaceRecognitionNet for embedding generation
- **API Endpoints**:
  - `POST /register` - Register new face embedding
  - `POST /recognize` - Match face to user
  - `POST /payment-request` - Create payment request
  - `GET /payment-status/:id` - Check payment status

### Frontend (Vendor Interface)
- **Framework**: React + Vite
- **Face Detection**: face-api.js
- **UI**: Real-time camera feed with face detection overlay
- **Payment Flow**: QR code generation for payment requests

### Mobile App (User Interface)
- **Framework**: Expo (React Native)
- **Platform**: iOS
- **Wallet Integration**: Phantom Wallet deep links
- **Features**:
  - Face registration with selfie capture
  - Push notifications for payment requests
  - One-tap payment approval
  - Transaction history

## API Reference

### Face Registration
```javascript
POST /register
{
  "walletAddress": "string",
  "faceEmbedding": [number, number, ...], // 128-dimensional vector
  "userInfo": {
    "name": "string",
    "email": "string"
  }
}
```

### Face Recognition
```javascript
POST /recognize
{
  "faceEmbedding": [number, number, ...],
  "threshold": 0.6 // Similarity threshold (0-1)
}

Response:
{
  "match": boolean,
  "userId": "string",
  "walletAddress": "string",
  "confidence": number
}
```

### Payment Request
```javascript
POST /payment-request
{
  "userId": "string",
  "amount": number,
  "merchant": "string",
  "description": "string"
}

Response:
{
  "paymentId": "string",
  "qrCode": "string",
  "status": "pending"
}
```

## Security Considerations

### Face Data Privacy
- Face embeddings stored as 128-dimensional vectors (not raw images)
- Local processing on device before transmission
- No biometric images stored on server
- Optional encryption for embedding storage

### Payment Security
- All transactions require explicit user approval
- Wallet private keys never exposed
- Phantom Wallet handles all cryptographic operations
- Solana program validates all payment transactions

### Network Security
- HTTPS for all API communications
- Request rate limiting
- Input validation and sanitization
- SQLite database with proper access controls

## Development Setup

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Solana CLI
- Anchor CLI
- Expo CLI
- iOS Simulator (for mobile testing)

### Installation

1. **Clone and setup**
```bash
git clone <repo-url>
cd Gaze
```

2. **Backend Setup**
```bash
cd backend
npm install
npm run dev
```

3. **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

4. **Mobile App Setup**
```bash
cd companionApp
npm install
npx expo start
```

5. **Solana Program Setup**
```bash
cd facepay_program
anchor build
anchor deploy
```

### Environment Variables
```bash
# Backend
DATABASE_PATH=./face_embeddings.db
PORT=3001
SOLANA_RPC_URL=https://api.devnet.solana.com

# Frontend
VITE_API_URL=http://localhost:3001
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com

# Mobile
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_PROGRAM_ID=<your-program-id>
```

## Challenges we ran into

At first, I tried storing face embeddings and user mappings directly on-chain. But testing showed it was too slow and expensive, especially as data grows. For the hackathon, I pivoted to an off-chain backend to keep things smooth. I also explored The Graph Protocol to query data more efficiently, but subgraphs aren't supported on Solana yet.

### Technical Challenges
- **Face Detection Latency**: Initial camera feed processing was too slow for real-time UX
- **Cross-Platform Compatibility**: Ensuring face-api.js worked consistently across web and mobile
- **Wallet Integration**: Deep linking between mobile app and Phantom Wallet required careful URL scheme handling
- **Database Performance**: SQLite queries for face matching needed optimization for sub-second response times
- **Model Loading**: face-api.js model files were large and required efficient loading strategies

## Accomplishments that we're proud of

For the first time, the Web3 part felt easier than the Web2 part. Setting up transactions on Solana was smoother than wiring up the app, backend, and pushing notifications across multiple platforms.

## What we learned

UX IS EVERYTHING

## What's next for Gaze

I wanna explore decentralized options to store face embeddings securely, so that the data stays private, tamper-proof, and distributed.

### Future Technical Roadmap
- **Decentralized Storage**: IPFS or Arweave for face embedding storage
- **Zero-Knowledge Proofs**: Privacy-preserving face verification without revealing embeddings
- **Multi-Chain Support**: Expand beyond Solana to Ethereum, Polygon, etc.
- **Advanced Biometrics**: Voice recognition, gait analysis for additional security
- **Hardware Integration**: Direct integration with payment terminals and POS systems
