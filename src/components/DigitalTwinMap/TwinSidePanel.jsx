import { Shield } from 'lucide-react';

import { getCropMeta } from '../../data/appContent.js';
import { localize } from '../../utils/formatters.js';

export default function TwinSidePanel({
  open,
  zone,
  telemetry,
  mode,
  language,
  onClose,
  onIrrigate,
  onStop,
}) {
  if (!zone) return null;

  const crop = getCropMeta(zone.cropType);
  const cropLabel = localize(crop.name, language);
  const moisture = Math.round(telemetry.moisture_pct ?? zone.moisture ?? 0);
  const irrigating = telemetry.pump_status === 'on' || telemetry.irrigating || zone.pumpOn;
  const fertigating =
    telemetry.fertigation_status === 'active' || telemetry.fertigating || zone.fertigationOn;
  const n = telemetry.N ?? zone.nitrogen ?? 0;
  const p = telemetry.P ?? zone.phosphorus ?? 0;
  const k = telemetry.K ?? zone.potassium ?? 0;
  const ml = telemetry.ml_crop_data;
  const fertilityLabel = telemetry.ml_fertility?.label || 'Fertile';

  return (
    <aside
      className={`pointer-events-auto absolute right-3 top-3 z-[100] w-[calc(100vw-1.5rem)] max-h-[calc(100vh-1.5rem)] overflow-y-auto sm:w-[22rem] rounded-3xl border border-white/10 bg-[rgba(10,15,20,0.96)] shadow-2xl backdrop-blur-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:right-4 sm:top-4 ${
        open ? 'translate-x-0' : 'translate-x-[calc(100%+1.5rem)]'
      }`}
    >
      <div className="p-5 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-white">{zone.name}</h2>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-400">
              {cropLabel} • {localize({ hi: 'लाइव', mr: 'लाइव्ह', en: 'LIVE' }, language)} TELEMETRY
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/5 px-2.5 py-2 text-slate-400 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/[0.03] p-4 text-center">
            <span className="mb-1.5 block text-[9px] font-extrabold uppercase text-slate-500">
              {localize({ hi: 'नमी', mr: 'ओलावा', en: 'Moisture' }, language)}
            </span>
            <span className="text-2xl font-black" style={{ color: moisture < 30 ? '#f87171' : '#fff' }}>
              {moisture}%
            </span>
          </div>
          <div className="rounded-2xl bg-white/[0.03] p-4 text-center">
            <span className="mb-1.5 block text-[9px] font-extrabold uppercase text-slate-500">
              {localize({ hi: 'मिट्टी ML', mr: 'माती ML', en: 'ML Soil' }, language)}
            </span>
            <span className="text-sm font-black text-emerald-400">{fertilityLabel}</span>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-5">
          <p className="mb-3 text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
            {localize({ hi: 'फसल सुझाव', mr: 'पीक सूचना', en: 'ML Crop Suggestion' }, language)}
          </p>
          {ml ? (
            <div>
              <p className="text-lg font-black text-white">🌿 {ml.prediction}</p>
              <p className="mt-2 text-[10px] italic leading-relaxed text-slate-400">
                &ldquo;{ml.rationale}&rdquo;
              </p>
            </div>
          ) : (
            <p className="text-sm font-bold text-white">
              🌿 {cropLabel} — {localize(crop.subtitle, language)}
            </p>
          )}
        </div>

        <div className="mb-6">
          <div className="mb-2.5 flex justify-between text-[9px] font-extrabold uppercase text-slate-500">
            <span>{localize({ hi: 'NPK', mr: 'NPK', en: 'Nutrient Shard (NPK)' }, language)}</span>
            <span className="text-white">
              {Math.round(n)}-{Math.round(p)}-{Math.round(k)}
            </span>
          </div>
          <div className="flex h-1 gap-1 overflow-hidden rounded-sm bg-white/5">
            <div className="h-full bg-blue-500" style={{ width: `${Math.min(n / 1.5, 100)}%` }} />
            <div className="h-full bg-purple-500" style={{ width: `${Math.min(p / 0.8, 100)}%` }} />
            <div className="h-full bg-amber-500" style={{ width: `${Math.min(k / 2.5, 100)}%` }} />
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {irrigating && (
            <div className="mb-4 relative overflow-hidden rounded-2xl border border-cyan-500/50 bg-gradient-to-br from-slate-900 to-slate-800 p-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              {/* Glowing animated background blobs */}
              <div className="absolute -right-4 -top-4 h-16 w-16 animate-pulse rounded-full bg-cyan-500/30 blur-xl"></div>
              <div className="absolute -bottom-4 -left-4 h-16 w-16 animate-pulse rounded-full bg-blue-500/30 blur-xl" style={{ animationDelay: '1s' }}></div>
              
              <div className="relative z-10">
                {/* Header */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#22d3ee]"></span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
                      AI PREDICTION
                    </span>
                  </div>
                  <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono text-[9px] font-bold tracking-widest text-cyan-300 border border-cyan-500/30">
                    SIMULATING...
                  </span>
                </div>
                
                {/* Data Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-cyan-500/20 bg-black/40 p-3 shadow-inner">
                    <span className="block text-[8px] font-bold uppercase tracking-widest text-slate-400">Target Time</span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="font-mono text-xl font-black text-white drop-shadow-md">~12</span>
                      <span className="text-xs font-bold text-cyan-400">mins</span>
                    </div>
                    <span className="mt-1 block text-[9px] font-medium text-emerald-400">Optimal ({zone.threshold || 50}%)</span>
                  </div>
                  <div className="rounded-xl border border-cyan-500/20 bg-black/40 p-3 shadow-inner">
                    <span className="block text-[8px] font-bold uppercase tracking-widest text-slate-400">Est. Water</span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="font-mono text-xl font-black text-white drop-shadow-md">~15</span>
                      <span className="text-xs font-bold text-blue-400">Liters</span>
                    </div>
                    <span className="mt-1 block text-[9px] font-medium text-blue-300">Flow Profile Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {mode === 'act' ? (
            <>
              <button
                type="button"
                onClick={onIrrigate}
                className={`flex w-full items-center justify-center gap-2 rounded-[14px] px-4 py-4 text-[11px] font-black uppercase tracking-[0.15em] transition ${
                  irrigating
                    ? 'bg-blue-500/15 text-blue-300'
                    : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                }`}
              >
                💧{' '}
                {irrigating
                  ? localize({ hi: 'पंप चालू', mr: 'पंप सुरू', en: 'PUMP ACTIVE' }, language)
                  : localize({ hi: 'पानी दें', mr: 'पाणी सुरू', en: 'START WATERING' }, language)}
              </button>
              <button
                type="button"
                onClick={onStop}
                className={`w-full rounded-[14px] px-4 py-4 text-[11px] font-black uppercase tracking-[0.15em] ${
                  irrigating || fertigating
                    ? 'bg-red-500 text-white'
                    : 'bg-white/5 text-slate-500'
                }`}
              >
                🛑{' '}
                {localize({ hi: 'बंद करें', mr: 'थांबवा', en: 'STOP OPERATION' }, language)}
              </button>
            </>
          ) : (
            <div className="rounded-[14px] border border-white/5 bg-white/[0.03] px-4 py-4 text-center">
              <p className="flex items-center justify-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                <Shield size={10} />
                {localize(
                  {
                    hi: 'नियंत्रण के लिए ACT MODE चालू करें',
                    mr: 'नियंत्रणासाठी ACT MODE सुरू करा',
                    en: 'Switch to ACT MODE to control',
                  },
                  language
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
