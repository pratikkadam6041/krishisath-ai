import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Leaf, ShieldCheck, X } from 'lucide-react';
import BrandLogo from '../components/BrandLogo.jsx';
import { useSettingsStore } from '../store/settingsStore.js';
import { useAuthStore, isOtpConfigured } from '../store/authStore.js';
import { isWebAuthnSupported } from '../services/webAuthnService.js';
import { APP_VERSION, LANGUAGE_OPTIONS } from '../data/appContent.js';
import { formatClock, formatDateLong, maskPhone, localize } from '../utils/formatters.js';

const AUTH_COPY = {
  hi: {
    selectLanguage: 'अपनी भाषा चुनें',
    enterPhone: 'अपना नंबर दर्ज करें',
    otpSend: 'OTP भेजें',
    otpHint: 'आपका नंबर किसी के साथ साझा नहीं किया जाएगा',
    otpTitle: 'OTP सत्यापित करें',
    otpAuto: 'SMS OTP अपने आप भर जाएगा',
    resend: 'फिर से भेजें',
    viaCall: 'कॉल से OTP',
    viaWhatsapp: 'WhatsApp OTP',
    createPin: 'एक 4 अंकों का PIN बनाएं',
    createPinSub: 'हर बार आसान लॉगिन के लिए',
    confirmPin: 'PIN दोबारा दर्ज करें',
    fingerprint: 'या फिंगरप्रिंट से खोलें',
    hello: 'नमस्ते',
    forgotPin: 'PIN भूल गए?',
    wrongPin: 'PIN सही नहीं है',
    resetPin: 'OTP से PIN रीसेट करें',
    continue: 'जारी रखें',
    verify: 'सत्यापित हो रहा है...',
    demoOtp: 'डेमो OTP: 204681',
    loginReady: 'तेज़ और सुरक्षित लॉगिन',
  },
  mr: {
    selectLanguage: 'तुमची भाषा निवडा',
    enterPhone: 'तुमचा नंबर टाका',
    otpSend: 'OTP पाठवा',
    otpHint: 'तुमचा नंबर कोणाशीही शेअर केला जाणार नाही',
    otpTitle: 'OTP पडताळा',
    otpAuto: 'SMS OTP आपोआप भरेल',
    resend: 'पुन्हा पाठवा',
    viaCall: 'कॉलने OTP',
    viaWhatsapp: 'WhatsApp OTP',
    createPin: '4 अंकी PIN तयार करा',
    createPinSub: 'प्रत्येक वेळी सोपा लॉगिन',
    confirmPin: 'PIN पुन्हा टाका',
    fingerprint: 'किंवा फिंगरप्रिंट वापरा',
    hello: 'नमस्कार',
    forgotPin: 'PIN विसरलात?',
    wrongPin: 'PIN चुकीचा आहे',
    resetPin: 'OTP ने PIN रीसेट करा',
    continue: 'पुढे जा',
    verify: 'पडताळणी सुरू...',
    demoOtp: 'डेमो OTP: 204681',
    loginReady: 'जलद आणि सुरक्षित लॉगिन',
  },
  en: {
    selectLanguage: 'Choose your language',
    enterPhone: 'Enter your phone number',
    otpSend: 'Send OTP',
    otpHint: 'Your number will not be shared with anyone.',
    otpTitle: 'Verify OTP',
    otpAuto: 'SMS OTP will auto-fill',
    resend: 'Resend',
    viaCall: 'Call OTP',
    viaWhatsapp: 'WhatsApp OTP',
    createPin: 'Create a 4-digit PIN',
    createPinSub: 'For easy login every time',
    confirmPin: 'Confirm your PIN',
    fingerprint: 'Or unlock with fingerprint',
    hello: 'Hello',
    forgotPin: 'Forgot PIN?',
    wrongPin: 'That PIN does not match',
    resetPin: 'Reset PIN with OTP',
    continue: 'Continue',
    verify: 'Verifying...',
    demoOtp: 'Local access code: 204681',
    loginReady: 'Fast and secure sign in',
  },
};

function Keypad({ onPress, onBackspace }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <div className="grid grid-cols-3 gap-3">
      {keys.map((key, index) => {
        if (!key) {
          return <div key={`blank-${index}`} className="h-[72px]" />;
        }

        const isBackspace = key === '⌫';

        return (
          <button
            key={key}
            type="button"
            onClick={() => (isBackspace ? onBackspace() : onPress(key))}
            className="flex h-[72px] items-center justify-center rounded-[24px] border border-white/10 bg-white/8 text-2xl font-black text-white backdrop-blur-sm transition active:scale-95"
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}

function CodeDots({ value = '', length = 4 }) {
  return (
    <div className="flex items-center justify-center gap-4">
      {Array.from({ length }).map((_, index) => (
        <div
          key={index}
          className={`h-4 w-4 rounded-full border-2 transition ${
            value[index] ? 'border-white bg-white' : 'border-white/40 bg-transparent'
          }`}
        />
      ))}
    </div>
  );
}

export function SplashScreen({ language = 'hi' }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#133816] text-white">
      <div className="absolute inset-x-0 bottom-0 h-52 bg-[radial-gradient(circle_at_bottom,rgba(163,230,53,0.34),transparent_55%)]" />
      <div className="absolute bottom-8 left-0 right-0 flex items-end justify-center gap-2 opacity-70">
        {[24, 40, 64, 52, 28].map((height, index) => (
          <div
            key={height}
            className="w-3 rounded-full bg-gradient-to-t from-lime-300/50 to-transparent"
            style={{
              height,
              animation: `growUp 1.5s ease ${index * 0.08}s both`,
            }}
          />
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center">
        <BrandLogo size={112} className="mb-5" rounded="rounded-[34px]" imageClassName="ring-1 ring-white/10" />
        <h1 className="text-4xl font-black tracking-tight text-white">KrishiSarth</h1>
        <p className="mt-3 text-center text-base font-semibold text-lime-100">
          {language === 'mr'
            ? 'शेतीचा स्मार्ट साथी'
            : language === 'en'
            ? 'Smart farming companion'
            : 'खेती का स्मार्ट साथी'}
        </p>
        <p className="mt-28 text-xs font-bold uppercase tracking-[0.18em] text-lime-100/80">
          {language === 'mr'
            ? 'सिस्टम सुरू होत आहे'
            : language === 'en'
            ? 'Starting field system'
            : 'सिस्टम शुरू हो रही है'}
        </p>
      </div>
      <p className="absolute bottom-5 text-xs text-white/55">v{APP_VERSION}</p>
    </div>
  );
}

export default function AuthFlowScreen() {
  const navigate = useNavigate();
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const {
    phoneNumber,
    pendingPhoneNumber,
    otpSentAt,
    pinCredential,
    fingerprintEnabled,
    firstName,
    isAuthenticated,
    otpSending,
    otpError,
    startPhoneLogin,
    resendOtp,
    verifyOtp,
    completePinSetup,
    loginWithPin,
    useFingerprint: triggerFingerprint,
    resetPinAfterOtp,
  } = useAuthStore();

  const copy = AUTH_COPY[language] || AUTH_COPY.hi;
  const [phoneInput, setPhoneInput] = useState(phoneNumber);
  const [otpValue, setOtpValue] = useState('');
  const [pinDraft, setPinDraft] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [loginDraft, setLoginDraft] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [pinError, setPinError] = useState('');
  const [forgotPinMode, setForgotPinMode] = useState(false);
  const [enableFingerprint, setEnableFingerprint] = useState(fingerprintEnabled);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isPinVerifying, setIsPinVerifying] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const fingerprintSupported = isWebAuthnSupported();
  const allowDemoOtp = import.meta.env.VITE_ALLOW_DEMO_AUTH === 'true';

  const currentStep = useMemo(() => {
    if (!language) return 'language';
    if (!phoneNumber && !pendingPhoneNumber) return 'phone';
    if (pendingPhoneNumber && (!phoneNumber || forgotPinMode) && otpSentAt) return 'otp';
    if (!pinCredential || forgotPinMode) return 'pin-setup';
    if (!isAuthenticated) return 'pin-login';
    return 'done';
  }, [forgotPinMode, isAuthenticated, language, pendingPhoneNumber, phoneNumber, pinCredential, otpSentAt]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentStep !== 'otp' || !otpSentAt) {
      return undefined;
    }

    setCountdown(30);
    const timer = window.setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentStep, otpSentAt]);

  useEffect(() => {
    if (currentStep !== 'otp') {
      setOtpValue('');
    }
  }, [currentStep]);

  useEffect(() => {
    if (otpValue.length !== 6 || currentStep !== 'otp') {
      return;
    }

    verifyOtp(otpValue).then((verified) => {
      if (!verified) {
        setOtpValue('');
        setPinError(
          localize(
            { hi: 'गलत OTP', mr: 'चुकीचा OTP', en: 'Invalid OTP' },
            language
          )
        );
      } else {
        setPinError('');
        if (!forgotPinMode) setPinDraft('');
      }
    });
  }, [currentStep, forgotPinMode, language, otpValue, verifyOtp]);

  useEffect(() => {
    if (pinDraft.length === 4 && pinConfirm.length === 4 && currentStep === 'pin-setup') {
      if (pinDraft !== pinConfirm) {
        setPinError(copy.wrongPin);
        setPinConfirm('');
        return;
      }

      if (forgotPinMode) {
        resetPinAfterOtp(pinDraft).then(() => {
          setForgotPinMode(false);
          setLoginDraft('');
        });
        return;
      }

      setIsRegistering(true);
      setPinError('');
      completePinSetup({
        pin: pinDraft,
        fingerprintEnabled: enableFingerprint,
        firstName,
      }).catch((err) => {
        setPinError(err.message || 'Registration failed');
      }).finally(() => {
        setIsRegistering(false);
      });
    }
  }, [
    completePinSetup,
    copy.wrongPin,
    currentStep,
    enableFingerprint,
    firstName,
    forgotPinMode,
    pinConfirm,
    pinDraft,
    resetPinAfterOtp,
  ]);

  useEffect(() => {
    if (loginDraft.length !== 4 || currentStep !== 'pin-login') {
      return;
    }

    setIsPinVerifying(true);
    loginWithPin(loginDraft).then((accepted) => {
      if (!accepted) {
        setPinError(copy.wrongPin);
        window.setTimeout(() => setLoginDraft(''), 350);
        return;
      }
      setPinError('');
    }).catch(err => {
      console.error('[AuthFlow] loginWithPin threw an error:', err);
      setPinError('Internal authentication error. Try again.');
      window.setTimeout(() => setLoginDraft(''), 1000);
    }).finally(() => {
      setIsPinVerifying(false);
    });
  }, [copy.wrongPin, currentStep, loginDraft, loginWithPin]);

  const headerGradient =
    currentStep === 'pin-login' || currentStep === 'pin-setup'
      ? 'bg-[#1a3d1a]'
      : 'bg-[linear-gradient(180deg,#ffffff_0%,#f4f8f3_100%)]';

  const handleLanguagePick = (nextLanguage) => {
    setLanguage(nextLanguage);
  };

  const handleOtpSend = async () => {
    if (phoneInput.length === 10) {
      await startPhoneLogin(phoneInput);
    }
  };

  const handlePinEntry = (value) => {
    if (currentStep === 'pin-login') {
      if (pinError) setPinError('');
      if (!isPinVerifying && loginDraft.length < 4) {
        setLoginDraft((prev) => `${prev}${value}`);
      }
      return;
    }

    if (pinDraft.length < 4) {
      setPinDraft((prev) => `${prev}${value}`);
      return;
    }

    if (pinConfirm.length < 4) {
      setPinConfirm((prev) => `${prev}${value}`);
    }
  };

  const handlePinBackspace = () => {
    if (currentStep === 'pin-login') {
      setLoginDraft((prev) => prev.slice(0, -1));
      return;
    }

    if (pinConfirm.length > 0) {
      setPinConfirm((prev) => prev.slice(0, -1));
      return;
    }

    setPinDraft((prev) => prev.slice(0, -1));
  };

  if (currentStep === 'language') {
    return (
      <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-white px-6 py-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(26,61,26,0.05),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.1),transparent_28%)]" />
        <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="mb-8 text-center">
            <BrandLogo size={72} className="mx-auto mb-4" />
            <h1 className="text-3xl font-black text-text-primary">{copy.selectLanguage}</h1>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => handleLanguagePick(option.code)}
                className="rounded-[28px] border border-border bg-white p-5 text-left shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf7ee] text-[#1a3d1a]">
                  <Leaf size={20} />
                </div>
                <h2 className="text-2xl font-black text-text-primary">{option.native}</h2>
                <p className="mt-2 text-sm text-text-secondary">{option.samples.join(' · ')}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'phone') {
    return (
      <div className={`flex min-h-[100dvh] flex-col ${headerGradient}`}>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-10 pb-8">
          <div className="mb-10 flex items-center gap-3">
            <BrandLogo size={52} rounded="rounded-[18px]" shadow={false} imageClassName="ring-1 ring-[#dfe8db]" />
            <div>
              <h1 className="text-lg font-black text-text-primary">KrishiSarth</h1>
              <p className="text-sm text-text-secondary">{copy.loginReady}</p>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-[32px] font-black leading-tight text-text-primary">{copy.enterPhone}</h2>
            <div className="mt-5 inline-flex rounded-full border border-border bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => setLanguage(option.code)}
                  className={`rounded-full px-3 py-2 text-xs font-black ${
                    language === option.code ? 'bg-[#1a3d1a] text-white' : 'text-text-secondary'
                  }`}
                >
                  {option.native}
                </button>
              ))}
            </div>
            <div className="mt-10 rounded-[28px] border border-border bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
              <label className="mb-3 block text-sm font-bold text-text-secondary">{copy.enterPhone}</label>
              <div className="flex items-center gap-3 rounded-2xl bg-[#f5f8f4] px-4 py-4">
                <div className="rounded-full bg-white px-3 py-2 text-sm font-black shadow-sm">IN +91</div>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phoneInput}
                  onChange={(event) => setPhoneInput(event.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full bg-transparent text-[24px] font-black tracking-[0.16em] text-text-primary outline-none"
                  placeholder="98XXXXXXXX"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleOtpSend}
              disabled={phoneInput.length !== 10 || otpSending}
              className="h-14 w-full rounded-2xl bg-[#1a3d1a] text-base font-black text-white shadow-lg transition disabled:bg-[#98ab97] disabled:text-white/90"
            >
              {copy.otpSend}
            </button>
            <p className="text-center text-sm text-text-secondary">{copy.otpHint}</p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'otp') {
    return (
      <div className={`flex min-h-[100dvh] flex-col ${headerGradient}`}>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-12 pb-8">
          <div className="mb-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setOtpValue('');
                setForgotPinMode(false);
              }}
              className="rounded-full border border-border bg-white p-2 text-text-secondary"
            >
              <X size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-text-primary">{copy.otpTitle}</h1>
              <p className="text-sm text-text-secondary">{maskPhone(pendingPhoneNumber || phoneNumber)}</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-border bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="mb-5 grid grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <input
                  key={index}
                  value={otpValue[index] || ''}
                  onChange={(event) => {
                    const next = `${otpValue.slice(0, index)}${event.target.value.replace(/\D/g, '').slice(-1)}${otpValue.slice(index + 1)}`;
                    setOtpValue(next.slice(0, 6));
                  }}
                  className="h-14 rounded-2xl border border-border bg-[#f8faf7] text-center text-2xl font-black text-text-primary outline-none"
                  inputMode="numeric"
                  maxLength={1}
                />
              ))}
            </div>
            <p className="text-sm text-text-secondary">{copy.otpAuto}</p>
            {allowDemoOtp && (
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <span className="text-lg">🔑</span>
                <div>
                  <p className="text-xs font-black text-amber-800 uppercase tracking-wider">Local access</p>
                  <p className="text-sm font-bold text-amber-700">Enter OTP: <span className="font-black tracking-widest">204681</span></p>
                </div>
              </div>
            )}
            {otpError ? <p className="mt-2 text-sm font-semibold text-red-600">{otpError}</p> : null}
            <div id="ks-recaptcha" className="sr-only" aria-hidden="true" />
            <div className="mt-6 flex items-center justify-between text-sm">
              <span className="text-text-secondary">
                {countdown > 0 ? `${countdown}s` : copy.resend}
              </span>
              {countdown === 0 ? (
                <button type="button" onClick={resendOtp} className="font-black text-[#1a3d1a]">
                  {copy.resend}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-bold text-text-primary">
              {copy.viaCall}
            </button>
            <button type="button" className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
              {copy.viaWhatsapp}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'pin-setup') {
    return (
      <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#1a3d1a] text-white">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-[radial-gradient(circle_at_bottom,rgba(163,230,53,0.18),transparent_58%)]" />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-12 pb-8">
          <div className="mb-10">
            <h1 className="text-3xl font-black">{copy.createPin}</h1>
            <p className="mt-2 text-base text-white/75">{copy.createPinSub}</p>
          </div>

          <div className="mb-5 rounded-[28px] border border-white/10 bg-white/6 p-6 backdrop-blur">
            <div className="space-y-5">
              <div>
                <p className="mb-3 text-sm font-semibold text-white/70">{copy.createPin}</p>
                <CodeDots value={pinDraft} />
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold text-white/70">{copy.confirmPin}</p>
                <CodeDots value={pinConfirm} />
              </div>
            </div>
            {pinError ? <p className="mt-4 text-sm font-semibold text-red-200">{pinError}</p> : null}
            {isRegistering && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <p className="text-sm font-bold text-white/90">{copy.verify}</p>
              </div>
            )}
          </div>

          <div className="mb-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/8 px-4 py-4">
            <div>
              <p className="font-bold">{copy.fingerprint}</p>
              <p className="text-sm text-white/65">
                {fingerprintSupported
                  ? localize({ hi: 'यदि फोन सपोर्ट करता है', mr: 'फोन सपोर्ट करत असल्यास', en: 'If your device supports it' }, language)
                  : localize(
                      {
                        hi: 'इस डिवाइस पर फिंगरप्रिंट उपलब्ध नहीं है',
                        mr: 'या डिव्हाइसवर फिंगरप्रिंट उपलब्ध नाही',
                        en: 'Fingerprint is not available on this device',
                      },
                      language
                    )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => fingerprintSupported && setEnableFingerprint((value) => !value)}
              disabled={!fingerprintSupported}
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${
                enableFingerprint && fingerprintSupported
                  ? 'border-white bg-white text-[#1a3d1a]'
                  : 'border-white/20 bg-transparent text-white'
              }`}
            >
              <Fingerprint size={18} />
            </button>
          </div>

          <div className="mt-auto">
            <Keypad onPress={handlePinEntry} onBackspace={handlePinBackspace} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#1a3d1a] text-white">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-[radial-gradient(circle_at_bottom,rgba(163,230,53,0.22),transparent_60%)]" />
      <button
        type="button"
        onClick={() => navigate('/admin-portal')}
        className="absolute top-4 right-4 h-10 w-10 opacity-0 active:opacity-100 focus:opacity-100"
        aria-label="Admin Portal"
      />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-12 pb-8">
        <div className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white/70">{formatClock(clock, language)}</p>
              <p className="text-sm text-white/55">{formatDateLong(clock, language)}</p>
            </div>
            <BrandLogo size={48} rounded="rounded-[16px]" shadow={false} imageClassName="ring-1 ring-white/10" />
          </div>
          <h1 className="text-3xl font-black">
            {copy.hello}, {firstName || 'Kisan'}
          </h1>
        </div>

        <div className="mb-6 rounded-[28px] border border-white/10 bg-white/6 p-6 backdrop-blur">
          <CodeDots value={loginDraft} />
          {pinError ? <p className="mt-4 text-center text-sm font-semibold text-red-200">{pinError}</p> : null}
          {isPinVerifying ? (
            <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl bg-white/10 p-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <p className="text-sm font-bold text-white/90">{copy.verify}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-auto">
          <Keypad onPress={handlePinEntry} onBackspace={handlePinBackspace} />
        </div>

        <div className="mt-6 flex items-center justify-center">
          <button
            type="button"
            onClick={() => triggerFingerprint().catch(() => setPinError(copy.wrongPin))}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-lg"
          >
            <ShieldCheck size={22} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setForgotPinMode(true);
            resendOtp();
          }}
          className="mt-5 text-center text-sm font-semibold text-white/70 underline underline-offset-4"
        >
          {copy.forgotPin}
        </button>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <button
            type="button"
            onClick={() => navigate('/admin-portal')}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-black text-white/50 backdrop-blur transition hover:bg-white/12 hover:text-white/80"
          >
            <ShieldCheck size={12} />
            Admin Login
          </button>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </div>
    </div>
  );
}
