import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  CircleAlert,
  Droplets,
  Eye,
  Gauge,
  Info,
  Thermometer,
  Trash2,
  Waves,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import CropAvatar from '../components/CropAvatar.jsx';
import ManualEntrySheet from '../components/ManualEntrySheet.jsx';
import ModeToggle from '../components/ModeToggle/index.jsx';
import NutrientBars from '../components/NutrientBars.jsx';
import FertigationAdvisor from '../components/FertigationAdvisor.jsx';
import CropLifecycleTimeline from '../components/CropLifecycleTimeline.jsx';
import WaterNowConfirm from '../components/WaterNowConfirm.jsx';
import IrrigationWeekChart from '../components/IrrigationWeekChart.jsx';
import { buildZoneCharts, getCropMeta } from '../data/appContent.js';
import { useInflux } from '../hooks/useInflux.js';
import { useMqtt } from '../hooks/useMqtt.js';
import { buildWeeklyIrrigationPlan, formatWaterCostLiters } from '../services/irrigationScheduler.js';
import { getZonePhysics } from '../utils/zoneConstants.js';
import { getSensorOfflineDetail } from '../utils/sensorStatus.js';
import { useModeStore } from '../store/modeStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { BarChart, PumpTimeline, Sparkline } from '../utils/svgChart.jsx';
import { getMoistureMeta, getSyncMeta, localize } from '../utils/formatters.js';

function MetricCard({ icon, label, value, hint }) {
  return (
    <div className="rounded-[22px] border border-[#e5eee2] bg-[#f7faf5] p-4">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">
        {icon}
        {label}
      </div>
      <p className="text-lg font-black text-text-primary">{value}</p>
      {hint ? <p className="mt-1 text-xs text-text-secondary">{hint}</p> : null}
    </div>
  );
}

export default function ZoneDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mqtt = useMqtt();
  const influx = useInflux();
  const weatherCache = useZoneStore((state) => state.weatherCache);
  const language = useSettingsStore((state) => state.language);
  const isActMode = useModeStore((state) => state.mode === 'act');
  const zone = useZoneStore((state) => state.getZone(id));
  const isZoneOffline = useZoneStore((state) => state.isZoneOffline);
  const manualEntry = useZoneStore((state) => state.manualEntries[id]);
  const queuePumpCommand = useZoneStore((state) => state.queuePumpCommand);
  const updateZoneField = useZoneStore((state) => state.updateZoneField);
  const removeZone = useZoneStore((state) => state.removeZone);
  const zones = useZoneStore((state) => state.zones);

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showWaterConfirm, setShowWaterConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [scheduleTime, setScheduleTime] = useState(zone?.schedule || '06:30');
  const [scheduleDuration, setScheduleDuration] = useState(zone?.scheduleDuration || 30);

  const [moistureHistory, setMoistureHistory] = useState([]);

  useEffect(() => {
    if (!id) return;
    influx.getMoistureHistory(id, 24 * 7).then((points) => {
      if (points?.length) {
        setMoistureHistory(points.map((p) => p.value ?? p.moisture ?? 0));
      }
    });
  }, [id, influx, zone?.moisture]);

  const charts = useMemo(() => {
    if (!zone) return null;
    const base = buildZoneCharts(zone);
    if (moistureHistory.length >= 2) {
      return { ...base, moistureTrend: moistureHistory };
    }
    return base;
  }, [moistureHistory, zone]);

  const irrigationPlan = useMemo(() => {
    if (!zone) return [];
    return buildWeeklyIrrigationPlan({
      zone,
      weatherForecast: weatherCache?.forecast7d || [],
      physics: getZonePhysics(zone.id),
    });
  }, [zone, weatherCache]);

  const sensorOffline = useMemo(
    () => (zone && isZoneOffline(id) ? getSensorOfflineDetail(zone, language) : null),
    [id, isZoneOffline, language, zone]
  );

  if (!zone) {
    return (
      <div className="px-4 pt-4 pb-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-text-primary"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="rounded-[28px] border border-border bg-white p-6 text-center shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          <h1 className="text-2xl font-black text-text-primary">
            {localize({ hi: 'ज़ोन नहीं मिला', mr: 'झोन सापडला नाही', en: 'Zone not found' }, language)}
          </h1>
        </div>
      </div>
    );
  }

  const cropMeta = getCropMeta(zone.cropType);
  const moistureMeta = getMoistureMeta(zone.moisture, language);
  const syncMeta = getSyncMeta(zone.lastUpdated, language);
  const liveWaterAction = navigator.onLine && mqtt.isConnected;
  const zoneCount = Object.keys(zones || {}).length;
  const canRemoveZone = zoneCount > 1;

  const modeLabel = isActMode
    ? localize({ hi: 'ACT MODE', mr: 'ACT MODE', en: 'ACT MODE' }, language)
    : localize({ hi: 'VIEW MODE', mr: 'VIEW MODE', en: 'VIEW MODE' }, language);

  const modeHelp = isActMode
    ? localize(
        {
          hi: 'इस मोड में आप पंप चालू या बंद कर सकते हैं।',
          mr: 'या मोडमध्ये तुम्ही पंप सुरू किंवा बंद करू शकता.',
          en: 'In this mode you can turn the pump on or off.',
        },
        language
      )
    : localize(
        {
          hi: 'इस मोड में केवल डेटा देखेंगे, हार्डवेयर नहीं बदलेगा।',
          mr: 'या मोडमध्ये फक्त डेटा दिसेल, हार्डवेअर बदलणार नाही.',
          en: 'This mode is read-only and will not change hardware.',
        },
        language
      );

  const batteryLabel =
    zone.battery == null
      ? localize({ hi: 'कनेक्ट नहीं', mr: 'कनेक्ट नाही', en: 'Not connected' }, language)
      : `${zone.battery}%`;

  const advisory =
    zone.moisture < 40
      ? localize(
          {
            hi: 'मिट्टी तेजी से सूख रही है। आज शाम तक 20-25 मिनट की सिंचाई उपयुक्त रहेगी।',
            mr: 'माती पटकन कोरडी होत आहे. आज संध्याकाळपर्यंत 20-25 मिनिटांचे सिंचन योग्य राहील.',
            en: 'The soil is drying quickly. A 20-25 minute irrigation window by evening is appropriate.',
          },
          language
        )
      : localize(
          {
            hi: 'नमी स्थिर है। अभी केवल निगरानी रखें और अगला अपडेट देखें।',
            mr: 'ओलावा स्थिर आहे. आत्ता फक्त लक्ष ठेवा आणि पुढचा अपडेट पाहा.',
            en: 'Moisture is stable. Keep monitoring and wait for the next update.',
          },
          language
        );

  const metricCards = [
    {
      icon: <Thermometer size={14} className="text-orange-600" />,
      label: localize({ hi: 'तापमान', mr: 'तापमान', en: 'Temperature' }, language),
      value: zone.temperature == null ? '—' : `${zone.temperature}°C`,
    },
    {
      icon: <Waves size={14} className="text-sky-600" />,
      label: localize({ hi: 'हवा नमी', mr: 'हवेतील ओलावा', en: 'Humidity' }, language),
      value: zone.humidity == null ? '—' : `${zone.humidity}%`,
    },
    {
      icon: <Gauge size={14} className="text-amber-600" />,
      label: 'pH',
      value: zone.ph ?? '—',
      hint: localize({ hi: 'आदर्श 6.5-7.5', mr: 'आदर्श 6.5-7.5', en: 'Ideal 6.5-7.5' }, language),
    },
    {
      icon: <Droplets size={14} className="text-emerald-600" />,
      label: 'EC',
      value: zone.ec ?? '—',
      hint: localize(
        { hi: 'उच्च EC पर नमक बढ़ सकता है', mr: 'जास्त EC म्हणजे क्षार वाढू शकतात', en: 'High EC can indicate salts' },
        language
      ),
    },
  ];

  const moistureZones = [
    { from: 0, to: 40, color: '#fee2e2' },
    { from: 40, to: 60, color: '#fef3c7' },
    { from: 60, to: 80, color: '#dcfce7' },
    { from: 80, to: 100, color: '#dbeafe' },
  ];

  return (
    <div className="px-4 pt-4 pb-28">
      <div className="mb-4 flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-text-primary"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <CropAvatar cropId={zone.cropType} size="md" />
                <div className="min-w-0">
                  <h1 className="truncate text-[30px] font-black leading-none text-text-primary">{zone.name}</h1>
                  <p className="mt-1 text-sm text-text-secondary">{localize(cropMeta.name, language)}</p>
                </div>
              </div>
            </div>
            <span className={`rounded-full px-3 py-2 text-xs font-black ${syncMeta.tone}`}>{syncMeta.label}</span>
          </div>

          <div className="mt-3 rounded-[22px] border border-[#dbe6d9] bg-white px-4 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Info size={15} className="text-[#1a3d1a]" />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">{modeLabel}</p>
                  <p className="text-xs text-text-secondary">{modeHelp}</p>
                </div>
              </div>
              <ModeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-border bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        {sensorOffline ? (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <WifiOff size={16} />
              <span>
                <strong>{sensorOffline.title}</strong> — {sensorOffline.body}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/hardware')}
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-[#1a3d1a]"
            >
              <Wrench size={14} />
              {localize({ hi: 'ठीक करें', mr: 'दुरुस्त करा', en: 'Troubleshoot' }, language)}
            </button>
          </div>
        ) : null}

        <div className="grid gap-4">
          <div className="rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#f7faf5_100%)] p-5 ring-1 ring-[#e8efe5]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">
              {localize({ hi: 'आज की स्थिति', mr: 'आजची स्थिती', en: "Today's status" }, language)}
            </p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-end gap-2">
                  <span className="text-6xl font-black leading-none" style={{ color: moistureMeta.color }}>
                    {zone.moisture}%
                  </span>
                  <span className="pb-2 text-base font-semibold text-text-secondary">
                    {localize({ hi: 'नमी', mr: 'ओलावा', en: 'Moisture' }, language)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-black" style={{ color: moistureMeta.color }}>
                  {moistureMeta.label}
                </p>
              </div>

              <div className="min-w-[120px] rounded-[24px] border border-[#e7eee4] bg-white px-4 py-4 text-center shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">Battery</p>
                <p className="mt-2 text-2xl font-black text-text-primary">{batteryLabel}</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-text-secondary">{advisory}</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#ebf3ea]">
              <div className="h-full rounded-full" style={{ width: `${zone.moisture}%`, backgroundColor: moistureMeta.color }} />
            </div>
          </div>

          <div className="rounded-[28px] bg-[#f7faf5] p-5 ring-1 ring-[#e8efe5]">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-text-primary">
              <CircleAlert size={16} className="text-[#1a3d1a]" />
              {localize({ hi: 'सिफारिश', mr: 'शिफारस', en: 'Recommendation' }, language)}
            </div>
            <p className="text-sm text-text-secondary">{advisory}</p>
            <button
              type="button"
              onClick={() => setShowWaterConfirm(true)}
              disabled={!isActMode}
              className={`mt-5 w-full rounded-2xl px-4 py-4 text-sm font-black text-white transition ${
                isActMode ? 'bg-[#1a3d1a]' : 'cursor-not-allowed bg-[#b6c6b4] text-white/80'
              }`}
            >
              {zone.pumpOn
                ? localize({ hi: 'पंप पहले से चालू है', mr: 'पंप आधीच सुरू आहे', en: 'Pump is already running' }, language)
                : localize({ hi: 'अभी पानी दें', mr: 'आत्ता पाणी द्या', en: 'Water now' }, language)}
            </button>
            <button
              type="button"
              onClick={() => mqtt.publishPump(id, false, 'zone-detail')}
              disabled={!isActMode}
              className={`mt-3 w-full rounded-2xl border px-4 py-4 text-sm font-black transition ${
                isActMode ? 'border-red-200 bg-red-50 text-red-700' : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
              }`}
            >
              {localize({ hi: 'पंप रोकें', mr: 'पंप थांबवा', en: 'Stop pump' }, language)}
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metricCards.map((item) => (
            <MetricCard key={item.label} icon={item.icon} label={item.label} value={item.value} hint={item.hint} />
          ))}
        </div>

        <div className="mt-5">
          <NutrientBars zone={zone} language={language} />
        </div>

        <CropLifecycleTimeline cropType={zone.cropType} sowingDate={zone.createdAt} />
        <FertigationAdvisor zoneId={id} />

        <div className="mt-5 rounded-[28px] border border-[#e5eee2] bg-[#f7faf5] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-text-primary">
                {localize({ hi: 'सिंचाई शेड्यूल', mr: 'सिंचन वेळापत्रक', en: 'Irrigation schedule' }, language)}
              </p>
              <p className="text-sm text-text-secondary">
                {localize(
                  {
                    hi: 'टाइमर के आधार पर अगली सिंचाई का समय तय करें।',
                    mr: 'टायमरनुसार पुढील सिंचनाची वेळ ठरवा.',
                    en: 'Set the next irrigation slot using a simple timer.',
                  },
                  language
                )}
              </p>
            </div>
            <CalendarClock size={20} className="text-[#1a3d1a]" />
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_80px_auto]">
            <input
              type="time"
              value={scheduleTime}
              onChange={(event) => setScheduleTime(event.target.value)}
              className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm font-bold text-text-primary outline-none"
            />
            <input
              type="number"
              placeholder="Min"
              min="1"
              value={scheduleDuration}
              onChange={(event) => setScheduleDuration(Number(event.target.value))}
              className="h-12 w-full rounded-2xl border border-border bg-white px-2 text-center text-sm font-bold text-text-primary outline-none"
            />
            <button
              type="button"
              onClick={() => {
                updateZoneField(id, 'schedule', scheduleTime);
                updateZoneField(id, 'scheduleDuration', scheduleDuration);
              }}
              className="rounded-2xl bg-[#1a3d1a] px-4 py-3 text-sm font-black text-white"
            >
              {localize({ hi: 'सेव करें', mr: 'जतन करा', en: 'Save' }, language)}
            </button>
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            {localize(
              {
                hi: `आज पानी: ${zone.waterUsageToday ?? 0} L • अनुमानित लागत ₹${formatWaterCostLiters(zone.waterUsageToday ?? 0)}`,
                mr: `आज पाणी: ${zone.waterUsageToday ?? 0} L • अंदाजे खर्च ₹${formatWaterCostLiters(zone.waterUsageToday ?? 0)}`,
                en: `Water today: ${zone.waterUsageToday ?? 0} L • Est. cost ₹${formatWaterCostLiters(zone.waterUsageToday ?? 0)}`,
              },
              language
            )}
            {zone.flow ? ` • ${localize({ hi: 'फ्लो', mr: 'प्रवाह', en: 'Flow' }, language)} ${zone.flow} L/min` : ''}
          </p>
        </div>

        <div className="mt-5 rounded-[28px] border border-[#e5eee2] bg-white p-5">
          <p className="mb-3 text-sm font-black text-text-primary">
            {localize(
              { hi: '7-दिन सिंचाई योजना (AI + मौसम)', mr: '7-दिवस सिंचन योजना', en: '7-day irrigation plan (AI + weather)' },
              language
            )}
          </p>
          <IrrigationWeekChart plan={irrigationPlan} language={language} />
        </div>

        {zone.zoneType === 'manual' ? (
          <div className="mt-5 rounded-[28px] border border-[#e5eee2] bg-[#f7faf5] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-text-primary">
                  {localize({ hi: 'मैन्युअल खेत डायरी', mr: 'मॅन्युअल शेत डायरी', en: 'Manual field diary' }, language)}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {manualEntry?.notes ||
                    localize(
                      {
                        hi: 'अभी तक कोई नोट नहीं जोड़ा गया है।',
                        mr: 'अजून कोणतीही नोंद जोडलेली नाही.',
                        en: 'No manual note has been added yet.',
                      },
                      language
                    )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManualEntry(true)}
                className="rounded-full border border-border bg-white p-2 text-text-secondary"
              >
                <Eye size={16} />
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-5 hidden rounded-[28px] border border-red-100 bg-red-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-red-700">
                {localize({ hi: 'ज़ोन हटाएं', mr: 'झोन हटवा', en: 'Remove zone' }, language)}
              </p>
              <p className="mt-1 text-sm text-red-600">
                {canRemoveZone
                  ? localize(
                      {
                        hi: 'यह ज़ोन डैशबोर्ड, ट्विन और सिंचाई सूची से हट जाएगा।',
                        mr: 'हा झोन डॅशबोर्ड, ट्विन आणि सिंचन यादीतून हटवला जाईल.',
                        en: 'This zone will be removed from the dashboard, twin view, and irrigation lists.',
                      },
                      language
                    )
                  : localize(
                      {
                        hi: 'कम से कम एक ज़ोन रखना ज़रूरी है। नया ज़ोन जोड़ने के बाद ही इसे हटाया जा सकता है।',
                        mr: 'किमान एक झोन ठेवणे आवश्यक आहे. नवीन झोन जोडल्यानंतरच हा हटवता येईल.',
                        en: 'At least one zone must remain. Add another zone before deleting this one.',
                      },
                      language
                    )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => canRemoveZone && setShowRemoveConfirm(true)}
              disabled={!canRemoveZone}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
                canRemoveZone
                  ? 'bg-red-600 text-white shadow-[0_14px_28px_rgba(220,38,38,0.18)]'
                  : 'cursor-not-allowed bg-red-100 text-red-300'
              }`}
            >
              <Trash2 size={16} />
              {localize({ hi: 'हटाएं', mr: 'हटवा', en: 'Remove' }, language)}
            </button>
          </div>
        </div>

        {charts ? (
          <div className="mt-6 grid gap-4">
            <div className="rounded-[28px] border border-[#e5eee2] bg-[#f7faf5] p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-text-primary">
                    {localize({ hi: '7 दिन नमी ट्रेंड', mr: '7 दिवस ओलावा ट्रेंड', en: '7-day moisture trend' }, language)}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {localize(
                      {
                        hi: 'लाल से हरे ज़ोन तक पढ़ने योग्य ट्रेंड, दिनों के साथ।',
                        mr: 'दिवसांसह वाचता येईल असा ट्रेंड, लाल ते हिरवे झोन दाखवत.',
                        en: 'Readable trend with day labels and moisture zones.',
                      },
                      language
                    )}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-text-secondary">%</span>
              </div>
              <Sparkline
                data={charts.moisture}
                height={210}
                color="#16a34a"
                labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                unit="%"
                showDots
                showLabels
                zones={moistureZones}
                formatter={(value) => `${value}%`}
              />
            </div>

            <div className="grid gap-4">
              <div className="rounded-[28px] border border-[#e5eee2] bg-[#f7faf5] p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-text-primary">
                      {localize({ hi: 'पंप टाइमलाइन', mr: 'पंप टाइमलाइन', en: 'Pump timeline' }, language)}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {localize(
                        {
                          hi: 'समय के साथ पंप ऑन और ऑफ़ अवधि देखें।',
                          mr: 'वेळेनुसार पंप ऑन आणि ऑफ कालावधी पाहा.',
                          en: 'See pump-on and pump-off periods over time.',
                        },
                        language
                      )}
                    </p>
                  </div>
                </div>
                <PumpTimeline
                  pumpStates={charts.pumpStates}
                  height={140}
                  labels={['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00']}
                />
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-text-secondary">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded bg-[#22c55e]" />
                    {localize({ hi: 'हरा: पंप चालू', mr: 'हिरवा: पंप सुरू', en: 'Green: pump on' }, language)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded bg-[#cbd5e1]" />
                    {localize({ hi: 'ग्रे: पंप बंद', mr: 'राखाडी: पंप बंद', en: 'Grey: pump off' }, language)}
                  </span>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#e5eee2] bg-[#f7faf5] p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-text-primary">
                      {localize({ hi: 'पानी उपयोग', mr: 'पाणी वापर', en: 'Water use' }, language)}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {localize(
                        {
                          hi: 'हर दिन कितना पानी उपयोग हुआ, लीटर में।',
                          mr: 'प्रत्येक दिवशी किती पाणी वापरले गेले, लिटरमध्ये.',
                          en: 'Daily water consumption shown in litres.',
                        },
                        language
                      )}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-text-secondary">L</span>
                </div>
                <BarChart
                  data={charts.waterUsage}
                  height={210}
                  color="#0284c7"
                  labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                  unit="L"
                  formatter={(value) => `${value} L`}
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 rounded-[28px] border border-red-100 bg-red-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-red-700">Danger zone</p>
              <p className="mt-1 text-sm text-red-600">
                {canRemoveZone
                  ? 'Remove this zone only when you are sure. It will disappear from dashboard, twin view, and irrigation lists.'
                  : 'At least one zone must remain. Add another zone before deleting this one.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => canRemoveZone && setShowRemoveConfirm(true)}
              disabled={!canRemoveZone}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
                canRemoveZone
                  ? 'bg-red-600 text-white shadow-[0_14px_28px_rgba(220,38,38,0.18)]'
                  : 'cursor-not-allowed bg-red-100 text-red-300'
              }`}
            >
              <Trash2 size={16} />
              Remove
            </button>
          </div>
        </div>
      </div>

      {showManualEntry ? <ManualEntrySheet zoneId={id} onClose={() => setShowManualEntry(false)} /> : null}
      {showWaterConfirm ? (
        <WaterNowConfirm
          zoneName={zone.name}
          moisture={zone.moisture}
          onCancel={() => setShowWaterConfirm(false)}
          onConfirm={() => {
            if (liveWaterAction) {
              mqtt.publishPump(id, true, 'zone-detail');
            } else {
              queuePumpCommand(id, true);
            }
            setShowWaterConfirm(false);
          }}
        />
      ) : null}
      {showRemoveConfirm ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 px-4"
          onClick={(event) => event.target === event.currentTarget && setShowRemoveConfirm(false)}
        >
          <div className="w-full max-w-md rounded-t-[32px] bg-white p-6 pb-8 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Trash2 size={20} />
            </div>
            <h2 className="text-2xl font-black text-text-primary">
              {localize({ hi: 'इस ज़ोन को हटाएं?', mr: 'हा झोन हटवायचा?', en: 'Remove this zone?' }, language)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {localize(
                {
                  hi: `${zone.name} हटाने के बाद उसका डेटा, कार्ड और क्विक एक्शन तुरंत सूची से हट जाएंगे।`,
                  mr: `${zone.name} हटवल्यानंतर त्याचा डेटा, कार्ड आणि क्विक अॅक्शन लगेच यादीतून हटतील.`,
                  en: `${zone.name} will be removed from cards, actions, and active zone lists immediately.`,
                },
                language
              )}
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowRemoveConfirm(false)}
                className="flex-1 rounded-2xl border border-border px-4 py-4 text-sm font-bold text-text-primary"
              >
                {localize({ hi: 'रद्द करें', mr: 'रद्द करा', en: 'Cancel' }, language)}
              </button>
              <button
                type="button"
                onClick={() => {
                  removeZone(id);
                  setShowRemoveConfirm(false);
                  navigate('/');
                }}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-4 text-sm font-black text-white"
              >
                {localize({ hi: 'हाँ, हटाएं', mr: 'हो, हटवा', en: 'Yes, remove' }, language)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
