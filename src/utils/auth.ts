import CryptoJS from 'crypto-js';
import { JWTPayload } from '../database';

const SECRET_KEY = 'nexus-app-secret-key-2024';
const JWT_SECRET = 'nexus-pos-secure-key-2025'; // Should be from environment variables in production

// Modern PBKDF2 password hashing (using Web Crypto API)
// Note: Will be upgraded to Argon2 via Tauri backend in future
export const hashPassword = async (password: string): Promise<string> => {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const key = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const hashArray = new Uint8Array(key);
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  const saltBase64 = btoa(String.fromCharCode(...salt));

  return `pbkdf2:${saltBase64}:${hashBase64}`;
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    if (!hashedPassword.startsWith('pbkdf2:')) {
      // Legacy SHA256 verification for migration
      return verifyPasswordLegacy(password, hashedPassword);
    }

    const parts = hashedPassword.split(':');
    if (parts.length !== 3) return false;

    const salt = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
    const expectedHash = atob(parts[2]);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const key = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const hashArray = new Uint8Array(key);
    const hashBase64 = btoa(String.fromCharCode(...hashArray));

    return hashBase64 === expectedHash;
  } catch (error) {
    return false;
  }
};

// Legacy password hashing (keeping for backward compatibility during migration)
export const hashPasswordLegacy = (password: string): string => {
  return CryptoJS.SHA256(password + SECRET_KEY).toString();
};

export const verifyPasswordLegacy = (password: string, hashedPassword: string): boolean => {
  const hashed = hashPasswordLegacy(password);
  return hashed === hashedPassword;
};

// PIN hashing for POS operations (4-6 digits)
export const hashPin = async (pin: string): Promise<string> => {
  const salt = new Uint8Array(8); // Smaller salt for PIN
  crypto.getRandomValues(salt);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const key = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 50000, // Fewer iterations for faster PIN verification
      hash: 'SHA-256'
    },
    keyMaterial,
    128 // 16 bytes for PIN hash
  );

  const hashArray = new Uint8Array(key);
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  const saltBase64 = btoa(String.fromCharCode(...salt));

  return `pin:${saltBase64}:${hashBase64}`;
};

export const verifyPin = async (pin: string, hashedPin: string): Promise<boolean> => {
  try {
    if (!hashedPin.startsWith('pin:')) return false;

    const parts = hashedPin.split(':');
    if (parts.length !== 3) return false;

    const salt = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
    const expectedHash = atob(parts[2]);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pin),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const key = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 50000,
        hash: 'SHA-256'
      },
      keyMaterial,
      128
    );

    const hashArray = new Uint8Array(key);
    const hashBase64 = btoa(String.fromCharCode(...hashArray));

    return hashBase64 === expectedHash;
  } catch (error) {
    return false;
  }
};

export const generateToken = (): string => {
  return CryptoJS.lib.WordArray.random(32).toString();
};

// JWT Utilities
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createJWT(payload: JWTPayload): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = await hmacSha256(message, JWT_SECRET);

  return `${message}.${base64UrlEncode(signature)}`;
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const message = `${encodedHeader}.${encodedPayload}`;

    // Verify signature
    const expectedSignature = await hmacSha256(message, JWT_SECRET);
    const providedSignature = base64UrlDecode(encodedSignature);

    if (expectedSignature !== providedSignature) return null;

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) return null;

    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export function getDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('fingerprint', 10, 10);

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
    !!window.indexedDB,
    canvas.toDataURL()
  ].join('|');

  return btoa(fingerprint).slice(0, 32);
}

export function generateDeviceId(): string {
  return crypto.randomUUID();
}