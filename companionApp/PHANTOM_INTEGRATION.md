# FacePay Companion App - Phantom Wallet Integration

This iOS companion app now includes Phantom wallet integration for secure face-based payments on Solana.

## Features

- **Phantom Wallet Connection**: Connect to Phantom wallet using deeplinks
- **Face Registration**: Register your face with your wallet address
- **Face Verification**: Verify your identity for payments
- **Secure Communication**: End-to-end encryption with Phantom using Diffie-Hellman key exchange

## How It Works

### 1. Wallet Connection Flow
1. User taps "Connect Phantom" button
2. App opens Phantom wallet via deeplink
3. User approves connection in Phantom
4. Phantom redirects back to app with encrypted response
5. App decrypts response and stores wallet address

### 2. Face Registration Flow
1. User must be connected to wallet first
2. User enters their name
3. User taps "Register Face" button
4. Camera captures face image
5. Image + wallet address sent to backend
6. Face embedding generated and stored with wallet address

### 3. Face Verification Flow
1. User taps "Verify Face" button
2. Camera captures face image
3. Image sent to backend for verification
4. Backend compares with stored embeddings
5. Returns verification result

## Technical Implementation

### Dependencies
- `@solana/web3.js`: Solana blockchain interaction
- `tweetnacl`: Encryption/decryption
- `bs58`: Base58 encoding
- `expo-linking`: Deep link handling

### Key Components

#### PhantomWalletService
- Handles encryption/decryption with Phantom
- Manages Diffie-Hellman key exchange
- Provides connect/disconnect functionality

#### WalletContext
- React context for wallet state management
- Handles deeplink responses
- Provides wallet connection status

#### Main Screen
- Wallet connection UI
- Face registration/verification flow
- Integration between wallet and face scanning

## Configuration

The app uses the custom URL scheme `facepay://` for deeplinks, configured in `app.json`.

## Security

- All communication with Phantom is encrypted using TweetNaCl
- Wallet addresses are securely stored and associated with face embeddings
- Face data is processed locally and sent to backend for storage

## Usage

1. Install Phantom wallet on your device
2. Open the FacePay Companion app
3. Connect your Phantom wallet
4. Register your face with your name
5. Use face verification for payments

## Development

To run the app:
```bash
cd companionApp
npm start
```

Scan the QR code with Expo Go app on your device.
