import { useMemo, useState } from 'react';
import { Network, Zap, Droplets, Clock, Brain, Satellite, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import FarmDiorama from '../components/DigitalTwinMap/FarmDiorama.jsx';
import { showToast } from '../components/Toast/index.jsx';
import { useMqtt } from '../hooks/useMqtt.js';
import { useModeStore } from '../store/modeStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { localize } from '../utils/formatters.js';
import { dispatchHardwareUpdate } from '../utils/zoneSync.js';
import { rlDecide } from '../ai-ml/irrigationRL.js';
import { timeToThreshold } from '../ai-ml/moistureForecast.js';

function EmptyTwin({ language }) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center bg-[#0a0f12] p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-emerald-500/10 text-emerald-400">
        <Network size={30} />
      </div>
      <h2 className="text-xl font-black text-white">
        {localize({ hi: 'अभी कोई ज़ोन नहीं है', mr: 'अजून कोणताही झोन नाही', en: 'No zones yet' }, language)}
      </h2>
      <p className="mt-2 max-w-xs text-sm text-slate-400">
        {localize(
          {
            hi: 'सेटअप से ज़ोन जोड़ें — 3D ट्विन तुरंत अपडेट होगा।',
            mr: 'सेटअपमधून झोन जोडा — 3D ट्विन लगेच अपडेट होईल.',
            en: 'Add a zone from Setup — the 3D twin updates instantly everywhere.',
          },
          language
        )}
      </p>
    </div>
  );
}

function RLRecommendationBanner({ zones, weather, language }) {
  const recommendations = useMemo(() => {
    const recs = [];
    Object.values(zones).forEach((zone) => {
      if (!zone || zone.zoneType === 'manual') return;

      const rl = rlDecide({
        moisture: zone.moisture ?? 50,
        temperature: zone.temperature ?? 28,
        rainProb: weather?.rainProb ?? 0,
        hour: new Date().getHours(),
        pumpAlreadyOn: zone.pumpOn,
      });

      if (rl.action !== 'irrigate') return;

      const hoursLeft = timeToThreshold(zone.moisture ?? 50, 35, zone.temperature ?? 28, zone.humidity ?? 60);

      recs.push({
        zoneId: zone.id,
        zoneName: zone.name,
        moisture: zone.moisture,
        confidence: rl.confidence,
        hoursLeft: Math.max(0, Math.round(hoursLeft * 10) / 10),
        reasoning: rl.reasoning,
      });
    });
    return recs.sort((a, b) => a.hoursLeft - b.hoursLeft);
  }, [zones, weather]);

  if (recommendations.length === 0) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pb-20 p-3 pointer-events-none">
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pointer-events-auto">
        {recommendations.slice(0, 2).map((rec) => (
          <div
            key={rec.zoneId}
            className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-[rgba(10,15,18,0.92)] px-4 py-3 backdrop-blur"
            style={{ boxShadow: '0 0 20px rgba(251,191,36,0.15)' }}
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
              {rec.hoursLeft <= 1 ? (
                <Zap size={16} className="text-amber-400" />
              ) : rec.hoursLeft <= 4 ? (
                <Droplets size={16} className="text-sky-400" />
              ) : (
                <Clock size={16} className="text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-white truncate">{rec.zoneName}</p>
                <span className="flex-shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-300">
                  {rec.moisture}% moisture
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                {rec.hoursLeft <= 0
                  ? localize({ hi: 'अभी सिंचाई करें', mr: 'आत्ता पाणी द्या', en: 'Irrigate now' }, language)
                  : rec.hoursLeft <= 2
                  ? localize({ hi: `${rec.hoursLeft}h में पानी ज़रूरी`, mr: `${rec.hoursLeft}h मध्ये पाणी हवे`, en: `Water needed in ${rec.hoursLeft}h` }, language)
                  : localize({ hi: `${rec.hoursLeft}h में सिंचाई सुझाई`, mr: `${rec.hoursLeft}h मध्ये सिंचन सुचवले`, en: `Irrigation suggested in ${rec.hoursLeft}h` }, language)}
                {' · '}
                <span className="text-emerald-400">
                  <Brain size={9} className="inline mr-0.5" />
                  RL {rec.confidence}%
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SatelliteMap({ onClose }) {
  // Pune is used until a precise farm-boundary coordinate is added
  // during onboarding. This remains a read-only visual layer and never sends
  // a control command.
  const mapUrl = 'https://www.google.com/maps?q=18.5204,73.8567&z=15&t=k&output=embed';
  return (
    <div className="absolute inset-0 z-50 bg-[#081014]">
      <iframe title="Satellite view of the farm area" src={mapUrl} className="h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-slate-950/90 px-4 py-3 text-white backdrop-blur">
        <div><p className="flex items-center gap-2 text-sm font-black"><Satellite size={17} className="text-emerald-400" /> Geospatial satellite view</p><p className="mt-0.5 text-xs text-slate-400">Pune planning boundary · read-only layer</p></div>
        <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white" aria-label="Close satellite map"><X size={19} /></button>
      </div>
    </div>
  );
}

export default function DigitalTwinScreen() {
  const [searchParams] = useSearchParams();
  const language = useSettingsStore((state) => state.language);
  const zones = useZoneStore((state) => state.zones);
  const weatherCache = useZoneStore((state) => state.weatherCache);
  const mode = useModeStore((state) => state.mode);
  const mqtt = useMqtt();
  const zoneList = Object.values(zones);
  const zoneKey = zoneList
    .map((zone) => `${zone.id}:${zone.name}:${zone.cropType}:${zone.zoneType}`)
    .sort()
    .join('|');

  const [isRaining, setIsRaining] = useState(false);
  const [showSatellite, setShowSatellite] = useState(() => searchParams.get('satellite') === '1');

  const handleToggleRain = () => {
    const newRainState = !isRaining;
    setIsRaining(newRainState);
    if (newRainState) {
      let stoppedAny = false;
      Object.values(zones).forEach(z => {
        if (z.pumpOn) {
          mqtt.publishPump(z.id, false);
          mqtt.publishValve(z.id, false);
          dispatchHardwareUpdate({ ...z, pumpOn: false, valveOpen: false });
          stoppedAny = true;
        }
      });
      if (stoppedAny) {
        showToast("AI Override: Irrigation halted to conserve water due to rain 🌧️", "warning");
      } else {
        showToast("Raining started 🌧️", "info");
      }
    }
  };

  const handlePumpStart = (zoneId) => {
    if (mode !== 'act') {
      showToast(
        localize(
          {
            hi: 'नियंत्रण के लिए पहले ACT MODE चालू करें',
            mr: 'नियंत्रणासाठी आधी ACT MODE सुरू करा',
            en: 'Switch to ACT MODE first to control hardware',
          },
          language
        ),
        'warning'
      );
      return;
    }

    const zone = zones[zoneId];
    const ok = mqtt.publishPump(zoneId, true);
    mqtt.publishValve(zoneId, true);
    if (!ok) {
      useZoneStore.getState().queuePumpCommand(zoneId, 'on');
    }
    dispatchHardwareUpdate({ ...zone, pumpOn: true, valveOpen: true });
    showToast(
      localize(
        {
          hi: `${zone?.name || zoneId}: सिंचाई शुरू`,
          mr: `${zone?.name || zoneId}: सिंचन सुरू`,
          en: `Irrigation started on ${zone?.name || zoneId}`,
        },
        language
      ),
      'success'
    );
  };

  const handlePumpStop = (zoneId) => {
    if (mode !== 'act') return;

    const zone = zones[zoneId];
    mqtt.publishPump(zoneId, false);
    mqtt.publishValve(zoneId, false);
    mqtt.publishFertigation(zoneId, false);
    dispatchHardwareUpdate({
      ...zone,
      pumpOn: false,
      valveOpen: false,
      fertigationOn: false,
    });
    showToast(
      localize(
        {
          hi: `${zone?.name || zoneId}: संचालन बंद`,
          mr: `${zone?.name || zoneId}: ऑपरेशन थांबले`,
          en: `Operations stopped on ${zone?.name || zoneId}`,
        },
        language
      ),
      'info'
    );
  };

  if (!zoneList.length) {
    return (
      <div className="absolute inset-0 flex flex-col bg-[#0a0f12]">
        <EmptyTwin language={language} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-[#0a0f12]">
      {/* 3D Farm — unchanged from prior build */}
      <FarmDiorama
        key={zoneKey}
        language={language}
        onPumpStart={handlePumpStart}
        onPumpStop={handlePumpStop}
        isRaining={isRaining}
      />

      {showSatellite ? <SatelliteMap onClose={() => setShowSatellite(false)} /> : null}

      {/* RL-driven irrigation recommendation overlay */}
      <RLRecommendationBanner zones={zones} weather={weatherCache} language={language} />

      {/* Rain Toggle Button */}
      <div className="absolute z-40" style={{ top: '12px', right: '12px' }}>
        <div className="flex flex-col gap-2">
        <button 
          onClick={handleToggleRain}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-md shadow-lg transition-all ${
            isRaining 
              ? 'bg-blue-500/20 border-blue-400 text-blue-300' 
              : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
          }`}
        >
          <Droplets size={18} className={isRaining ? 'animate-bounce' : ''} />
          <span className="font-bold text-sm">{isRaining ? 'Stop Rain' : 'Simulate Rain'}</span>
        </button>
        <button onClick={() => setShowSatellite(true)} className="flex items-center gap-2 rounded-xl border border-white/20 bg-slate-950/75 px-4 py-2 text-sm font-bold text-white backdrop-blur hover:bg-slate-900"><Satellite size={18} className="text-emerald-400" /> Satellite map</button>
        </div>
      </div>
    </div>
  );
}
