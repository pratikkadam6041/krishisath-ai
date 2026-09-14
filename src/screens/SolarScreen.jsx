import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Sun, Battery, Settings, Zap, Clock } from 'lucide-react';
import { useSolarStore } from '../store/solarStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { estimateSolarGeneration } from '../ai-ml/solarEstimator.js';
import SolarConfigSheet from '../components/SolarConfigSheet.jsx';

export default function SolarScreen() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { weatherCache } = useZoneStore();
    const { 
        panelCapacity, 
        batteryCapacity, 
        solarAwareIrrigation, 
        estimatedGeneration,
        updateEstimatedGeneration 
    } = useSolarStore();
    
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    // Update estimation periodically
    useEffect(() => {
        if (panelCapacity > 0) {
            const currentHour = new Date().getHours();
            const est = estimateSolarGeneration(weatherCache, currentHour, panelCapacity);
            updateEstimatedGeneration(est);
        }
    }, [weatherCache, panelCapacity, updateEstimatedGeneration]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20">
                <div className="flex items-center p-4">
                    <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold dark:text-white flex-1">{t('solar.title')}</h1>
                    <button onClick={() => setIsConfigOpen(true)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white">
                        <Settings size={22} className="text-amber-500" />
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-6 max-w-3xl mx-auto">
                {/* Main Hero Card */}
                <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden text-center">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                    <Sun size={64} className="mx-auto mb-4 opacity-90 animate-spin-slow" style={{ animationDuration: '30s' }} />
                    <p className="text-amber-100 font-bold uppercase tracking-widest text-xs mb-1">Current Output</p>
                    <h2 className="text-5xl font-black mb-2">{estimatedGeneration} <span className="text-xl opacity-80">kWh</span></h2>
                    
                    <div className="flex items-center justify-center gap-6 mt-6 bg-black/10 rounded-xl p-3 backdrop-blur-sm">
                         <div className="text-center">
                             <p className="text-xs uppercase opacity-80">System</p>
                             <p className="font-bold">{panelCapacity} kW</p>
                         </div>
                         <div className="w-px h-8 bg-white/20" />
                         <div className="text-center">
                             <p className="text-xs uppercase opacity-80">Status</p>
                             <p className="font-bold">{weatherCache?.condition || 'Sunny'}</p>
                         </div>
                    </div>
                </div>

                {/* Automation Status */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                            <Zap size={20} className="text-amber-500" /> 
                            Smart Integration
                        </h3>
                        <div className={`px-2 py-1 rounded-md text-xs font-bold ${solarAwareIrrigation ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {solarAwareIrrigation ? 'ACTIVE' : 'INACTIVE'}
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {solarAwareIrrigation 
                            ? "Solar-Aware Irrigation is ON. The system will prioritize watering during peak sunlight hours to align energy consumption with generation, reducing utility grid costs." 
                            : "Solar-Aware Irrigation is currently disabled. Pumping will operate strictly on time-based schedules without considering solar generation peaks."
                        }
                    </p>
                </div>
                
                {/* Predictions */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                     <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                         <Clock size={20} className="text-blue-500" />
                         Generation Forecast
                     </h3>
                     
                     {/* Horizontal timeline of the day (simplified) */}
                     <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                         {weatherCache?.forecast7d?.slice(0, 5).map((f, i) => {
                             // Mock varying generation based on rain prob and base capacity
                             const generationFactor = f.rainProb > 40 ? 0.3 : (f.rainProb > 20 ? 0.7 : 1);
                             const maxPossible = panelCapacity * 5; // roughly 5 peak sun hours
                             const dailyEst = (maxPossible * generationFactor).toFixed(1);
                             
                             return (
                                 <div key={i} className="min-w-[80px] bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center flex flex-col items-center">
                                     <p className="text-xs font-bold dark:text-gray-300">
                                        {i === 0 ? 'Today' : new Date(f.date).toLocaleDateString('en-US', {weekday: 'short'})}
                                     </p>
                                     <Sun size={20} className={`my-2 ${f.rainProb > 40 ? 'text-gray-400' : 'text-amber-500'}`} />
                                     <p className="font-black text-sm text-gray-800 dark:text-white">{dailyEst}</p>
                                     <p className="text-[10px] text-gray-500">kWh</p>
                                 </div>
                             );
                         })}
                     </div>
                </div>
            </div>

            <SolarConfigSheet isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
        </div>
    );
}
