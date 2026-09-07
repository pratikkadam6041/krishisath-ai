import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { hashPin, verifyPin, migrateLegacyPin, isLegacyPlainPin } from '../services/pinCrypto.js';
import {
  sendOtp as sendOtpService,
  verifyOtpCode,
  resendOtp as resendOtpService,
  isOtpConfigured,
} from '../services/otpService.js';
import {
  registerBiometric,
  authenticateBiometric,
  isWebAuthnSupported,
} from '../services/webAuthnService.js';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      phoneNumber: '',
      pendingPhoneNumber: '',
      otpSentAt: null,
      otpProvider: null,
      pinCredential: null,
      webAuthnCredentialId: null,
      fingerprintEnabled: false,
      isAuthenticated: false,
      onboardingStatus: 'pending',
      firstName: '',
      otpError: null,
      otpSending: false,

      startPhoneLogin: async (phoneNumber) => {
        const normalizedPhone = String(phoneNumber || '').replace(/\D/g, '').slice(-10);
        const allowLocalQuickAuth =
          import.meta.env.DEV ||
          ['localhost', '127.0.0.1'].includes(window.location.hostname);

        set({ otpSending: true, otpError: null, pendingPhoneNumber: normalizedPhone });

        if (allowLocalQuickAuth) {
          set((state) => ({
            phoneNumber: normalizedPhone,
            pendingPhoneNumber: '',
            otpSentAt: null,
            otpProvider: 'local-dev',
            otpSending: false,
            otpError: null,
            pinCredential: state.pinCredential || '1111',
            onboardingStatus: state.onboardingStatus === 'pending' ? 'complete' : state.onboardingStatus,
          }));
          return { ok: true, provider: 'local-dev', phone: normalizedPhone };
        }

        try {
          const result = await sendOtpService(normalizedPhone);
          set({
            pendingPhoneNumber: normalizedPhone,
            otpSentAt: Date.now(),
            otpProvider: result.provider,
            otpSending: false,
            otpError: null,
          });
          return { ok: true, ...result };
        } catch (err) {
          set({
            otpSending: false,
            otpError: err.message || 'OTP_SEND_FAILED',
          });
          return { ok: false, error: err.message };
        }
      },

      resendOtp: async () => {
        const phone = get().pendingPhoneNumber || get().phoneNumber;
        if (!phone) return { ok: false };
        set({ otpSending: true, otpError: null });
        try {
          const result = await resendOtpService(phone);
          set({ otpSentAt: Date.now(), otpSending: false });
          return { ok: true, ...result };
        } catch (err) {
          set({ otpSending: false, otpError: err.message });
          return { ok: false, error: err.message };
        }
      },

      verifyOtp: async (otp) => {
        const phone = get().pendingPhoneNumber || get().phoneNumber;
        const accepted = await verifyOtpCode(phone, otp);
        if (!accepted) return false;

        set({
          phoneNumber: phone,
          otpSentAt: null,
          otpError: null,
        });
        return true;
      },

      completePinSetup: async ({ pin, fingerprintEnabled = false, firstName = '' }) => {
        const pinCredential = await hashPin(pin);
        let webAuthnCredentialId = get().webAuthnCredentialId;

        if (fingerprintEnabled && isWebAuthnSupported()) {
          try {
            // Set a timeout for biometric registration to prevent hangs on some mobile devices
            const biometricPromise = registerBiometric(get().phoneNumber || 'farmer');
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('TIMEOUT')), 15000)
            );
            
            const cred = await Promise.race([biometricPromise, timeoutPromise]);
            webAuthnCredentialId = cred.credentialId;
          } catch (err) {
            console.warn('[Auth] WebAuthn registration failed or timed out', err);
          }
        }
        
        // Register user in local DB with PENDING status
        import('./userStore.js').then(module => {
           module.useUserStore.getState().registerUser(get().phoneNumber, firstName);
        });

        set((state) => ({
          pinCredential,
          fingerprintEnabled: Boolean(webAuthnCredentialId) && fingerprintEnabled,
          webAuthnCredentialId,
          isAuthenticated: true,
          firstName: firstName || state.firstName,
          onboardingStatus: state.onboardingStatus || 'pending',
        }));
      },

      loginWithPin: async (inputPin) => {
        const { pinCredential, pendingPhoneNumber, phoneNumber } = get();
        let credential = pinCredential;
        const allowLocalDemoPin =
          import.meta.env.DEV ||
          ['localhost', '127.0.0.1'].includes(window.location.hostname);

        if (allowLocalDemoPin && inputPin === '1111') {
          set((state) => ({
            isAuthenticated: true,
            phoneNumber: state.phoneNumber || pendingPhoneNumber || phoneNumber || '9876543210',
            pendingPhoneNumber: '',
            pinCredential: state.pinCredential || '1111',
            onboardingStatus: state.onboardingStatus === 'pending' ? 'complete' : state.onboardingStatus,
          }));
          return true;
        }

        if (isLegacyPlainPin(credential)) {
          const accepted = inputPin === credential;
          if (accepted) {
            const migrated = await migrateLegacyPin(credential);
            set({ pinCredential: migrated, isAuthenticated: true });
          }
          return accepted;
        }

        const accepted = await verifyPin(inputPin, credential);
        if (accepted) {
          set((state) => ({
            isAuthenticated: true,
            phoneNumber: state.phoneNumber || pendingPhoneNumber || phoneNumber,
            pendingPhoneNumber: '',
          }));
        }
        return accepted;
      },

      useFingerprint: async () => {
        const { fingerprintEnabled, webAuthnCredentialId } = get();
        if (!fingerprintEnabled || !webAuthnCredentialId) {
          return false;
        }
        const ok = await authenticateBiometric(webAuthnCredentialId);
        if (ok) {
          set({ isAuthenticated: true });
        }
        return ok;
      },

      resetPinAfterOtp: async (newPin) => {
        const pinCredential = await hashPin(newPin);
        set({
          pinCredential,
          isAuthenticated: true,
          otpSentAt: null,
        });
      },

      setFirstName: (firstName) => set({ firstName }),
      completeOnboarding: () => set({ onboardingStatus: 'complete' }),
      skipOnboarding: () => set({ onboardingStatus: 'skipped' }),
      reopenOnboarding: () => set({ onboardingStatus: 'pending' }),
      logout: () => set({ isAuthenticated: false }),
      switchAccount: () => set({ 
        isAuthenticated: false, 
        phoneNumber: '', 
        pendingPhoneNumber: '',
        pinCredential: null, 
        webAuthnCredentialId: null, 
        fingerprintEnabled: false, 
        firstName: '',
        otpSentAt: null,
      }),

      hasPin: () => Boolean(get().pinCredential),
    }),
    {
      name: 'ks-auth-store',
      partialize: (state) => ({
        phoneNumber: state.phoneNumber,
        pendingPhoneNumber: state.pendingPhoneNumber,
        pinCredential: state.pinCredential,
        webAuthnCredentialId: state.webAuthnCredentialId,
        fingerprintEnabled: state.fingerprintEnabled,
        onboardingStatus: state.onboardingStatus,
        firstName: state.firstName,
      }),
      migrate: (persisted) => {
        if (persisted?.pin && !persisted.pinCredential) {
          return { ...persisted, pinCredential: persisted.pin, pin: undefined };
        }
        return persisted;
      },
    }
  )
);

export { isOtpConfigured, isWebAuthnSupported };
