import { useMemo } from 'react';
import { AlertTriangle, Info, Zap, CheckCircle2, Trash2, Bug, Brain, MapPin } from 'lucide-react';
import { useAlertStore } from '../store/alertStore.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { getPestOutbreakWarnings, buildOutbreakNotification } from '../ai-ml/pestOutbreakWarning.js';
import { localize } from '../utils/formatters.js';

const ICONS = { critical: Zap, warning: AlertTriangle, info: Info, anomaly: Zap, pest: Bug };
const SEVERITY_COLORS = {
  critical: 'border-red-400 bg-red-50',
  high: 'border-orange-400 bg-orange-50',
  medium: 'border-amber-400 bg-amber-50',
};

function PestOutbreakCard({ warning, language }) {
  const addNotification = useNotificationStore((s) => s.addNotification);

  return (
    <div className={`rounded-[24px] border-l-4 p-4 ${SEVERITY_COLORS[warning.risk] || SEVERITY_COLORS.medium}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] bg-orange-100">
          <Bug size={18} className="text-orange-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-text-primary">
              {warning.pest}
            </p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
              warning.risk === 'critical' ? 'bg-red-100 text-red-700' :
              warning.risk === 'high' ? 'bg-orange-100 text-orange-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              {warning.risk}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            {localize({ hi: `${warning.daysWarning} दिन में खतरा`, mr: `${warning.daysWarning} दिवसांत धोका`, en: `Risk in ${warning.daysWarning} days` }, language)}
            {' · '}{warning.cropType}
          </p>
          <p className="mt-2 text-xs text-text-secondary leading-relaxed">{warning.action}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <Brain size={10} className="text-[#1a3d1a]" />
            <span className="text-[10px] font-bold text-[#1a3d1a] uppercase tracking-wide">
              AI Outbreak Model · {warning.riskScore}% risk
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlertScreen() {
  const language = useSettingsStore((s) => s.language);
  const zones = useZoneStore((s) => s.zones);
  const district = useZoneStore((s) => s.district);
  const state = useZoneStore((s) => s.state);
  const weatherCache = useZoneStore((s) => s.weatherCache);

  let alerts = [], dismissAlert = () => {}, clearAlert = () => {}, dismissAll = () => {};
  try {
    const alertStore = useAlertStore((s) => s);
    alerts = alertStore.alerts || [];
    dismissAlert = alertStore.dismissAlert || dismissAlert;
    clearAlert = alertStore.clearAlert || clearAlert;
    dismissAll = alertStore.dismissAll || dismissAll;
  } catch (_) {}

  // Generate real pest outbreak warnings from AI model
  const pestWarnings = useMemo(() => {
    const warnings = [];
    Object.values(zones).forEach((zone) => {
      if (!zone || !zone.cropType) return;
      const zoneWarnings = getPestOutbreakWarnings({
        cropType: zone.cropType,
        temperature: zone.temperature ?? weatherCache?.temp ?? 28,
        humidity: zone.humidity ?? weatherCache?.humidity ?? 60,
        district: district || 'Pune',
        state: state || 'Maharashtra',
        language,
      });
      zoneWarnings.forEach((w) => warnings.push({ ...w, zoneName: zone.name, zoneId: zone.id }));
    });
    // Deduplicate by pest name
    const seen = new Set();
    return warnings.filter((w) => {
      const key = `${w.pestEn}-${w.cropType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [zones, weatherCache, district, state, language]);

  const hasContent = alerts.length > 0 || pestWarnings.length > 0;

  return (
    <div className="min-h-screen bg-[#f4f7f1]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-white/95 px-4 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-black leading-none text-text-primary">
              {localize({ hi: 'अलर्ट', mr: 'अलर्ट', en: 'Alerts' }, language)}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {localize({ hi: 'AI द्वारा स्मार्ट चेतावनियां', mr: 'AI द्वारे स्मार्ट इशारे', en: 'AI-powered smart warnings' }, language)}
            </p>
          </div>
          {alerts.length > 0 && (
            <button
              onClick={dismissAll}
              className="rounded-full bg-[#edf6ec] px-3 py-2 text-xs font-black text-[#1a3d1a]"
            >
              {localize({ hi: 'सब खारिज', mr: 'सर्व बंद', en: 'Dismiss all' }, language)}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-8 pt-4 space-y-4">
        {/* Pest Outbreak Warnings from AI */}
        {pestWarnings.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-100">
                <Bug size={14} className="text-orange-600" />
              </div>
              <h2 className="text-sm font-black text-text-primary">
                {localize({ hi: 'कीट प्रकोप चेतावनी', mr: 'कीड उद्रेक इशारा', en: 'Pest Outbreak Warnings' }, language)}
              </h2>
              <div className="flex items-center gap-1 rounded-full bg-[#edf6ec] px-2 py-0.5">
                <Brain size={10} className="text-[#1a3d1a]" />
                <span className="text-[10px] font-black text-[#1a3d1a]">AI</span>
              </div>
            </div>
            <div className="space-y-3">
              {pestWarnings.map((w, i) => (
                <PestOutbreakCard key={`${w.pestEn}-${i}`} warning={w} language={language} />
              ))}
            </div>
          </div>
        )}

        {/* Location context */}
        {district && (
          <div className="flex items-center gap-2 rounded-[20px] bg-white px-4 py-3 border border-border">
            <MapPin size={14} className="text-[#1a3d1a]" />
            <p className="text-xs text-text-secondary">
              {localize({ hi: 'आपका क्षेत्र', mr: 'तुमचा परिसर', en: 'Your region' }, language)}:{' '}
              <span className="font-black text-text-primary">{district}, {state}</span>
            </p>
          </div>
        )}

        {/* System alerts from alertStore */}
        {alerts.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-black text-text-primary">
              {localize({ hi: 'सिस्टम अलर्ट', mr: 'सिस्टम अलर्ट', en: 'System Alerts' }, language)}
            </h2>
            <div className="space-y-3">
              {alerts.map((a) => {
                const Icon = ICONS[a.type] || Info;
                return (
                  <div
                    key={a.id}
                    className={`rounded-[24px] border border-border bg-white p-4 shadow-sm ${a.dismissed ? 'opacity-60 grayscale' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] bg-[#f7faf5]">
                        <Icon size={18} className="text-[#1a3d1a]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-text-primary leading-snug">
                          {a.messageKey || a.title || a.message}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div>
                        {!a.dismissed ? (
                          <button
                            onClick={() => dismissAlert(a.id)}
                            className="rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-text-secondary"
                          >
                            {localize({ hi: 'खारिज', mr: 'बंद', en: 'Dismiss' }, language)}
                          </button>
                        ) : (
                          <button onClick={() => clearAlert(a.id)} className="p-1.5 text-red-400">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!hasContent && (
          <div className="flex flex-col items-center justify-center rounded-[28px] border border-border bg-white py-16 text-center">
            <CheckCircle2 size={48} className="text-emerald-400 mb-4" />
            <p className="text-lg font-black text-text-primary">
              {localize({ hi: 'सब कुछ ठीक है!', mr: 'सर्व काही ठीक आहे!', en: 'All clear!' }, language)}
            </p>
            <p className="mt-2 text-sm text-text-secondary max-w-xs">
              {localize({ hi: 'कोई सक्रिय अलर्ट नहीं। AI निगरानी जारी है।', mr: 'कोणताही सक्रिय अलर्ट नाही. AI देखरेख सुरू आहे.', en: 'No active alerts. AI is monitoring your farm.' }, language)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
