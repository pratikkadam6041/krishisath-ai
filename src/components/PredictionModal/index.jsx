import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, Droplets, Zap, Clock, Leaf } from 'lucide-react';

export default function PredictionModal({ prediction, pending, onConfirm, onCancel, onDurationChange }) {
  const { t } = useTranslation();
  if (!prediction || !pending) return null;

  const { moistureBefore, moistureAfter, waterLitres, electricKwh, totalCost, timeToOptimalH, warnings } = prediction;
  const { zoneId, device } = pending;

  const rainWarn = warnings?.find((w) => w.type === 'rain');
  const overWarn = warnings?.find((w) => w.type === 'overwater');

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" id="prediction-modal">
      <div className="modal-sheet">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Leaf size={20} className="text-primary" />
            <h3 className="text-subheading">{t('prediction.title')}</h3>
          </div>
          <button
            id="prediction-modal-close"
            onClick={onCancel}
            className="touch-target rounded-full p-2 hover:bg-bg"
            style={{ minHeight: 40, minWidth: 40 }}
            aria-label={t('prediction.cancel')}
          >
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        {/* Subtitle */}
        <p className="text-small text-text-secondary mb-4">
          {t('prediction.subtitle', {
            zone: t(`zone.${zoneId}`), device: t(`hardware.${device}`),
            duration: 2, timeUnit: t('prediction.hours'),
          })}
        </p>

        {/* Duration slider */}
        {(device === 'pump' || device === 'valve') && (
          <div className="mb-4">
            <label className="section-label block mb-2">{t('prediction.duration')}</label>
            <input
              id="prediction-duration-slider"
              type="range" min="0.5" max="6" step="0.5"
              defaultValue={2}
              onChange={(e) => onDurationChange?.(parseFloat(e.target.value))}
              className="w-full accent-primary h-2"
            />
            <div className="flex justify-between text-xs text-text-secondary mt-1">
              <span>0.5 {t('prediction.hours')}</span>
              <span>6 {t('prediction.hours')}</span>
            </div>
          </div>
        )}

        {/* Outcome rows */}
        <div className="space-y-3 mb-4">
          {[
            {
              icon: <Droplets size={16} className="text-water" />,
              label: t('prediction.moistureChange'),
              value: `${moistureBefore}% → ${moistureAfter}% (${t('prediction.predicted')})`,
              color: 'text-water',
            },
            {
              icon: <Droplets size={16} className="text-primary" />,
              label: t('prediction.waterVolume'),
              value: `~${waterLitres} ${t('prediction.litres')}`,
              color: 'text-primary',
            },
            {
              icon: <Zap size={16} className="text-accent-amber" />,
              label: t('prediction.electricity'),
              value: `~${electricKwh} ${t('prediction.kwh')}`,
              color: 'text-accent-amber-dark',
            },
            {
              icon: <span className="text-sm font-bold text-primary">₹</span>,
              label: t('prediction.cost'),
              value: `~₹${totalCost}`,
              color: 'text-primary',
            },
            timeToOptimalH ? {
              icon: <Clock size={16} className="text-text-secondary" />,
              label: t('prediction.timeToOptimal'),
              value: `${timeToOptimalH} ${t('prediction.hours')}`,
              color: 'text-text-primary',
            } : null,
          ].filter(Boolean).map((row, i) => (
            <div key={i} className="outcome-row flex items-center gap-3 p-3 bg-bg rounded-xl">
              <span className="flex-shrink-0">{row.icon}</span>
              <span className="text-small text-text-secondary flex-1">{row.label}</span>
              <span className={`font-semibold text-sm ${row.color}`}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Warnings */}
        {(rainWarn || overWarn) && (
          <div className="bg-accent-amber bg-opacity-15 border border-accent-amber border-opacity-40 rounded-xl p-3 mb-4 flex items-start gap-2">
            <AlertTriangle size={16} className="text-accent-amber-dark flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              {rainWarn && (
                <p className="text-small font-semibold text-accent-amber-dark">
                  {t('prediction.rainWarning', { hours: rainWarn.hoursUntilRain ?? 4 })}
                </p>
              )}
              {overWarn && (
                <p className="text-small text-accent-amber-dark">{t('prediction.overwaterWarning')}</p>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            id="prediction-cancel-btn"
            onClick={onCancel}
            className="flex-1 touch-target flex items-center justify-center rounded-xl border-2 border-border text-text-secondary font-semibold text-sm hover:bg-bg transition-colors"
            style={{ minHeight: 52 }}
          >
            {t('prediction.cancel')}
          </button>
          <button
            id="prediction-execute-btn"
            onClick={onConfirm}
            className="flex-1 touch-target flex items-center justify-center rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors active:scale-95 shadow-sm"
            style={{ minHeight: 52 }}
          >
            {t('prediction.execute')}
          </button>
        </div>
      </div>
    </div>
  );
}
