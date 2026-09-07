/**
 * WebAuthn (fingerprint / device biometric) for KrishiSarth login.
 */

const RP_NAME = 'KrishiSarth';
const RP_ID = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

function toBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  bytes.forEach((b) => {
    str += String.fromCharCode(b);
  });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(base64url) {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) {
    view[i] = raw.charCodeAt(i);
  }
  return buffer;
}

export function isWebAuthnSupported() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.PublicKeyCredential) &&
    Boolean(navigator.credentials?.create)
  );
}

export async function registerBiometric(userId) {
  if (!isWebAuthnSupported()) {
    throw new Error('WEBAUTHN_UNSUPPORTED');
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userIdBytes = new TextEncoder().encode(userId);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: RP_NAME, id: RP_ID === 'localhost' ? 'localhost' : RP_ID },
      user: {
        id: userIdBytes,
        name: userId,
        displayName: 'KrishiSarth Farmer',
      },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  });

  return {
    credentialId: toBase64Url(credential.rawId),
    registeredAt: Date.now(),
  };
}

export async function authenticateBiometric(credentialIdBase64) {
  if (!isWebAuthnSupported() || !credentialIdBase64) {
    return false;
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: RP_ID === 'localhost' ? 'localhost' : RP_ID,
        allowCredentials: [
          {
            id: fromBase64Url(credentialIdBase64),
            type: 'public-key',
            transports: ['internal', 'hybrid'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return Boolean(assertion);
  } catch {
    return false;
  }
}
