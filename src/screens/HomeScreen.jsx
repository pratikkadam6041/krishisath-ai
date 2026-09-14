import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  ChevronRight,
  CircleAlert,
  Droplets,
  Eye,
  Gauge,
  MapPin,
  MessageSquareText,
  Newspaper,
  Plus,
  Power,
  Radio,
  ScanSearch,
  Thermometer,
  Waves,
  Wifi,
  WifiOff,
  Lock,
  Sprout,
  TestTube,
  Tent,
  Fish,
  Trees,
  TrendingUp,
  Map as MapIcon
} from 'lucide-react';

import AddZoneSheet from '../components/AddZoneSheet.jsx';
import CropAvatar from '../components/CropAvatar.jsx';
import ManualEntrySheet from '../components/ManualEntrySheet.jsx';
import ModeToggle from '../components/ModeToggle/index.jsx';
import NutrientBars from '../components/NutrientBars.jsx';
import WaterNowConfirm from '../components/WaterNowConfirm.jsx';
import WeatherGlyph from '../components/WeatherGlyph.jsx';
import WaterScheduleCard from '../components/WaterScheduleCard.jsx';
import FertigationPanel from '../components/FertigationPanel/index.jsx';
import AnimalRiskCard from '../components/AnimalRiskCard.jsx';
import SolarDashboardCard from '../components/SolarDashboardCard.jsx';
import DailyBriefCard from '../components/DailyBriefCard.jsx';
import { fetchWeather, getUserLocation } from '../api/liveServices.js';
import { getCropMeta } from '../data/appContent.js';
import { useMqtt } from '../hooks/useMqtt.js';
import { useCountUp } from '../hooks/useCountUp.js';
import { useAuthStore } from '../store/authStore.js';
import YieldAnalytics from '../components/YieldAnalytics.jsx';
import { useAdminStore } from '../store/adminStore.js';
import { useMandiStore } from '../store/mandiStore.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useModeStore } from '../store/modeStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import {
  formatArea,
  formatCurrency,
  formatRelativeTime,
  getMoistureMeta,
  getSyncMeta,
  localize,
  toInitials,
} from '../utils/formatters.js';
import { isFeatureRouteEnabled } from '../utils/featureFlags.js';
import { getFeatureFlags } from '../utils/featureFlags.js';

function WeatherSkeleton() {
  return (
    <div className="weather-hero-card animate-pulse rounded-[32px] p-5">
      <div className="mb-5 h-3 w-28 rounded-full bg-white/20" />
      <div className="mb-5 flex items-end justify-between">
        <div className="h-16 w-32 rounded-2xl bg-white/20" />
        <div className="h-20 w-20 rounded-[28px] bg-white/15" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-20 rounded-2xl bg-white/12" />
        ))}
      </div>
    </div>
  );
}

function QuickCard({ icon, title, subtitle, colorClass, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[26px] border border-[#dbe5d8] bg-gradient-to-br from-white to-[#f7faf5] p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-dark-border dark:from-dark-card dark:to-dark-surface relative overflow-hidden active:scale-95"
    >
      <div className={`absolute bottom-0 left-0 top-0 w-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${colorClass.split(' ')[0].replace('bg-', 'bg-').replace('100', '400')}`} />
      <div className="mb-4 flex items-center justify-between relative z-10">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-black/5 dark:ring-white/10 ${colorClass}`}>
          {icon}
        </div>
        <ChevronRight size={16} className="text-slate-400 transition-transform group-hover:translate-x-1" />
      </div>
      <h3 className="text-base font-black text-text-primary dark:text-white relative z-10">{title}</h3>
      <p className="mt-1 text-sm text-text-secondary dark:text-slate-400 relative z-10">{subtitle}</p>
    </button>
  );
}

function SummaryCard({ label, value, icon, tone = 'default' }) {
  const toneClass =
    tone === 'good'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      : tone === 'info'
      ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
      : 'bg-surface-2 text-text-primary dark:bg-dark-card dark:text-slate-300';

  // Extract number from strings like "2.4°C" or just use the number if it's raw
  const rawNum = typeof value === 'string' ? value.replace(/[^0-9.]/g, '') : value;
  const suffix = typeof value === 'string' ? value.replace(/[0-9.]/g, '') : '';
  const animatedValue = useCountUp(rawNum, 1200);

  const displayValue = isNaN(parseFloat(rawNum)) ? value : `${animatedValue}${suffix}`;

  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-border bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-dark-border dark:from-dark-card dark:to-dark-surface">
      <div className={`absolute bottom-0 left-0 top-0 w-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${toneClass.split(' ')[0].replace('bg-', 'bg-').replace('50', '400')}`} />
      
      <div className={`mb-3 inline-flex rounded-2xl px-3 py-2 ${toneClass}`}>{icon}</div>
      <p className="text-2xl font-black text-text-primary dark:text-white">{displayValue}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary dark:text-slate-400">{label}</p>
    </div>
  );
}

function ZoneCard({ zoneId, zone, language, units, onManualOpen, onWater, onStop, onView }) {
  const isOffline = useZoneStore((state) => state.isZoneOffline(zoneId));
  const manualEntry = useZoneStore((state) => state.manualEntries[zoneId]);
  const cropMeta = useMemo(() => getCropMeta(zone.cropType), [zone.cropType]);
  const moistureMeta = useMemo(() => getMoistureMeta(zone.moisture, language), [language, zone.moisture]);
  const syncMeta = useMemo(() => getSyncMeta(zone.lastUpdated, language), [language, zone.lastUpdated]);
  const isActMode = useModeStore((state) => state.mode === 'act');
  const isControlDisabled = !isActMode && !zone.pumpOn;

  const sensorCards = [
    {
      icon: <Thermometer size={14} />,
      label: localize({ hi: 'तापमान', mr: 'तापमान', en: 'Temperature' }, language),
      value: zone.temperature ? `${zone.temperature}°C` : '—',
    },
    {
      icon: <Waves size={14} />,
      label: localize({ hi: 'हवा नमी', mr: 'हवा ओलावा', en: 'Humidity' }, language),
      value: zone.humidity ? `${zone.humidity}%` : '—',
    },
    {
      icon: <Gauge size={14} />,
      label: 'pH',
      value: zone.ph ?? '—',
    },
    {
      icon: <Radio size={14} />,
      label: 'EC',
      value: zone.ec ?? '—',
    },
  ];

  const statusBorder =
    zone.moisture < 40 ? 'border-red-200' : zone.moisture <= 60 ? 'border-amber-200' : 'border-[#dde8db]';

  if (zone.zoneType === 'manual') {
    return (
      <div className={`relative overflow-hidden rounded-[28px] border bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-dark-border dark:from-dark-card dark:to-dark-surface ${statusBorder}`}>
        {/* Left accent border */}
        <div className={`absolute bottom-0 left-0 top-0 w-1.5 ${statusBorder.replace('border-', 'bg-').replace('200', '400')}`} />

        <div className="relative z-10 mb-4 flex items-center">
          <ModeToggle />
        </div>
        
        <div className="mb-4 flex items-start justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{zoneId.toUpperCase()}</p>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {localize({ hi: 'मैन्युअल', mr: 'मॅन्युअल', en: 'Manual' }, language)}
              </span>
            </div>
            <h3 className="mt-2 text-xl font-black text-text-primary">{zone.name}</h3>
            <div className="mt-2 flex items-center gap-3">
              <CropAvatar cropId={zone.cropType} size="sm" />
              <p className="text-sm text-text-secondary">
                {localize(cropMeta.name, language)} · {formatArea(zone.area, units, language)}
              </p>
            </div>
          </div>
        </div>

        {manualEntry ? (
          <div className="mb-4 rounded-[22px] bg-[#f7faf5] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-text-primary">{manualEntry.stage || manualEntry.cropStage}</p>
                <p className="text-sm text-text-secondary">{manualEntry.observation}</p>
              </div>
              <p className="text-xs font-semibold text-slate-500">{formatRelativeTime(manualEntry.updatedAt, language)}</p>
            </div>
            {manualEntry.notes ? <p className="mt-3 text-sm text-text-secondary">{manualEntry.notes}</p> : null}
          </div>
        ) : (
          <div className="mb-4 rounded-[22px] border border-dashed border-[#d9e7d8] bg-[#f7faf5] p-4 text-sm text-text-secondary">
            {localize(
              {
                hi: 'पहली खेत प्रविष्टि जोड़ें ताकि यह प्लॉट सलाह देना शुरू करे।',
                mr: 'पहिली शेत नोंद करा म्हणजे हा प्लॉट सल्ला देऊ शकेल.',
                en: 'Add the first field update so this plot can start giving advice.',
              },
              language
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onManualOpen}
            className="flex-1 rounded-2xl bg-[#1a3d1a] px-4 py-4 text-sm font-black text-white"
          >
            {localize({ hi: 'मैन्युअल अपडेट', mr: 'मॅन्युअल अपडेट', en: 'Manual update' }, language)}
          </button>
          <button type="button" onClick={onView} className="rounded-2xl border border-border px-4 text-text-secondary">
            <Eye size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-[28px] border bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] ${statusBorder}`}>
      <div className="mb-4 flex items-center">
        <ModeToggle />
      </div>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{zoneId.toUpperCase()}</p>
            {isOffline ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                {localize({ hi: 'ऑफलाइन', mr: 'ऑफलाइन', en: 'Offline' }, language)}
              </span>
            ) : (
              <span className={`rounded-full px-3 py-1 text-[11px] font-black ${syncMeta.tone}`}>{syncMeta.label}</span>
            )}
          </div>
          <h3 className="mt-2 text-xl font-black text-text-primary">{zone.name}</h3>
          <div className="mt-2 flex items-center gap-3">
            <CropAvatar cropId={zone.cropType} size="sm" />
            <p className="text-sm text-text-secondary">
              {localize(cropMeta.name, language)} · {formatArea(zone.area, units, language)}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-black ${zone.pumpOn ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
          {zone.pumpOn
            ? localize({ hi: 'पंप चालू', mr: 'पंप सुरू', en: 'Pump on' }, language)
            : localize({ hi: 'पंप बंद', mr: 'पंप बंद', en: 'Pump off' }, language)}
        </span>
      </div>

      {isOffline ? (
        <div className="mb-4 flex items-center gap-2 rounded-[22px] bg-slate-100 px-4 py-3 text-sm text-slate-600">
          <WifiOff size={16} />
          {localize(
            {
              hi: `सेंसर से डेटा नहीं आया — ${formatRelativeTime(zone.lastUpdated, language)}`,
              mr: `सेन्सरकडून डेटा नाही — ${formatRelativeTime(zone.lastUpdated, language)}`,
              en: `No sensor data received — ${formatRelativeTime(zone.lastUpdated, language)}`,
            },
            language
          )}
        </div>
      ) : null}

      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black" style={{ color: moistureMeta.color }}>
              {zone.moisture}%
            </span>
            <span className="pb-2 text-sm font-semibold text-text-secondary">
              {localize({ hi: 'नमी', mr: 'ओलावा', en: 'Moisture' }, language)}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-secondary">{moistureMeta.description}</p>
        </div>
        <span className={`rounded-full px-3 py-2 text-sm font-black ${moistureMeta.softColor}`}>{moistureMeta.label}</span>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-[#ebf3ea]">
        <div className="h-full rounded-full" style={{ width: `${zone.moisture}%`, backgroundColor: moistureMeta.color }} />
      </div>

      <div className={`mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 ${isOffline ? 'opacity-45' : ''}`}>
        {sensorCards.map((item) => (
          <div key={item.label} className="rounded-[20px] bg-[#f4faf2] p-3">
            <div className="mb-2 flex items-center gap-2 text-sm text-[#1a3d1a]">
              {item.icon}
              <span className="text-[11px] font-bold tracking-[0.02em]">{item.label}</span>
            </div>
            <p className="text-sm font-black text-text-primary">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-5">
        <NutrientBars zone={zone} language={language} compact />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={zone.pumpOn ? onStop : onWater}
          disabled={isControlDisabled}
          className={`flex-1 rounded-2xl px-4 py-4 text-sm font-black text-white ${
            isControlDisabled ? 'cursor-not-allowed bg-slate-300 text-slate-500' : zone.pumpOn ? 'bg-[#c7684b]' : 'bg-[#1a3d1a]'
          }`}
        >
          {zone.pumpOn
            ? localize({ hi: 'पंप रोकें', mr: 'पंप थांबवा', en: 'Stop pump' }, language)
            : localize({ hi: 'अभी पानी दें', mr: 'आत्ता पाणी द्या', en: 'Water now' }, language)}
        </button>
        <button type="button" onClick={onView} className="rounded-2xl border border-border px-4 text-text-secondary">
          <Eye size={18} />
        </button>
      </div>
    </div>
  );
}

function MandiTicker({ language }) {
  const navigate = useNavigate();
  const crops = useMandiStore((state) => state.crops);
  const selectedCropIds = useMandiStore((state) => state.selectedCropIds);
  const sortedCrops = useMemo(() => {
    if (!Array.isArray(crops) || crops.length === 0) return [];
    const selected = crops.filter((crop) => selectedCropIds.includes(crop.id));
    const others = crops.filter((crop) => !selectedCropIds.includes(crop.id));
    return [...selected, ...others];
  }, [crops, selectedCropIds]);
  const tickerCrops = sortedCrops.length ? sortedCrops : [
    { id: 'wheat', cropName: 'Wheat', cropNameHi: 'गेहूं', cropNameMr: 'गहू', price: 2180, unit: 'quintal', change: 12 },
    { id: 'tomato', cropName: 'Tomato', cropNameHi: 'टमाटर', cropNameMr: 'टोमॅटो', price: 890, unit: 'quintal', change: 45 },
  ];

  return (
    <button
      type="button"
      onClick={() => navigate('/mandi')}
      className="block w-full overflow-hidden rounded-[24px] bg-[#1a3d1a] px-4 py-3 text-left text-white"
    >
      <div className="animate-[ticker_10s_linear_infinite] whitespace-nowrap text-sm font-semibold inline-block">
        {[...tickerCrops, ...tickerCrops].map((crop, index) => (
          <span key={`${crop.id}-${index}`} className="mr-6 inline-flex items-center gap-2">
            <span>{language === 'mr' ? crop.cropNameMr : language === 'en' ? crop.cropName : crop.cropNameHi}</span>
            <span>₹{formatCurrency(crop.price)}/{crop.unit}</span>
            <span className={crop.change >= 0 ? 'text-lime-200' : 'text-red-200'}>
              {crop.change >= 0 ? `↑${crop.change}` : `↓${Math.abs(crop.change)}`}
            </span>
          </span>
        ))}
      </div>
    </button>
  );
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const mqtt = useMqtt();
  const language = useSettingsStore((state) => state.language);
  const units = useSettingsStore((state) => state.units);
  const profilePhoto = useSettingsStore((state) => state.profilePhoto);
  const farmName = useZoneStore((state) => state.farmName);
  const zoneUserName = useZoneStore((state) => state.userName);
  const authFirstName = useAuthStore((state) => state.firstName);
  const userName = zoneUserName || authFirstName || 'Kisan';
  const village = useZoneStore((state) => state.village);
  const district = useZoneStore((state) => state.district);
  const zones = useZoneStore((state) => state.zones);
  const weatherCache = useZoneStore((state) => state.weatherCache);
  const setWeatherCache = useZoneStore((state) => state.setWeatherCache);
  const queuedCommands = useZoneStore((state) => state.queuedCommands);
  const queuePumpCommand = useZoneStore((state) => state.queuePumpCommand);
  const notifications = useNotificationStore((state) => state.notifications);
  const onboardingStatus = useAuthStore((state) => state.onboardingStatus);
  const globalAlert = useAdminStore((state) => state.globalAlert);
  const features = getFeatureFlags(useAdminStore((state) => state.features));

  const [weather, setWeather] = useState(weatherCache);
  const [showAddZone, setShowAddZone] = useState(false);
  const [manualSheetZone, setManualSheetZone] = useState(null);
  const [confirmZone, setConfirmZone] = useState(null);
  const [dismissedAlertAt, setDismissedAlertAt] = useState(null);
  const [activeModule, setActiveModule] = useState('smart-field');

  useEffect(() => {
    let active = true;

    async function loadWeather() {
      const coords = await getUserLocation();
      const weatherData = await fetchWeather(coords.lat, coords.lon);
      if (!active) return;
      setWeather(weatherData);
      setWeatherCache(weatherData);
    }

    loadWeather();
    return () => {
      active = false;
    };
  }, [setWeatherCache]);

  const zoneEntries = useMemo(() => Object.entries(zones), [zones]);
  const summary = useMemo(() => {
    const zoneList = Object.values(zones);
    return {
      activePumps: zoneList.filter((zone) => zone.pumpOn).length,
      waterUsed: zoneList.reduce((total, zone) => total + (zone.waterUsageToday || 0), 0),
      onlineZones: zoneList.filter((zone) => zone.zoneType === 'manual' || !useZoneStore.getState().isZoneOffline(zone.id)).length,
    };
  }, [zones]);
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);
  const currentHour = new Date().getHours();
  const isNightWeather = currentHour >= 19 || currentHour < 6;

  const derivedAlerts = useMemo(() => {
    const alerts = [];

    zoneEntries.forEach(([zoneId, zone]) => {
      if (zone.moisture < 45) {
        alerts.push({
          id: `moisture-${zoneId}`,
          tone: 'border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20',
          title: t('home.alerts.moistureTitle', { zoneName: zone.name, moisture: zone.moisture, defaultValue: `${zone.name} moisture is at ${zone.moisture}%` }),
          subtitle: t('home.alerts.moistureSubtitle', { defaultValue: 'The soil is drying quickly and irrigation should be planned now.' }),
          actionLabel: t('home.waterNow', { defaultValue: 'Water now' }),
          onAction: () => setConfirmZone({ zoneId, zone }),
        });
      }
    });

    notifications
      .filter((notification) => isFeatureRouteEnabled(notification.actionRoute || '', features))
      .slice(0, 2)
      .forEach((notification) => {
        alerts.push({
          id: notification.id,
          tone:
            notification.type === 'scheme'
              ? 'border-sky-300 bg-sky-50 dark:border-sky-900/50 dark:bg-sky-900/20'
              : notification.type === 'pest'
              ? 'border-orange-300 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-900/20'
              : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800',
          title: notification.title,
          subtitle: notification.subtitle,
          actionLabel:
            notification.type === 'scheme'
              ? t('home.alerts.seeDetails', { defaultValue: 'See details' })
              : t('home.alerts.open', { defaultValue: 'Open' }),
          onAction: () => navigate(notification.actionRoute || '/notifications'),
        });
      });

    return alerts.slice(0, 3);
  }, [t, navigate, notifications, zoneEntries, features]);

  const runWaterAction = (zoneId) => {
    const live = navigator.onLine && mqtt.isConnected;
    if (live) {
      mqtt.publishPump(zoneId, true, 'home');
      return;
    }

    queuePumpCommand(zoneId, true);
  };

  const stopIrrigation = (zoneId) => {
    // Stopping is an emergency-safe action: always close both pump and valve.
    mqtt.publishPump(zoneId, false, 'home');
    mqtt.publishValve(zoneId, false, 'home');
  };

  return (
    <div className="home-screen px-4 pt-4 pb-6">
      <div className="mb-4 flex items-start justify-between">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="flex items-start gap-3 group"
        >
          <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#1a3d1a] text-sm font-black text-white ring-2 ring-transparent transition-all group-hover:ring-emerald-400">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              toInitials(userName)
            )}
          </div>
          <div>
            <p className="text-sm font-black text-text-primary">{userName}</p>
            <p className="text-xs text-text-secondary">{farmName || village}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-white text-text-primary"
        >
          <Bell size={18} />
          {unreadCount ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
              {unreadCount}
            </span>
          ) : null}
        </button>
      </div>

      {globalAlert && dismissedAlertAt !== globalAlert.createdAt ? (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-2xl p-4 text-white shadow-lg ${
          globalAlert.type === 'critical' ? 'bg-red-600' :
          globalAlert.type === 'warning' ? 'bg-amber-600' :
          'bg-sky-600'
        }`}>
          <div className="flex items-start gap-3">
            <CircleAlert size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-white/70">Admin Broadcast</p>
              <p className="text-sm font-bold mt-0.5">{globalAlert.message}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setDismissedAlertAt(globalAlert.createdAt)}
            className="shrink-0 rounded-full p-1 hover:bg-white/20 transition-colors"
          >
            <Plus size={16} className="rotate-45" />
          </button>
        </div>
      ) : null}

      <DailyBriefCard onClick={() => {}} />

      <div className="home-weather-grid">
      <button type="button" onClick={() => navigate('/weather')} className="mb-4 block w-full text-left">
        {weather ? (
          <div
            className={`weather-hero-card weather-hero-card--${isNightWeather ? 'night' : 'day'} rounded-[32px] p-5 text-white shadow-[0_28px_80px_rgba(37,48,120,0.35)]`}
          >
            <div className="weather-hero-card__aurora" />
            <div className="weather-hero-card__glow weather-hero-card__glow--primary" />
            <div className="weather-hero-card__glow weather-hero-card__glow--secondary" />
            <div className="weather-hero-card__grid" />
            <div className="weather-hero-card__cloud-band weather-hero-card__cloud-band--back" />
            <div className="weather-hero-card__cloud-band weather-hero-card__cloud-band--front" />
            <div className="weather-hero-card__spark weather-hero-card__spark--one" />
            <div className="weather-hero-card__spark weather-hero-card__spark--two" />
            <div className="weather-hero-card__spark weather-hero-card__spark--three" />
            <div className="relative z-10">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-white/72">
                  <MapPin size={12} className="mr-1 inline" />
                  {village}, {district}
                </p>
                <p className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[11px] font-black tracking-[0.18em] text-white/88 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                  {isNightWeather ? 'NIGHT SKY' : 'LIVE SKY'}
                </p>
              </div>
                <div className="weather-hero-card__icon-shell rounded-[28px] p-4 text-white">
                  <WeatherGlyph condition={weather.condition} rainProb={weather.rainProb} size={82} />
                </div>
              </div>

            <div className="mb-4">
              <p className="text-5xl font-black">{weather.temp}°C</p>
              <p className="mt-1 text-sm text-white/75">
                {weather.condition} ·{' '}
                {localize(
                  {
                    hi: `महसूस ${weather.feelsLike}°`,
                    mr: `${weather.feelsLike}° जाणवते`,
                    en: `Feels like ${weather.feelsLike}°`,
                  },
                  language
                )}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: localize({ hi: 'नमी', mr: 'आर्द्रता', en: 'Humidity' }, language),
                  value: `${weather.humidity}%`,
                  icon: <Waves size={18} />,
                },
                {
                  label: localize({ hi: 'वर्षा', mr: 'पाऊस', en: 'Rain' }, language),
                  value: `${weather.rainProb}%`,
                  icon: <Droplets size={18} />,
                },
                {
                  label: localize({ hi: 'हवा', mr: 'हवा', en: 'Air' }, language),
                  value: weather.rainProb > 40 ? 'Fair' : 'Good',
                  icon: <Gauge size={18} />,
                },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/10 p-3">
                  <div className="mb-2 text-white/80">{item.icon}</div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{item.label}</p>
                  <p className="mt-1 text-sm font-black text-white">{item.value}</p>
                </div>
              ))}
            </div>
            </div>
          </div>
        ) : (
          <WeatherSkeleton />
        )}
      </button>

      {weather?.forecast7d?.length ? (
        <div className="home-forecast mb-5 flex gap-2 overflow-x-auto pb-1">
          {weather.forecast7d.slice(0, 5).map((day, index) => (
            <div
              key={day.date}
              className={`min-w-[92px] rounded-2xl border px-3 py-3 text-center ${
                index === 0 ? 'border-[#1a3d1a] bg-[#edf6ec]' : 'border-border bg-white'
              }`}
            >
              <p className="text-xs font-black text-text-primary">
                {index === 0
                  ? localize({ hi: 'आज', mr: 'आज', en: 'Today' }, language)
                  : new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short' })}
              </p>
              <div className="my-2 flex justify-center text-[#1a3d1a]">
                <WeatherGlyph condition={day.condition} rainProb={day.rainProb} size={28} />
              </div>
              <p className="text-sm font-black text-text-primary">
                {day.maxTemp}° / <span className="text-text-secondary">{day.minTemp}°</span>
              </p>
            </div>
          ))}
        </div>
      ) : null}
      </div>

      {onboardingStatus === 'skipped' ? (
        <div className="mb-4 rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {localize(
            {
              hi: 'ऑनबोर्डिंग अधूरा है। पूरा करने पर मौसम, योजना और फसल सलाह और बेहतर होगी।',
              mr: 'ऑनबोर्डिंग अपूर्ण आहे. पूर्ण केल्यावर सल्ला अधिक अचूक होईल.',
              en: 'Setup is incomplete. Finish onboarding later for better weather, scheme, and crop guidance.',
            },
            language
          )}
        </div>
      ) : null}

      {queuedCommands.length ? (
        <div className="mb-4 rounded-[24px] border border-lime-200 bg-lime-50 p-4 text-sm text-lime-800">
          {localize(
            {
              hi: `${queuedCommands.length} पंप कमांड कतार में हैं। नेटवर्क आते ही भेज दिए जाएंगे।`,
              mr: `${queuedCommands.length} पंप कमांड रांगेत आहेत. नेटवर्क आल्यावर पाठवू.`,
              en: `${queuedCommands.length} pump commands are queued and will send when the network returns.`,
            },
            language
          )}
        </div>
      ) : null}

      {derivedAlerts.length ? (
        <div className="mb-5 space-y-3">
          {derivedAlerts.map((alert) => (
            <button
              type="button"
              key={alert.id}
              onClick={alert.onAction}
              className={`flex w-full items-start justify-between gap-3 rounded-[24px] border border-transparent p-4 text-left shadow-sm transition-transform active:scale-[0.98] ${alert.tone}`}
            >
              <div>
                <p className="text-sm font-black text-text-primary dark:text-white">{alert.title}</p>
                <p className="mt-1 text-sm text-text-secondary dark:text-slate-300">{alert.subtitle}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-text-primary shadow-sm dark:bg-slate-800 dark:text-white">
                {alert.actionLabel}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-3 gap-3">
        <SummaryCard
          label={localize({ hi: 'चालू पंप', mr: 'सुरू पंप', en: 'Active pumps' }, language)}
          value={summary.activePumps}
          icon={<Power size={16} />}
        />
        <SummaryCard
          label={localize({ hi: 'आज का पानी', mr: 'आजचे पाणी', en: 'Water today' }, language)}
          value={`${summary.waterUsed} L`}
          icon={<Droplets size={16} />}
          tone="info"
        />
        <SummaryCard
          label={localize({ hi: 'ऑनलाइन ज़ोन', mr: 'ऑनलाइन झोन', en: 'Zones online' }, language)}
          value={`${summary.onlineZones}/${zoneEntries.length}`}
          icon={<Wifi size={16} />}
          tone="good"
        />
      </div>

      <div className="mb-6 rounded-[24px] border border-[#dbe5d8] bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 shadow-sm dark:border-emerald-900/30 dark:from-emerald-900/20 dark:to-emerald-900/10">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
              <span className="text-[12px] font-black tracking-wider">PRO</span>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-500">KrishiSarth Pro</p>
              <p className="text-sm font-bold text-text-primary dark:text-white">Active Subscription</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-200/50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-800/50 dark:text-emerald-300">
            345 days left
          </span>
        </div>
        <p className="text-sm text-emerald-800/80 dark:text-emerald-400/80 mb-4">
          You are receiving premium AI insights, Priority support, and automated weather adjustments.
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-200/50 dark:bg-emerald-900/30">
          <div className="h-full w-[5%] rounded-full bg-emerald-600 dark:bg-emerald-500" />
        </div>
      </div>

      <div className="mb-6 mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-text-primary uppercase tracking-widest">
              Farm Modules
            </h2>
            <p className="text-xs text-text-secondary mt-0.5 font-medium">Select a system to manage</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddZone(true)}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          >
            <Plus size={14} />
            Add System
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide snap-x">
          <button
            onClick={() => setActiveModule('smart-field')}
            className={`flex shrink-0 snap-start items-center gap-2 rounded-2xl px-4 py-3 transition-all ${
              activeModule === 'smart-field'
                ? 'bg-[#1a3d1a] text-white shadow-md scale-100'
                : 'bg-white border border-border text-slate-500 scale-95 hover:scale-100'
            }`}
          >
            <Sprout size={18} className={activeModule === 'smart-field' ? 'text-emerald-400' : ''} />
            <span className="text-sm font-bold">Smart Field</span>
          </button>

          <button
            onClick={() => setActiveModule('fertigation')}
            className={`flex shrink-0 snap-start items-center gap-2 rounded-2xl px-4 py-3 transition-all ${
              activeModule === 'fertigation'
                ? 'bg-[#1a3d1a] text-white shadow-md scale-100'
                : 'bg-white border border-border text-slate-500 scale-95 hover:scale-100'
            }`}
          >
            <TestTube size={18} className={activeModule === 'fertigation' ? 'text-blue-400' : ''} />
            <span className="text-sm font-bold">Precision Fertigation</span>
          </button>

          <button
            onClick={() => setActiveModule('polyhouse')}
            className={`flex shrink-0 snap-start items-center gap-2 rounded-2xl px-4 py-3 transition-all ${
              activeModule === 'polyhouse'
                ? 'bg-slate-800 text-white shadow-md scale-100'
                : 'bg-slate-50 border border-slate-200 text-slate-400 scale-95 hover:scale-100'
            }`}
          >
            <Tent size={18} className="text-amber-400" />
            <span className="text-sm font-bold">Polyhouse</span>
            <Lock size={12} className="ml-1 opacity-50" />
          </button>

          <button
            onClick={() => setActiveModule('aquaponics')}
            className={`flex shrink-0 snap-start items-center gap-2 rounded-2xl px-4 py-3 transition-all ${
              activeModule === 'aquaponics'
                ? 'bg-slate-800 text-white shadow-md scale-100'
                : 'bg-slate-50 border border-slate-200 text-slate-400 scale-95 hover:scale-100'
            }`}
          >
            <Fish size={18} className="text-sky-400" />
            <span className="text-sm font-bold">Aquaponics</span>
            <Lock size={12} className="ml-1 opacity-50" />
          </button>
          
          <button
            onClick={() => setActiveModule('mushroom')}
            className={`flex shrink-0 snap-start items-center gap-2 rounded-2xl px-4 py-3 transition-all ${
              activeModule === 'mushroom'
                ? 'bg-slate-800 text-white shadow-md scale-100'
                : 'bg-slate-50 border border-slate-200 text-slate-400 scale-95 hover:scale-100'
            }`}
          >
            <Trees size={18} className="text-purple-400" />
            <span className="text-sm font-bold">Mushroom Farm</span>
            <Lock size={12} className="ml-1 opacity-50" />
          </button>

          <button
            onClick={() => setActiveModule('analytics')}
            className={`flex shrink-0 snap-start items-center gap-2 rounded-2xl px-4 py-3 transition-all ${
              activeModule === 'analytics'
                ? 'bg-emerald-600 text-white shadow-md scale-100'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-600 scale-95 hover:scale-100'
            }`}
          >
            <TrendingUp size={18} className={activeModule === 'analytics' ? 'text-emerald-200' : 'text-emerald-500'} />
            <span className="text-sm font-bold uppercase tracking-wider">AI Yield Analytics</span>
          </button>
        </div>

        {/* Module Content Area */}
        <div className="mt-2 min-h-[300px]">
          {activeModule === 'smart-field' && (
            <div className="space-y-4 animate-fade-in-up">
              {zoneEntries.map(([zoneId, zone]) => (
                <ZoneCard
                  key={zoneId}
                  zoneId={zoneId}
                  zone={zone}
                  language={language}
                  units={units}
                  onManualOpen={() => setManualSheetZone(zoneId)}
                  onWater={() => setConfirmZone({ zoneId, zone })}
                  onStop={() => stopIrrigation(zoneId)}
                  onView={() => navigate(`/zone/${zoneId}`)}
                />
              ))}
              
              {zoneEntries.map(([zoneId, zone]) => (
                <AnimalRiskCard 
                  key={`animal-${zoneId}`}
                  zone={zone}
                  weather={weather}
                  onClick={() => navigate('/animal-protection')}
                />
              ))}
            </div>
          )}

          {activeModule === 'fertigation' && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 mb-4">
                <p className="text-sm text-blue-800 font-medium">
                  <strong>Precision Fertigation Hub.</strong> Control your Tank A (Nitrogen), Tank B (Phosphorus), and Tank C (Potassium) injection systems below. 
                </p>
              </div>
              {zoneEntries.map(([zoneId]) => (
                <FertigationPanel
                  key={zoneId}
                  zoneId={zoneId}
                  onStart={() => mqtt.publishFertigation(zoneId, true, 'home')}
                  onStop={() => mqtt.publishFertigation(zoneId, false, 'home')}
                />
              ))}
            </div>
          )}

          {activeModule === 'analytics' && (
            <YieldAnalytics />
          )}

          {['polyhouse', 'aquaponics', 'mushroom'].includes(activeModule) && (
            <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center animate-fade-in-up h-[300px]">
              <Lock size={48} className="mb-4 text-slate-300" />
              <h3 className="text-xl font-black text-slate-700 capitalize">{activeModule} Module</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-[250px]">
                This module is part of KrishiSarth Phase 3 Future Scope. Hardware integration pending.
              </p>
              <span className="mt-6 rounded-full bg-slate-800 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-md">
                Coming Soon
              </span>
            </div>
          )}
        </div>
      </div>

      {/* AI Water Schedule — 7-day prediction powered by RL + moisture forecast */}
      <div className="mt-8">
        <WaterScheduleCard />
      </div>

      <div className="mt-4">
        <SolarDashboardCard onClick={() => navigate('/solar-intelligence')} />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-black text-text-primary">
          {localize({ hi: 'त्वरित सेवाएं', mr: 'त्वरित सेवा', en: 'Quick services' }, language)}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {features.mandiEnabled && (
            <QuickCard
              icon={<Newspaper size={22} className="text-violet-700" />}
              title={localize({ hi: 'मंडी भाव', mr: 'मंडी भाव', en: 'Mandi prices' }, language)}
              subtitle={localize({ hi: 'आज के ताज़ा रेट', mr: 'आजचे ताजे दर', en: "Today's live rates" }, language)}
              colorClass="bg-violet-100"
              onClick={() => navigate('/mandi')}
            />
          )}
          {features.scannerEnabled && (
            <QuickCard
              icon={<ScanSearch size={22} className="text-amber-700" />}
              title={localize({ hi: 'फसल स्कैन', mr: 'पीक स्कॅन', en: 'Crop scan' }, language)}
              subtitle={localize({ hi: 'कीट और रोग पहचान', mr: 'कीड आणि रोग ओळख', en: 'Pest and disease detection' }, language)}
              colorClass="bg-orange-100"
              onClick={() => navigate('/scanner')}
            />
          )}
          <QuickCard
            icon={<CircleAlert size={22} className="text-sky-700" />}
            title={localize({ hi: 'सरकारी योजनाएं', mr: 'सरकारी योजना', en: 'Government schemes' }, language)}
            subtitle={localize({ hi: 'PM Kisan, MSP, बीमा', mr: 'PM Kisan, MSP, विमा', en: 'PM Kisan, MSP, insurance' }, language)}
            colorClass="bg-sky-100"
            onClick={() => navigate('/schemes')}
          />
          <QuickCard
            icon={<MessageSquareText size={22} className="text-emerald-700" />}
            title="Krishi AI"
            subtitle={localize({ hi: 'बोलकर या लिखकर पूछें', mr: 'बोलून किंवा लिहून विचारा', en: 'Talk or type naturally' }, language)}
            colorClass="bg-emerald-100"
            onClick={() => navigate('/chat')}
          />
          <QuickCard
            icon={<MapIcon size={22} className="text-lime-700" />}
            title={localize({ hi: 'जियो फार्म', mr: 'जिओ फार्म', en: 'GeoFarm' }, language)}
            subtitle={localize({ hi: 'नक्शा और AI', mr: 'नकाशा आणि AI', en: 'Map & Agronomy' }, language)}
            colorClass="bg-lime-100"
            onClick={() => navigate('/geofarm')}
          />
        </div>
      </div>

      {features.mandiEnabled && (
        <div className="mt-6">
          <MandiTicker language={language} />
        </div>
      )}

      {showAddZone ? <AddZoneSheet onClose={() => setShowAddZone(false)} /> : null}
      {manualSheetZone ? <ManualEntrySheet zoneId={manualSheetZone} onClose={() => setManualSheetZone(null)} /> : null}
      {confirmZone ? (
        <WaterNowConfirm
          zoneId={confirmZone.zoneId}
          zoneName={confirmZone.zone.name}
          moisture={confirmZone.zone.moisture}
          onConfirm={() => {
            runWaterAction(confirmZone.zoneId);
            setConfirmZone(null);
          }}
          onCancel={() => setConfirmZone(null)}
        />
      ) : null}
    </div>
  );
}
