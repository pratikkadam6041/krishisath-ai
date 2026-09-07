import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, Info, Zap } from 'lucide-react';
import { useAlertStore } from '../../store/alertStore.js';

const ICONS = {
  critical: Zap,
  warning:  AlertTriangle,
  info:     Info,
};

const COLORS = {
  critical: { bg: 'bg-danger',     text: 'text-white',      btn: 'bg-white text-danger' },
  warning:  { bg: 'bg-accent-amber', text: 'text-gray-900',  btn: 'bg-white text-accent-amber-dark' },
  info:     { bg: 'bg-water',      text: 'text-white',      btn: 'bg-white text-water' },
};

export default function AlertBanner() {
  const { t } = useTranslation();
  const alerts = useAlertStore((s) => s.alerts);
  const critical = alerts.filter(a => !a.dismissed && a.type === 'critical');
  const dismissAlert = useAlertStore((s) => s.dismissAlert);

  if (!critical.length) return null;

  const alert = critical[0]; // Show most recent critical
  const Icon = ICONS[alert.type] || Info;
  const colors = COLORS[alert.type] || COLORS.info;

  return (
    <div
      className={`alert-in w-full ${colors.bg} ${colors.text} px-4 py-3 flex items-center gap-3`}
      role="alert"
      id={`alert-banner-${alert.id}`}
    >
      <Icon size={20} className="flex-shrink-0" />
      <span className="flex-1 text-sm font-semibold leading-snug">
        {t(alert.messageKey, alert.params)}
      </span>
      <button
        onClick={() => dismissAlert(alert.id)}
        className={`${colors.btn} rounded-full p-1 flex-shrink-0 touch-target`}
        style={{ minHeight: 32, minWidth: 32 }}
        aria-label={t('alert.dismiss')}
        id={`dismiss-alert-${alert.id}`}
      >
        <X size={14} />
      </button>
    </div>
  );
}
