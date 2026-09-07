import { useTranslation } from 'react-i18next';
import { useZoneStore } from '../../store/zoneStore.js';
import { Cloud, Thermometer, Droplets, AlertTriangle } from 'lucide-react';

export default function WeatherStrip() {
  const { t } = useTranslation();
  const weather = useZoneStore((s) => s.weather);

  const rainHigh = weather.rainProb >= 60;
  const rainMed  = weather.rainProb >= 30;

  return (
    <div className="px-4">
      {rainHigh && (
        <div className="flex items-center gap-2 bg-water bg-opacity-10 border border-water border-opacity-30 rounded-xl px-3 py-2.5 mb-2 animate-fade-in">
          <AlertTriangle size={16} className="text-water flex-shrink-0" />
          <span className="text-small text-water font-semibold">
            {t('weather.rainWarning', { prob: Math.round(weather.rainProb) })}
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex items-center gap-1.5 bg-white rounded-xl px-3 py-2 shadow-card flex-1">
          <Thermometer size={16} className="text-danger" />
          <div>
            <p className="text-xs text-text-secondary">{t('weather.temp')}</p>
            <p className="font-bold text-text-primary text-sm">{weather.temp}{t('weather.tempUnit')}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-white rounded-xl px-3 py-2 shadow-card flex-1">
          <Droplets size={16} className="text-water" />
          <div>
            <p className="text-xs text-text-secondary">{t('weather.humidity')}</p>
            <p className="font-bold text-text-primary text-sm">{weather.humidity}%</p>
          </div>
        </div>

        <div className={`flex items-center gap-1.5 rounded-xl px-3 py-2 shadow-card flex-1 ${
          rainHigh ? 'bg-water bg-opacity-15' : rainMed ? 'bg-blue-50' : 'bg-white'
        }`}>
          <Cloud size={16} className={rainHigh ? 'text-water' : 'text-text-secondary'} />
          <div>
            <p className="text-xs text-text-secondary">{t('weather.rainProb')}</p>
            <p className={`font-bold text-sm ${rainHigh ? 'text-water' : 'text-text-primary'}`}>
              {Math.round(weather.rainProb)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
