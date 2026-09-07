import { Droplets, Gauge, Sprout, Thermometer, Waves, X, Zap } from 'lucide-react';

import { useZoneStore } from '../../store/zoneStore.js';

const PART_META = {
  soil_sensor: {
    icon: Droplets,
    title: 'Soil Moisture Sensor',
    label: 'Soil moisture',
    accent: '#22d3ee',
  },
  dht11: {
    icon: Thermometer,
    title: 'DHT11 Sensor',
    label: 'Temperature',
    accent: '#60a5fa',
  },
  water_tank: {
    icon: Waves,
    title: 'Water Tank',
    label: 'Tank level',
    accent: '#38bdf8',
  },
  pump: {
    icon: Zap,
    title: 'Irrigation Pump',
    label: 'Pump status',
    accent: '#f97316',
  },
  valve: {
    icon: Gauge,
    title: 'Flow Valve',
    label: 'Valve status',
    accent: '#a78bfa',
  },
  crop_bed: {
    icon: Sprout,
    title: 'Crop Bed',
    label: 'Moisture',
    accent: '#22c55e',
  },
};

function fmtTemp(value) {
  return value != null ? `${Number(value).toFixed(1)} C` : '--';
}

function fmtPct(value) {
  return value != null ? `${Math.round(Number(value))}%` : '--';
}

function fmtFlow(value) {
  return value != null ? `${Number(value).toFixed(1)} L/min` : '--';
}

export default function TwinObjectHud({ open, part, onClose, onOpenZonePanel }) {
  const zones = useZoneStore((state) => state.zones);
  const zone = part?.zoneId ? zones[part.zoneId] : null;

  if (!open || !part || !zone) return null;

  const meta = PART_META[part.partType] || PART_META.crop_bed;
  const Icon = meta.icon;
  const pumpOn = Boolean(zone.pumpOn);
  const valveOpen = Boolean(zone.valveOpen);

  let primary = '--';
  let primaryLabel = meta.label;
  let rows = [];

  switch (part.partType) {
    case 'soil_sensor':
      primary = fmtPct(zone.moisture);
      rows = [];
      break;
    case 'dht11':
      primary = fmtTemp(zone.temperature);
      rows = [{ label: 'Humidity', value: fmtPct(zone.humidity) }];
      break;
    case 'pump':
      primary = pumpOn ? 'ON' : 'OFF';
      rows = [
        { label: 'Flow', value: fmtFlow(zone.flow) },
        { label: 'Valve', value: valveOpen ? 'OPEN' : 'CLOSED' },
      ];
      break;
    case 'valve':
      primary = valveOpen ? 'OPEN' : 'CLOSED';
      rows = [
        { label: 'Pump', value: pumpOn ? 'ON' : 'OFF' },
        { label: 'Flow', value: fmtFlow(zone.flow) },
      ];
      break;
    case 'water_tank': {
      const tankPct = Math.min(
        100,
        Math.max(8, Math.round(55 + (zone.waterUsageToday ?? 0) / 4 - (pumpOn ? 0 : 5)))
      );
      primary = `${tankPct}%`;
      rows = [{ label: 'Used today', value: `${zone.waterUsageToday ?? 0} L` }];
      break;
    }
    default:
      primary = fmtPct(zone.moisture);
      primaryLabel = 'Zone moisture';
      rows = [
        { label: 'Temperature', value: fmtTemp(zone.temperature) },
        { label: 'Crop', value: zone.cropType || '--' },
      ];
  }

  return (
    <div className="pointer-events-auto absolute left-1/2 top-[38%] z-[110] w-[min(92vw,17.5rem)] -translate-x-1/2 -translate-y-1/2">
      <div
        className="overflow-hidden rounded-2xl border shadow-[0_0_40px_rgba(34,211,238,0.25)]"
        style={{
          borderColor: `${meta.accent}66`,
          background: 'linear-gradient(145deg, rgba(8,14,22,0.96) 0%, rgba(6,12,20,0.92) 100%)',
        }}
      >
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${meta.accent}, transparent)` }}
        />
        <div className="p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: `${meta.accent}22`, color: meta.accent }}
              >
                <Icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{zone.name}</p>
                <p className="text-sm font-black text-white">{meta.title}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-white/5 p-1.5 text-slate-400 hover:text-white"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mb-3 rounded-xl border border-white/5 bg-black/30 px-3 py-3 text-center">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
              {primaryLabel}
            </p>
            <p className="mt-1 font-mono text-3xl font-black" style={{ color: meta.accent }}>
              {primary}
            </p>
          </div>

          {rows.length ? (
            <div className="space-y-2">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2"
                >
                  <span className="text-[10px] font-bold uppercase text-slate-500">{row.label}</span>
                  <span className="font-mono text-xs font-bold text-white">{row.value}</span>
                </div>
              ))}
            </div>
          ) : null}

          {onOpenZonePanel ? (
            <button
              type="button"
              onClick={onOpenZonePanel}
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:bg-white/10"
            >
              Full zone panel
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
