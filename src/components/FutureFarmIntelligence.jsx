import { useMemo, useState } from 'react';
import { BatteryCharging, Camera, ChevronRight, ShieldAlert, SunMedium, Waves, Zap } from 'lucide-react';

import { localize } from '../utils/formatters.js';

function StatusPill({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-100 text-amber-800',
    emerald: 'bg-emerald-100 text-emerald-800',
  };
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${tones[tone]}`}>{children}</span>;
}

/**
 * Front-end-only future-scope cards. They intentionally do not publish MQTT
 * commands or raise real safety alerts until a verified field sensor exists.
 */
export default function FutureFarmIntelligence({ language, onOpenSatellite }) {
  const [wildlifeCheckRunning, setWildlifeCheckRunning] = useState(false);
  const [wildlifeDemoAlert, setWildlifeDemoAlert] = useState(false);
  const [solarMode, setSolarMode] = useState('day');

  const solar = useMemo(
    () => solarMode === 'day'
      ? { output: '3.8 kW', battery: '78%', load: 'Pump-ready', status: 'Generating' }
      : { output: '0.4 kW', battery: '74%', load: 'Battery-first', status: 'Evening mode' },
    [solarMode]
  );

  const runWildlifeDemo = () => {
    setWildlifeCheckRunning(true);
    window.setTimeout(() => {
      setWildlifeCheckRunning(false);
      setWildlifeDemoAlert((current) => !current);
    }, 700);
  };

  return (
    <section className="mb-6 space-y-3" aria-label="Future farm intelligence">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Future scope</p>
          <h2 className="mt-1 text-lg font-black text-text-primary dark:text-white">Farm protection & clean energy</h2>
        </div>
        <StatusPill tone="slate">Pitch demo</StatusPill>
      </div>

      <article className={`overflow-hidden rounded-[26px] border p-4 shadow-sm transition ${wildlifeDemoAlert ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${wildlifeDemoAlert ? 'bg-amber-500 text-white' : 'bg-slate-900 text-emerald-300'}`}>
              <ShieldAlert size={21} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-text-primary dark:text-white">WildGuard AI</h3>
                <StatusPill tone={wildlifeDemoAlert ? 'amber' : 'emerald'}>{wildlifeDemoAlert ? 'Review needed' : 'Perimeter ready'}</StatusPill>
              </div>
              <p className="mt-1 text-sm leading-5 text-text-secondary dark:text-slate-300">
                {wildlifeDemoAlert
                  ? 'Demo event: movement pattern near the north boundary. Camera verification would be requested before alerting the farmer.'
                  : 'Future thermal, acoustic and camera sensor fusion for elephants, boar and stray-animal damage alerts.'}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-black/[0.035] px-3 py-2.5 dark:bg-white/5">
          <span className="inline-flex items-center gap-2 text-xs font-bold text-text-secondary dark:text-slate-300"><Camera size={14} /> No field sensor connected</span>
          <button type="button" onClick={runWildlifeDemo} className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-slate-900 px-3 text-xs font-black text-white transition active:scale-95">
            {wildlifeCheckRunning ? 'Checking…' : wildlifeDemoAlert ? 'Clear demo' : 'Run demo'} <ChevronRight size={14} />
          </button>
        </div>
      </article>

      <article className="overflow-hidden rounded-[26px] border border-amber-200 bg-[linear-gradient(135deg,#fffdf5,#fff4cf)] p-4 shadow-sm dark:border-amber-900/50 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 shadow-[0_8px_20px_rgba(245,158,11,0.28)]"><SunMedium size={22} /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-text-primary dark:text-white">SolarGrid Intelligence</h3><StatusPill tone="amber">Future module</StatusPill></div>
              <p className="mt-1 text-sm text-text-secondary dark:text-slate-300">Planned solar generation, battery health and irrigation-load routing.</p>
            </div>
          </div>
          <button type="button" onClick={() => setSolarMode((mode) => mode === 'day' ? 'evening' : 'day')} className="rounded-xl border border-amber-300 bg-white/70 px-3 py-2 text-xs font-black text-amber-900">{solarMode === 'day' ? 'Day' : 'Evening'}</button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/75 p-3"><Zap size={15} className="text-amber-600" /><p className="mt-2 text-base font-black text-text-primary">{solar.output}</p><p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Solar output</p></div>
          <div className="rounded-2xl bg-white/75 p-3"><BatteryCharging size={15} className="text-emerald-600" /><p className="mt-2 text-base font-black text-text-primary">{solar.battery}</p><p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Battery</p></div>
          <div className="rounded-2xl bg-white/75 p-3"><Waves size={15} className="text-sky-600" /><p className="mt-2 text-sm font-black text-text-primary">{solar.load}</p><p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Load plan</p></div>
        </div>
        <button type="button" onClick={onOpenSatellite} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl bg-amber-950 px-4 text-sm font-black text-white"><SunMedium size={16} /> View solar planning on satellite map</button>
      </article>
    </section>
  );
}
