import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Droplets, Thermometer, Wind, Activity, Lock } from 'lucide-react';
import { useZoneData } from '../../hooks/useZoneData.js';
import { useModeStore } from '../../store/modeStore.js';
import ActionButton from '../ActionButton/index.jsx';

export default function ZoneCard({ zoneId, onWaterNow, onStop }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { zone, moistureStatus, healthColor, pumpRuntime } = useZoneData(zoneId);
  const isAct = useModeStore((s) => s.mode === 'act');

  if (!zone) return <div className="card skeleton h-48" />;

  const zoneName = t(`zone.${zoneId}`);
  const moisturePct = zone.moisture ?? 0;
  const isLocked = !isAct;

  return (
    <div
      className={`card zone-${moistureStatus} animate-fade-in-up`}
      id={`zone-card-${zoneId}`}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between">
        <div>
          <h3 className="text-subheading text-text-primary">{zoneName}</h3>
          <p className="text-small text-text-secondary">{t(`zone.${zoneId}Full`)}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Pump status dot */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${zone.pumpOn ? 'animate-pulse-green bg-primary' : 'bg-border'}`}
            />
            <span className="text-xs text-text-secondary">
              {zone.pumpOn ? t('hardware.pumpOn') : t('hardware.pumpOff')}
            </span>
          </div>
        </div>
      </div>

      {/* Moisture display */}
      <div className="px-4 pb-3">
        <div className="flex items-end gap-2 mb-2">
          <span className="sensor-value" style={{ color: healthColor }}>{moisturePct}%</span>
          <span className="sensor-unit mb-2">{t('sensor.moisture')}</span>
          <span className={`badge ml-auto zone-${moistureStatus} mb-2 text-xs`}
            style={{ background: healthColor + '20', color: healthColor }}>
            {t(`zone.${moistureStatus}`)}
          </span>
        </div>
        {/* Moisture progress bar */}
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${moisturePct}%`, background: healthColor }}
          />
        </div>
      </div>

      {/* Sensor chips */}
      <div className="px-4 pb-3 flex gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-bg rounded-lg px-2 py-1">
          <Thermometer size={14} className="text-danger" />
          <span className="text-small font-medium">{zone.temperature}°C</span>
        </div>
        <div className="flex items-center gap-1 bg-bg rounded-lg px-2 py-1">
          <Wind size={14} className="text-water" />
          <span className="text-small font-medium">{zone.humidity}%</span>
        </div>
        <div className="flex items-center gap-1 bg-bg rounded-lg px-2 py-1">
          <Activity size={14} className="text-primary" />
          <span className="text-small font-medium">pH {zone.ph}</span>
        </div>
        {zone.pumpOn && pumpRuntime && (
          <div className="flex items-center gap-1 bg-primary bg-opacity-10 rounded-lg px-2 py-1">
            <span className="text-xs text-primary font-semibold">⏱ {pumpRuntime}</span>
          </div>
        )}
      </div>

      {/* Digital Twin Prediction */}
      {zone.pumpOn && (
        <div className="mx-4 mb-4 relative overflow-hidden rounded-xl border border-cyan-500/40 bg-gradient-to-br from-slate-900 to-slate-800 p-3 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <div className="absolute -right-2 -top-2 h-10 w-10 animate-pulse rounded-full bg-cyan-500/20 blur-lg"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="mb-0.5 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-cyan-400 drop-shadow-[0_0_2px_rgba(34,211,238,0.5)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
                </span>
                AI SIMULATION
              </p>
              <p className="text-[10px] font-medium text-slate-300">
                Optimal in <span className="font-bold text-white">~12m</span> • <span className="font-bold text-white">15L</span> est.
              </p>
            </div>
            <Activity size={16} className="text-cyan-500/50" />
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="px-4 pb-4 flex gap-2">
        <div className={isLocked ? 'locked-control flex-1' : 'flex-1'}>
          <ActionButton
            id={`btn-water-${zoneId}`}
            icon={<Droplets size={16} />}
            label={t('zone.waterNow')}
            variant="primary"
            onClick={() => onWaterNow?.(zoneId)}
            disabled={isLocked || zone.pumpOn}
            fullWidth
          />
        </div>
        <div className={isLocked ? 'locked-control' : ''}>
          <ActionButton
            id={`btn-stop-${zoneId}`}
            icon={<Activity size={16} />}
            label={t('zone.stop')}
            variant="danger"
            onClick={() => onStop?.(zoneId)}
            disabled={isLocked || !zone.pumpOn}
          />
        </div>
        <ActionButton
          id={`btn-details-${zoneId}`}
          label={t('zone.details')}
          variant="ghost"
          onClick={() => navigate(`/zone/${zoneId}`)}
        />
      </div>

      {isLocked && (
        <div className="px-4 pb-3 flex items-center gap-1.5 text-text-secondary">
          <Lock size={13} />
          <span className="text-xs">{t('mode.lockedMsg')}</span>
        </div>
      )}
    </div>
  );
}
