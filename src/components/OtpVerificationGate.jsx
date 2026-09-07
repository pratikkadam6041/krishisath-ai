import { useState } from 'react';
import { Loader2, ShieldCheck, X } from 'lucide-react';
import { sendOtp, verifyOtpCode } from '../services/otpService.js';
import { useAuthStore } from '../store/authStore.js';
import { localize } from '../utils/formatters.js';
import { useSettingsStore } from '../store/settingsStore.js';

export default function OtpVerificationGate({ onVerify, onCancel, title, description }) {
  const [step, setStep] = useState('initial'); // initial | sent | verifying | success
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState(null);
  const phoneNumber = useAuthStore((state) => state.phoneNumber);
  const language = useSettingsStore((state) => state.language);

  const handleSendOtp = async () => {
    setStep('sending');
    setError(null);
    try {
      await sendOtp(phoneNumber);
      setStep('sent');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
      setStep('initial');
    }
  };

  const handleVerify = async () => {
    setStep('verifying');
    setError(null);
    try {
      const isValid = await verifyOtpCode(phoneNumber, otpCode);
      if (isValid) {
        setStep('success');
        setTimeout(() => onVerify(), 1000);
      } else {
        setError('Invalid OTP code');
        setStep('sent');
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
      setStep('sent');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#1a3d1a]">
            <ShieldCheck size={24} />
            <h2 className="text-xl font-black">{title || 'Security Verification'}</h2>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <p className="mb-6 text-sm text-slate-600">
          {description || 'Please verify your identity to perform this action.'}
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {step === 'initial' || step === 'sending' ? (
          <button
            onClick={handleSendOtp}
            disabled={step === 'sending'}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1a3d1a] py-3.5 text-sm font-black text-white disabled:opacity-70"
          >
            {step === 'sending' ? <Loader2 size={18} className="animate-spin" /> : null}
            {step === 'sending' ? 'Sending OTP...' : `Send OTP to ${phoneNumber}`}
          </button>
        ) : step === 'success' ? (
          <div className="flex flex-col items-center py-4 text-emerald-600">
            <ShieldCheck size={48} />
            <p className="mt-2 font-black">Verified Successfully</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Enter OTP
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-black tracking-[0.5em] text-slate-800 outline-none focus:border-emerald-500"
              />
            </div>
            <button
              onClick={handleVerify}
              disabled={otpCode.length < 6 || step === 'verifying'}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1a3d1a] py-3.5 text-sm font-black text-white disabled:opacity-50"
            >
              {step === 'verifying' ? <Loader2 size={18} className="animate-spin" /> : 'Verify & Proceed'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
