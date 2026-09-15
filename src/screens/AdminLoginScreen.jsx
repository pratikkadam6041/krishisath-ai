import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';
import BrandLogo from '../components/BrandLogo.jsx';

import { loadFirebaseAuth } from '../services/otpService.js';

const ADMIN_EMAIL    = 'admin@krishisarth.com';
const ADMIN_PASSWORD = 'admin123';

export default function AdminLoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fb = await loadFirebaseAuth();
      if (fb && fb.signInWithEmailAndPassword) {
        await fb.signInWithEmailAndPassword(fb.auth, email.trim(), password);
        navigate('/admin-portal/dashboard');
        return;
      }
      
      // Fallback if no firebase config
      if (email.trim() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        navigate('/admin-portal/dashboard');
      } else {
        throw new Error('Invalid credentials.');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail(ADMIN_EMAIL);
    setPassword(ADMIN_PASSWORD);
    setError('');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#030712] p-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate('/settings')}
        className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
      >
        <ArrowLeft size={15} /> Back to Settings
      </button>

      <div className="w-full max-w-sm">
        {/* Logo + heading */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-900/40">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">KrishiSarth Admin</h1>
          <p className="mt-1 text-sm text-slate-400">Secure portal for authorised team only</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="admin@krishisarth.com"
                  autoComplete="email"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800 py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800 py-3.5 pl-11 pr-12 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-black text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign In to Admin Portal'}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-5 rounded-2xl border border-slate-700/60 bg-slate-800/50 p-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Admin access credentials</p>
            <p className="text-xs text-slate-400">Email: <span className="font-bold text-slate-200">admin@krishisarth.com</span></p>
            <p className="text-xs text-slate-400">Password: <span className="font-bold text-slate-200">admin123</span></p>
            <button
              type="button"
              onClick={fillDemo}
              className="mt-3 w-full rounded-xl bg-slate-700 py-2 text-xs font-bold text-slate-200 hover:bg-slate-600 transition-colors"
            >
              Auto-fill credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
