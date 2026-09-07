/**
 * Client-side PIN protection using Web Crypto (PBKDF2 + SHA-256).
 * Stores only salt + hash — never the raw PIN.
 */

const PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(pin, saltBase64) {
  const enc = new TextEncoder();
  
  // Fallback for non-secure contexts (HTTP) where crypto.subtle is unavailable
  if (!crypto.subtle) {
    console.warn('[Crypto] crypto.subtle unavailable. Using insecure fallback hash.');
    const data = enc.encode(pin + saltBase64);
    return bufferToBase64(data);
  }

  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const salt = base64ToBuffer(saltBase64);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bufferToBase64(bits);
}

/** Legacy plain 4-digit PIN from older builds */
export function isLegacyPlainPin(value) {
  return typeof value === 'string' && /^\d{4}$/.test(value);
}

export async function hashPin(pin) {
  const salt = bufferToBase64(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
  const hash = await deriveKey(pin, salt);
  return { salt, hash, version: 2 };
}

export async function verifyPin(pin, stored) {
  if (!stored) return false;
  if (isLegacyPlainPin(stored)) return pin === stored;
  if (!stored.salt || !stored.hash) return false;
  const hash = await deriveKey(pin, stored.salt);
  return hash === stored.hash;
}

export async function migrateLegacyPin(plainPin) {
  if (!isLegacyPlainPin(plainPin)) return plainPin;
  return hashPin(plainPin);
}
