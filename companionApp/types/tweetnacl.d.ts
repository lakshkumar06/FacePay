declare module 'tweetnacl' {
  export interface BoxKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }

  export const box: {
    keyPair(): BoxKeyPair;
    before(publicKey: Uint8Array, secretKey: Uint8Array): Uint8Array;
    open: {
      after(data: Uint8Array, nonce: Uint8Array, sharedSecret: Uint8Array): Uint8Array | null;
    };
  };

  export function setPRNG(prng: (size: number) => Uint8Array): void;
}
