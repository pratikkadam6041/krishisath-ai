import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useZoneStore } from '../../store/zoneStore.js';
import { useModeStore } from '../../store/modeStore.js';
import { Play, Square, Lock, AlertTriangle, BrainCircuit } from 'lucide-react';
import ActionButton from '../ActionButton/index.jsx';

export default function FertigationPanel({ zoneId, onStart, onStop }) {
  const { t } = useTranslation();
  const zone = useZoneStore((s) => s.zones[zoneId]);
  const tanks = useZoneStore((s) => s.tanks);
  const isAct = useModeStore((s) => s.mode === 'act');
  const isRunning = zone?.fertigationOn;
  const isLocked = !isAct;

  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const aiRecommended = true; // Hardcoded for demo to show discrepancy

  const TANKS = [
    { key: 'tankA', labelKey: 'hardware.tankA', color: '#2E7D32' },
    { key: 'tankB', labelKey: 'hardware.tankB', color: '#0277BD' },
    { key: 'tankC', labelKey: 'hardware.tankC', color: '#F9A825' },
  ];

  return (
    <div className="card p-4" id={`fertigation-panel-${zoneId}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-subheading">{t('hardware.fertigation')}</h4>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
          isRunning ? 'bg-primary bg-opacity-15 text-primary' : 'bg-border text-text-secondary'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-primary animate-pulse' : 'bg-border'}`} />
          {isRunning ? t('twin.fertigationActive') : t('twin.fertigationIdle')}
        </div>
      </div>

      {/* NPK Tank levels */}
      <div className="space-y-2 mb-4">
        {TANKS.map(({ key, labelKey, color }) => (
          <div key={key}>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-text-secondary">{t(labelKey)}</span>
              <span className="text-xs font-semibold text-text-primary">{tanks[key] ?? '--'}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill npk-bar-fill"
                style={{ width: `${tanks[key] ?? 0}%`, background: color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* AI Safety Interlock */}
      {!isRunning && !isLocked && aiRecommended && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 shadow-sm animate-fade-in-up">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">AI Guardrail Active</p>
              <p className="text-xs text-red-800/80 dark:text-red-300/80 mt-1">
                Your manual dose differs from the <span className="font-semibold"><BrainCircuit size={10} className="inline mb-0.5"/> AI Recommended ML Model</span>. 
                Excessive Nitrogen (Tank A) may cause severe crop burn.
              </p>
            </div>
          </div>
          
          <label className="flex items-center gap-2 mt-3 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input 
                type="checkbox" 
                className="peer sr-only"
                checked={safetyAcknowledged}
                onChange={(e) => setSafetyAcknowledged(e.target.checked)}
              />
              <div className="w-5 h-5 border-2 border-red-400 rounded bg-transparent peer-checked:bg-red-500 peer-checked:border-red-500 transition-all flex items-center justify-center">
                <svg className={`w-3 h-3 text-white pointer-events-none ${safetyAcknowledged ? 'opacity-100' : 'opacity-0'} transition-opacity`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <span className="text-xs font-semibold text-red-700 dark:text-red-300 select-none group-hover:text-red-600 transition-colors">
              I acknowledge the risk and authorize manual override.
            </span>
          </label>
        </div>
      )}

      {/* Controls */}
      <div className={`flex gap-2 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
        <ActionButton
          id={`fert-start-${zoneId}`}
          icon={<Play size={16} />}
          label={t('hardware.fertigationStart')}
          variant="primary"
          onClick={() => {
            if (!safetyAcknowledged) return;
            onStart?.(zoneId);
          }}
          disabled={isLocked || isRunning || !safetyAcknowledged}
          fullWidth
        />
        <ActionButton
          id={`fert-stop-${zoneId}`}
          icon={<Square size={16} />}
          label={t('hardware.fertigationStop')}
          variant="danger"
          onClick={() => {
            setSafetyAcknowledged(false);
            onStop?.(zoneId);
          }}
          disabled={isLocked || !isRunning}
        />
      </div>
      {isLocked && (
        <div className="flex items-center gap-1.5 mt-2 text-text-secondary">
          <Lock size={12} />
          <span className="text-xs">{t('mode.lockedMsg')}</span>
        </div>
      )}
    </div>
  );
}
