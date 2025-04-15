import { Injectable } from '@angular/core';

export type Algorithm = 'AES-GCM' | 'RSA-OAEP' | 'ECDH';

type KeyFormat = 'raw' | 'pkcs8' | 'spki' | 'jwk';

interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

@Injectable({
  providedIn: 'root',
})
export class CryptoService {
  constructor() {}

  /**
   * Generates a key or key pair based on the algorithm
   */
  async generateKey(algorithm: Algorithm): Promise<CryptoKey | KeyPair> {
    switch (algorithm) {
      case 'AES-GCM':
        return this.generateAesKey();
      case 'RSA-OAEP':
        return this.generateRsaKeyPair();
      case 'ECDH':
        return this.generateEcdhKeyPair();
      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
  }

  /**
   * Generates an AES key for encryption
   */
  async generateAesKey(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generates an RSA key pair for encryption
   */
  async generateRsaKeyPair(): Promise<KeyPair> {
    return window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-512',
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generates an ECDH key pair for encryption
   */
  async generateEcdhKeyPair(): Promise<KeyPair> {
    return window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-384',
      },
      true,
      ['deriveKey', 'deriveBits']
    );
  }

  /**
   * Encrypts data using the specified algorithm
   */
  async encryptData(
    data: string | ArrayBuffer,
    key: CryptoKey,
    algorithm: Algorithm
  ): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    const dataBuffer =
      typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const iv = window.crypto.getRandomValues(new Uint8Array(16));

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: algorithm,
        iv,
      },
      key,
      dataBuffer
    );

    return { encrypted, iv };
  }

  /**
   * Decrypts data using the specified algorithm
   */
  async decryptData(
    encryptedData: ArrayBuffer,
    key: CryptoKey,
    iv: Uint8Array,
    algorithm: Algorithm
  ): Promise<ArrayBuffer> {
    return window.crypto.subtle.decrypt(
      {
        name: algorithm,
        iv,
      },
      key,
      encryptedData
    );
  }

  /**
   * Exports a key in the specified format
   */
  async exportKey(
    key: CryptoKey,
    format: 'raw' | 'pkcs8' | 'spki'
  ): Promise<ArrayBuffer>;
  async exportKey(key: CryptoKey, format: 'jwk'): Promise<JsonWebKey>;
  async exportKey(
    key: CryptoKey,
    format: KeyFormat
  ): Promise<ArrayBuffer | JsonWebKey> {
    return window.crypto.subtle.exportKey(format, key);
  }

  /**
   * Imports a key in the specified format
   */
  async importKey(
    format: KeyFormat,
    keyData: ArrayBuffer | JsonWebKey,
    algorithm: Algorithm,
    extractable: boolean,
    keyUsages: KeyUsage[]
  ): Promise<CryptoKey> {
    if (format === 'jwk' && !(keyData instanceof ArrayBuffer)) {
      return window.crypto.subtle.importKey(
        format,
        keyData as JsonWebKey,
        { name: algorithm },
        extractable,
        keyUsages
      );
    } else if (format !== 'jwk' && keyData instanceof ArrayBuffer) {
      return window.crypto.subtle.importKey(
        format,
        keyData,
        { name: algorithm },
        extractable,
        keyUsages
      );
    }
    throw new Error('Invalid key format or data type combination');
  }
}
