import { Hammer, RefreshCw, ShieldAlert } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { localize } from '../utils/formatters';

export default function MaintenanceScreen() {
  const language = useSettingsStore((s) => s.language) || 'hi';

  const copy = {
    hi: {
      title: 'सिस्टम रखरखाव जारी है',
      subtitle: 'हम ऐप को और बेहतर और सुरक्षित बनाने के लिए काम कर रहे हैं। कृपया कुछ मिनट बाद दोबारा प्रयास करें।',
      badge: 'रखरखाव मोड',
      status: 'कृषि सारथी सर्वर अपडेट हो रहे हैं...',
    },
    mr: {
      title: 'सिस्टीम देखभाल सुरू आहे',
      subtitle: 'आम्ही अॅप अधिक चांगले आणि सुरक्षित करण्यासाठी काम करत आहोत. कृपया काही मिनिटांनंतर पुन्हा प्रयत्न करा.',
      badge: 'देखभाल मोड',
      status: 'कृषी सारथी सर्व्हर अपडेट होत आहेत...',
    },
    en: {
      title: 'System Under Maintenance',
      subtitle: 'We are performing scheduled improvements to make KrishiSarth faster and more secure. Please check back shortly.',
      badge: 'Maintenance Active',
      status: 'Updating KrishiSarth servers...',
    },
  }[language] || {
    title: 'System Under Maintenance',
    subtitle: 'We are performing scheduled improvements to make KrishiSarth faster and more secure. Please check back shortly.',
    badge: 'Maintenance Active',
    status: 'Updating KrishiSarth servers...',
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),rgba(240,246,238,0.96)_28%,rgba(233,242,230,1)_100%)] dark:bg-slate-950 p-6 text-center">
      <div className="mx-auto w-full max-w-md space-y-6">
        
        {/* Decorative Maintenance Widget */}
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] bg-amber-500/10 text-amber-500 ring-4 ring-amber-500/5 dark:bg-amber-500/20">
          <Hammer size={40} className="animate-bounce" />
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white animate-pulse">
            <ShieldAlert size={14} />
          </span>
        </div>

        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
          <RefreshCw size={12} className="animate-spin text-amber-500" />
          {copy.badge}
        </span>

        {/* Heading */}
        <h1 className="text-3xl font-black text-text-primary dark:text-white leading-tight">
          {copy.title}
        </h1>

        {/* Description */}
        <p className="text-base leading-relaxed text-text-secondary dark:text-slate-400">
          {copy.subtitle}
        </p>

        {/* Status indicator bar */}
        <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 text-left">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping shrink-0" />
            <p className="text-xs font-bold text-text-primary dark:text-slate-300">
              {copy.status}
            </p>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 animate-pulse" />
          </div>
        </div>

        <p className="text-xs text-text-muted dark:text-slate-500 pt-4">
          KrishiSarth 2.0 AI Ecosystem · Stable Channel
        </p>
      </div>
    </div>
  );
}
