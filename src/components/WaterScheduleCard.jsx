import { useMemo, useState } from 'react';
import {
  Droplets,
  CalendarDays,
  ChevronRight,
  Clock,
  CloudRain,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useZoneStore } from '../store/zoneStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { generateWaterSchedule, getNextIrrigationRecommendation } from '../ai-ml/waterScheduleAdvisor.js';
import { localize } from '../utils/formatters.js';

const RISK_COLORS = {
  critical: { bg: 'bg-red-500', text: 'text-white' },
  high: { bg: 'bg-orange-500', text: 'text-white' },
  medium: { bg: 'bg-amber-400', text: 'text-text-primary' },
  low: { bg: 'bg-emerald-500', text: 'text-white' },
};

function ScheduleDay({ day, language, isToday }) {
  const rain = day.rainProb > 40;
  const urgent = day.needsWater && day.day === 0;

  return (
    <div
      className={`relative min-w-[120px] flex-shrink-0 rounded-[22px] border p-3.5 ${
        isToday
          ? urgent
            ? 'border-red-200 bg-red-50'
            : 'border-[#1a3d1a] bg-[#edf6ec]'
          : day.needsWater
          ? 'border-amber-200 bg-amber-50'
          : 'border-border bg-white'
      }`}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-secondary">
        {day.date}
      </p>

      <div className="mt-2 flex items-center gap-1.5">
        {rain ? (
          <CloudRain size={14} className="text-sky-500" />
        ) : day.needsWater ? (
          <Droplets size={14} className={urgent ? 'text-red-500' : 'text-amber-500'} />
        ) : (
          <CheckCircle2 size={14} className="text-emerald-500" />
        )}
        <span className={`text-[11px] font-black ${urgent ? 'text-red-600' : day.needsWater ? 'text-amber-700' : 'text-emerald-700'}`}>
          {rain
            ? localize({ hi: 'बारिश', mr: 'पाऊस', en: 'Rain' }, language)
            : day.needsWater
            ? localize({ hi: 'सिंचाई', mr: 'पाणी', en: 'Irrigate' }, language)
            : localize({ hi: 'ठीक है', mr: 'ठीक', en: 'OK' }, language)}
        </span>
      </div>

      {day.moistureStart != null && (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#e5eee3]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, day.moistureStart)}%`,
                backgroundColor: day.moistureStart < 40 ? '#ef4444' : day.moistureStart < 60 ? '#f59e0b' : '#22c55e',
              }}
            />
          </div>
          <p className="mt-1 text-[10px] text-text-secondary">
            {Math.round(day.moistureStart)}%
          </p>
        </div>
      )}

      {day.irrigationDurationH && (
        <div className="mt-2 flex items-center gap-1">
          <Clock size={10} className="text-text-secondary" />
          <span className="text-[10px] text-text-secondary">{day.irrigationDurationH}h</span>
        </div>
      )}

      {day.timeSlot && (
        <p className="mt-1 text-[10px] font-bold text-[#1a3d1a]">{day.timeSlot.label[language] || day.timeSlot.label.en}</p>
      )}
    </div>
  );
}

import { useCountUp } from '../hooks/useCountUp.js';

export default function WaterScheduleCard({ compactMode = false }) {
  const navigate = useNavigate();
  const language = useSettingsStore((s) => s.language);
  const zones = useZoneStore((s) => s.zones);
  const weatherCache = useZoneStore((s) => s.weatherCache);

  const [selectedZoneId, setSelectedZoneId] = useState(() => Object.keys(zones)[0] || null);
  const zone = zones[selectedZoneId];

  const schedule = useMemo(() => {
    if (!zone) return [];
    return generateWaterSchedule(zone, weatherCache || {}, language);
  }, [zone, weatherCache, language]);

  const nextRec = useMemo(() => {
    if (!zone) return null;
    return getNextIrrigationRecommendation(zone, weatherCache || {}, language);
  }, [zone, weatherCache, language]);

  const zoneEntries = Object.entries(zones);

  const weekWaterDays = schedule.filter((d) => d.needsWater).length;
  const todayEntry = schedule[0];
  const todayRainProb = todayEntry?.rainProb ?? 0;
  const totalEstCost = schedule.reduce((sum, d) => sum + (d.costEstimate || 0), 0);

  const animatedWaterDays = useCountUp(weekWaterDays, 1000);
  const animatedRainProb = useCountUp(todayRainProb, 1200);
  const animatedCost = useCountUp(totalEstCost, 1500);

  if (!zone || schedule.length === 0) return null;

  return (
    <div className="rounded-[28px] border border-border bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition-all duration-300 hover:shadow-xl dark:border-dark-border dark:from-dark-card dark:to-dark-surface">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#edf6ec] dark:bg-emerald-900/30">
              <CalendarDays size={18} className="text-[#1a3d1a] dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-text-primary dark:text-white">
                {localize({ hi: 'सिंचाई शेड्यूल', mr: 'सिंचन वेळापत्रक', en: 'Water Schedule' }, language)}
              </h2>
              <p className="text-[11px] text-text-secondary dark:text-slate-400">
                {localize({ hi: 'AI द्वारा 7 दिन', mr: 'AI द्वारे 7 दिवस', en: 'AI-powered 7-day plan' }, language)}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/zone/' + selectedZoneId)}
          className="flex items-center gap-1 rounded-full border border-border bg-[#f7faf5] px-3 py-1.5 text-[11px] font-black text-[#1a3d1a] hover:bg-[#eaf4e7] transition-colors dark:border-dark-border dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {localize({ hi: 'पूरा देखें', mr: 'पूर्ण पाहा', en: 'Full view' }, language)}
          <ChevronRight size={12} />
        </button>
      </div>

      {/* Zone selector */}
      {zoneEntries.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {zoneEntries.map(([id, z]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedZoneId(id)}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-black transition ${
                selectedZoneId === id ? 'bg-[#1a3d1a] text-white dark:bg-emerald-600' : 'bg-[#f7faf5] text-text-secondary dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {z.name}
            </button>
          ))}
        </div>
      )}

      {/* Next recommendation banner */}
      {nextRec && (
        <div
          className={`mb-4 flex items-center gap-3 rounded-[22px] px-4 py-3 ${
            nextRec.urgent ? 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-900/50' : 'bg-[#edf6ec] border border-[#c8e0c6] dark:bg-emerald-900/20 dark:border-emerald-900/50'
          }`}
        >
          <div
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
              nextRec.urgent ? 'bg-red-100 dark:bg-red-900/40' : 'bg-[#d4edcc] dark:bg-emerald-900/40'
            }`}
          >
            {nextRec.urgent ? (
              <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
            ) : (
              <Zap size={16} className="text-[#1a3d1a] dark:text-emerald-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-black ${nextRec.urgent ? 'text-red-700 dark:text-red-400' : 'text-[#1a3d1a] dark:text-emerald-400'}`}>
              {nextRec.message}
            </p>
            {nextRec.suggestedTime && (
              <p className="mt-0.5 text-xs text-text-secondary dark:text-slate-400">
                {localize({ hi: 'सुझाया समय', mr: 'सूचित वेळ', en: 'Suggested time' }, language)}: {nextRec.suggestedTime}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 7-day horizontal scroll */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
        {schedule.map((day) => (
          <ScheduleDay key={day.day} day={day} language={language} isToday={day.day === 0} />
        ))}
      </div>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-[20px] bg-[#f7faf5] px-3 py-3 text-center dark:bg-slate-800 transition-transform hover:scale-[1.02]">
          <p className="text-lg font-black text-[#1a3d1a] dark:text-white">{animatedWaterDays}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary dark:text-slate-400">
            {localize({ hi: 'सिंचाई दिन', mr: 'पाणी दिवस', en: 'Water days' }, language)}
          </p>
        </div>
        <div className="rounded-[20px] bg-[#f7faf5] px-3 py-3 text-center dark:bg-slate-800 transition-transform hover:scale-[1.02]">
          <p className="text-lg font-black text-[#1a3d1a] dark:text-white">{animatedRainProb}%</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary dark:text-slate-400">
            {localize({ hi: 'आज बारिश', mr: 'आज पाऊस', en: "Today's rain" }, language)}
          </p>
        </div>
        <div className="rounded-[20px] bg-[#f7faf5] px-3 py-3 text-center dark:bg-slate-800 transition-transform hover:scale-[1.02]">
          <p className="text-lg font-black text-[#1a3d1a] dark:text-white">₹{animatedCost}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary dark:text-slate-400">
            {localize({ hi: 'सप्ताह लागत', mr: 'आठवडा खर्च', en: 'Week cost' }, language)}
          </p>
        </div>
      </div>
    </div>
  );
}
