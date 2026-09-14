import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Battery, Activity } from 'lucide-react';
import { useSolarStore } from '../store/solarStore.js';

export default function SolarDashboardCard({ onClick }) {
    const { t } = useTranslation();
    const { panelCapacity, batteryCapacity, estimatedGeneration } = useSolarStore();

    // If no panel configured, user hasn't set up solar yet
    if (panelCapacity === 0) {
        return (
            <div 
                onClick={onClick}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mt-4 cursor-pointer hover:bg-gray-50 flex items-center gap-4 transition-transform active:scale-95"
            >
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center text-amber-500">
                     <Sun size={24} />
                </div>
                <div>
                     <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('solar.title')}</h3>
                     <p className="text-sm text-gray-500">Enable solar-aware irrigation and predictions.</p>
                </div>
            </div>
        );
    }

    // Solar is configured
    return (
        <div 
            onClick={onClick}
            className="group rounded-[26px] border border-amber-200 bg-gradient-to-br from-white to-amber-50 p-4 mt-4 shadow-sm cursor-pointer transition-transform active:scale-95 dark:from-gray-800 dark:to-gray-800 dark:border-amber-900/40 relative overflow-hidden"
        >
            <div className="absolute bottom-0 left-0 top-0 w-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-amber-400" />
            
            <div className="flex justify-between items-center mb-4 relative z-10">
                <div className="flex items-center gap-2">
                     <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center text-amber-600">
                          <Sun size={20} />
                     </div>
                     <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('solar.title')}</h3>
                </div>
                <div className="px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:border-amber-700/50 dark:text-amber-300">
                     {panelCapacity} kW
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                     <Activity className="text-orange-500" size={18} />
                     <div>
                         <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{t('solar.currentGen')}</p>
                         <p className="font-black text-gray-800 dark:text-gray-100">{estimatedGeneration} kWh</p>
                     </div>
                </div>
                <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                     <Battery className="text-green-500" size={18} />
                     <div>
                         <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{t('solar.batteryEst')}</p>
                         <p className="font-black text-gray-800 dark:text-gray-100">{batteryCapacity} kWh (Max)</p>
                     </div>
                </div>
            </div>
            
            <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-amber-100 dark:border-amber-900/30">
                 <span className="text-amber-600 dark:text-amber-400 font-medium">
                     View Solar Configurations →
                 </span>
            </div>
        </div>
    );
}
