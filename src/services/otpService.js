/**
 * OTP delivery: Fast2SMS (free) → Firebase Phone Auth → backend API → demo (dev only)
 *
 * Free SMS setup (Fast2SMS):
 * 1. Register at https://www.fast2sms.com/
 * 2. Go to Dev API → copy your API key
 * 3. Add to .env:  VITE_FAST2SMS_API_KEY=your_key_here
 *
 * Fast2SMS free plan gives 200 free SMS credits on signup — no credit card needed.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
const ALLOW_DEMO = import.meta.env.VITE_ALLOW_DEMO_AUTH === 'true';
const FAST2SMS_KEY = import.meta.env.VITE_FAST2SMS_API_KEY;

let firebaseAuth = null;
let confirmationResult = null;

// In-memory OTP store for Fast2SMS (we generate & send, then verify locally)
const pendingOtps = new Map(); // phone → { otp, expiresAt }

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function loadFirebaseAuth() {
  if (firebaseAuth) return firebaseAuth;
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!apiKey || !authDomain || !projectId) return null;

  const { initializeApp } = await import('firebase/app');
  const { getAuth, RecaptchaVerifier, signInWithPhoneNumber, signInWithEmailAndPassword } = await import('firebase/auth');

  const app = initializeApp({
    apiKey,
    authDomain,
    projectId,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });
  const auth = getAuth(app);
  firebaseAuth = { auth, RecaptchaVerifier, signInWithPhoneNumber, signInWithEmailAndPassword };
  return firebaseAuth;
}

/**
 * Send OTP via Fast2SMS free API
 * Fast2SMS sends real SMS to Indian numbers at no cost for the first 200 SMSes.
 */
async function sendViaFast2SMS(phone10, otp) {
  // Fast2SMS requires server-side call (API key must not be exposed in production).
  // In dev, we call it directly. In production, proxy through your backend.
  const message = `Your KrishiSarth OTP is ${otp}. Valid for 5 minutes. Do not share with anyone. -KrishiSarth`;

  const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: {
      authorization: FAST2SMS_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      route: 'q', // quick transactional route
      message,
      language: 'english',
      flash: 0,
      numbers: phone10,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `FAST2SMS_FAILED_${response.status}`);
  }

  const json = await response.json();
  if (!json.return) {
    throw new Error(json.message || 'FAST2SMS_REJECTED');
  }

  return true;
}

export function isOtpConfigured() {
  return Boolean(
    API_BASE ||
    import.meta.env.VITE_FIREBASE_API_KEY ||
    FAST2SMS_KEY ||
    ALLOW_DEMO
  );
}

export async function sendOtp(phone10, { recaptchaContainerId = 'ks-recaptcha' } = {}) {
  const phone = phone10.replace(/\D/g, '').slice(-10);
  if (phone.length !== 10) {
    throw new Error('INVALID_PHONE');
  }
  const e164 = `+91${phone}`;

  // 1. Backend API (production)
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: e164 }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `OTP_SEND_FAILED_${res.status}`);
    }
    return { provider: 'api', phone };
  }

  // 2. Fast2SMS free SMS (add VITE_FAST2SMS_API_KEY to .env)
  if (FAST2SMS_KEY) {
    const otp = generateOtp();
    pendingOtps.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
    try {
      await sendViaFast2SMS(phone, otp);
      console.info(`[OTP] Sent via Fast2SMS to ${phone}`);
      return { provider: 'fast2sms', phone };
    } catch (err) {
      console.warn('[OTP] Fast2SMS failed, falling back:', err.message);
      // Fall through to next provider
    }
  }

  // 3. Firebase Phone Auth
  const fb = await loadFirebaseAuth();
  if (fb) {
    const container = document.getElementById(recaptchaContainerId);
    if (!container) {
      throw new Error('RECAPTCHA_CONTAINER_MISSING');
    }
    const verifier = new fb.RecaptchaVerifier(fb.auth, recaptchaContainerId, { size: 'invisible' });
    confirmationResult = await fb.signInWithPhoneNumber(fb.auth, e164, verifier);
    return { provider: 'firebase', phone };
  }

  // 4. Demo mode (VITE_ALLOW_DEMO_AUTH=true) — OTP is always 204681
  //    Use this for local development when no SMS provider is configured.
  if (ALLOW_DEMO) {
    const DEMO_OTP = '204681';
    pendingOtps.set(phone, { otp: DEMO_OTP, expiresAt: Date.now() + 10 * 60 * 1000 });
    console.info(
      `%c[KrishiSarth OTP] Demo mode — OTP for ${phone} is: ${DEMO_OTP}`,
      'background:#1a3d1a;color:#fff;padding:4px 10px;border-radius:4px;font-weight:bold;font-size:14px'
    );
    return { provider: 'demo', phone };
  }

  throw new Error('OTP_NOT_CONFIGURED');
}

export async function verifyOtpCode(phone10, code) {
  const phone = phone10.replace(/\D/g, '').slice(-10);

  // Backend API
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: `+91${phone}`, code }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    return Boolean(json.verified ?? json.success);
  }

  // Fast2SMS or Demo — check local pendingOtps map
  const pending = pendingOtps.get(phone);
  if (pending && Date.now() < pending.expiresAt && pending.otp === code) {
    pendingOtps.delete(phone);
    return true;
  }

  // Firebase verify
  if (confirmationResult) {
    try {
      await confirmationResult.confirm(code);
      confirmationResult = null;
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export async function resendOtp(phone10, options) {
  const phone = phone10.replace(/\D/g, '').slice(-10);
  pendingOtps.delete(phone); // Clear old OTP
  confirmationResult = null;
  return sendOtp(phone10, options);
}
