import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

const STATUS_COLORS = {
  optimal:  { bg: '#E8F5E9', text: '#2E7D32', border: '#2E7D32' },
  low:      { bg: '#FFF8E1', text: '#F57F17', border: '#F9A825' },
  critical: { bg: '#FFEBEE', text: '#C62828', border: '#C62828' },
  high:     { bg: '#E1F5FE', text: '#0277BD', border: '#0277BD' },
  fault:    { bg: '#FAFAFA', text: '#555555', border: '#E0E0E0' },
};

export default function SensorTile({ id, label, value, unit, status = 'optimal', icon: Icon, trend }) {
  const { t } = useTranslation();
  const colors = STATUS_COLORS[status] || STATUS_COLORS.optimal;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div
      id={id}
      className="card p-3 flex flex-col gap-1"
      style={{ borderTop: `3px solid ${colors.border}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={15} style={{ color: colors.text }} />}
          <span className="section-label">{label}</span>
        </div>
        <span
          className="badge text-xs"
          style={{ background: colors.bg, color: colors.text }}
        >
          {t(`sensor.${status}`, { defaultValue: t(`zone.${status}`, { defaultValue: status }) })}
        </span>
      </div>

      <div className="flex items-end gap-1">
        <span className="font-bold text-2xl text-text-primary leading-none">
          {value ?? '--'}
        </span>
        <span className="text-small text-text-secondary mb-0.5">{unit}</span>
        {trend && (
          <TrendIcon
            size={14}
            className={`mb-0.5 ml-auto ${trend === 'up' ? 'text-primary' : trend === 'down' ? 'text-danger' : 'text-text-secondary'}`}
          />
        )}
      </div>
    </div>
  );
}
