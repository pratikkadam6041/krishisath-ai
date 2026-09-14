import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSolarStore } from '../store/solarStore.js';
import { X, Save } from 'lucide-react';

export default function SolarConfigSheet({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { 
      panelCapacity, 
      batteryCapacity, 
      solarAwareIrrigation, 
      setSolarConfig, 
      toggleSolarAware 
  } = useSolarStore();
  
  const [tempPanel, setTempPanel] = React.useState(panelCapacity);
  const [tempBattery, setTempBattery] = React.useState(batteryCapacity);
  
  // Sync state when opened
  React.useEffect(() => {
      setTempPanel(panelCapacity);
      setTempBattery(batteryCapacity);
  }, [isOpen, panelCapacity, batteryCapacity]);

  if (!isOpen) return null;

  const handleSave = (e) => {
      e.preventDefault();
      setSolarConfig(Number(tempPanel), Number(tempBattery));
      onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div 
        className="w-full bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl max-w-md p-6 animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold dark:text-white">
            {t('solar.configHeading')}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 opacity-70 dark:text-white">{t('solar.panelCapacity')}</label>
            <input 
              type="number"
              min="0"
              step="0.5"
              value={tempPanel}
              onChange={(e) => setTempPanel(e.target.value)}
              className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 opacity-70 dark:text-white">{t('solar.batteryCapacity')}</label>
            <input 
              type="number"
              min="0"
              step="0.5"
              value={tempBattery}
              onChange={(e) => setTempBattery(e.target.value)}
              className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
              <div>
                  <p className="font-bold text-amber-900 dark:text-amber-100">{t('solar.solarAwareToggle')}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 max-w-[200px]">Prioritize irrigation during peak solar hours.</p>
              </div>
              <button
                  type="button"
                  onClick={toggleSolarAware}
                  className={`w-12 h-6 rounded-full transition-colors relative ${solarAwareIrrigation ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-700'}`}
              >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${solarAwareIrrigation ? 'left-7' : 'left-1'}`} />
              </button>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm"
          >
            <Save size={18} />
            Save Configuration
          </button>
        </form>
      </div>
    </div>
  );
}
