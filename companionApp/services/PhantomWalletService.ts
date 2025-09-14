import * as Linking from 'expo-linking';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PublicKey, Transaction } from '@solana/web3.js';

// Ensure crypto is set up
try {
  nacl.setPRNG((size: number) => {
    const array = new Uint8Array(size);
    if (global.crypto && global.crypto.getRandomValues) {
      global.crypto.getRandomValues(array);
    } else {
      // Fallback for development
      for (let i = 0; i < size; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return array;
  });
} catch (error) {
  console.warn('Could not set up crypto PRNG:', error);
}

export interface PhantomConnectData {
  public_key: string;
  session: string;
}

export interface PhantomResponse {
  phantom_encryption_public_key: string;
  nonce: string;
  data: string;
}

export interface PhantomSignData {
  transaction: string;
}

export class PhantomWalletService {
  private dappKeyPair: nacl.BoxKeyPair;
  private sharedSecret?: Uint8Array;
  private session?: string;
  private walletPublicKey?: PublicKey;

  constructor() {
    this.dappKeyPair = nacl.box.keyPair();
  }

  // Create redirect URLs for different actions
  createRedirectUrl(action: string): string {
    return Linking.createURL(action);
  }

  // Decrypt payload received from Phantom
  decryptPayload(data: string, nonce: string, sharedSecret?: Uint8Array): any {
    if (!sharedSecret) throw new Error('missing shared secret');

    const decryptedData = nacl.box.open.after(
      bs58.decode(data),
      bs58.decode(nonce),
      sharedSecret
    );
    
    if (!decryptedData) {
      throw new Error('Unable to decrypt data');
    }
    
    // Use TextDecoder instead of Buffer for React Native
    const textDecoder = new TextDecoder('utf-8');
    return JSON.parse(textDecoder.decode(decryptedData));
  }

  // Build Phantom deeplink URL
  buildPhantomUrl(path: string, params: URLSearchParams): string {
    const baseUrl = 'https://phantom.app/ul/v1/';
    return `${baseUrl}${path}?${params.toString()}`;
  }

  // Connect to Phantom wallet (proper implementation per docs)
  async connect(): Promise<void> {
    const redirectLink = this.createRedirectUrl('onConnect');
    
    const params = new URLSearchParams({
      dapp_encryption_public_key: bs58.encode(this.dappKeyPair.publicKey),
      cluster: 'devnet',
      app_url: 'https://facepay.app', // Replace with your actual app URL
      redirect_link: redirectLink,
    });

    const url = this.buildPhantomUrl('connect', params);
    await Linking.openURL(url);
  }

  // Disconnect from Phantom wallet
  async disconnect(): Promise<void> {
    const redirectLink = this.createRedirectUrl('onDisconnect');
    
    const params = new URLSearchParams({
      redirect_link: redirectLink,
    });

    const url = this.buildPhantomUrl('disconnect', params);
    await Linking.openURL(url);
  }

  // Handle connect response from Phantom (proper decryption per docs)
  handleConnectResponse(response: PhantomResponse): PhantomConnectData {
    // Generate shared secret using Diffie-Hellman
    const sharedSecretDapp = nacl.box.before(
      bs58.decode(response.phantom_encryption_public_key),
      this.dappKeyPair.secretKey
    );

    // Decrypt the data using the shared secret
    const connectData = this.decryptPayload(
      response.data,
      response.nonce,
      sharedSecretDapp
    );

    // Store connection data
    this.sharedSecret = sharedSecretDapp;
    this.session = connectData.session;
    this.walletPublicKey = new PublicKey(connectData.public_key);

    return connectData;
  }

  // Handle disconnect response from Phantom
  handleDisconnectResponse(): void {
    this.sharedSecret = undefined;
    this.session = undefined;
    this.walletPublicKey = undefined;
  }

  // Get current wallet state
  getWalletState() {
    return {
      isConnected: !!this.walletPublicKey,
      publicKey: this.walletPublicKey,
      session: this.session,
      sharedSecret: this.sharedSecret,
    };
  }

  // Get wallet address as string
  getWalletAddress(): string | null {
    return this.walletPublicKey?.toString() || null;
  }

  // Encrypt payload for Phantom communication
  encryptPayload(payload: any, sharedSecret: Uint8Array): [Uint8Array, Uint8Array] {
    const nonce = nacl.randomBytes(24);
    const message = new TextEncoder().encode(JSON.stringify(payload));
    const encrypted = nacl.box.after(message, nonce, sharedSecret);
    return [nonce, encrypted];
  }

  // Sign transaction via Phantom deeplink (returns signed transaction for us to broadcast)
  async signTransaction(transaction: Transaction): Promise<void> {
    if (!this.walletPublicKey || !this.session || !this.sharedSecret) {
      throw new Error('Wallet not connected');
    }

    // Create redirect URL for transaction response
    const redirectLink = this.createRedirectUrl('onSignTransaction');
    
    // Set transaction properties
    transaction.feePayer = this.walletPublicKey;
    
    // Serialize transaction (without signatures since Phantom will sign it)
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
    });
    
    // Create payload with session and transaction data
    const payload = {
      session: this.session,
      transaction: bs58.encode(serializedTransaction),
    };
    
    // Encrypt the payload
    const [nonce, encryptedPayload] = this.encryptPayload(payload, this.sharedSecret);
    
    // Build URL parameters
    const params = new URLSearchParams({
      dapp_encryption_public_key: bs58.encode(this.dappKeyPair.publicKey),
      nonce: bs58.encode(nonce),
      redirect_link: redirectLink,
      payload: bs58.encode(encryptedPayload),
    });
    
    // Build and open Phantom URL
    const url = this.buildPhantomUrl('signTransaction', params);
    console.log('🔗 Opening Phantom URL:', url);
    console.log('🔗 Redirect link:', redirectLink);
    await Linking.openURL(url);
  }

  // Handle sign transaction response from Phantom
  handleSignTransactionResponse(response: PhantomResponse): PhantomSignData {
    if (!this.sharedSecret) {
      throw new Error('No shared secret available');
    }

    // Decrypt the response data
    const signData = this.decryptPayload(
      response.data,
      response.nonce,
      this.sharedSecret
    );

    return signData;
  }
}
