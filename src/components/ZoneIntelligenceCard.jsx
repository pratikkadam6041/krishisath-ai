import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useZoneStore } from '../store/zoneStore.js';
import { Star, ShieldAlert, Droplets, ThermometerSun, Leaf, Activity } from 'lucide-react';
import { calculateZoneHealth } from '../ai-ml/zoneIntelligence.js';

export default function ZoneIntelligenceCard({ zone, weather, onClick }) {
    const { t, i18n } = useTranslation();
    const { weatherCache } = useZoneStore();
    
    // Default to the provided weather or the cached one
    const currentWeather = weather || weatherCache;

    // We can compute the health score right here
    const health = calculateZoneHealth(zone, currentWeather);
    
    if (!health) {
        return null;
    }

    const { score, grade, textClass, bgClass, borderClass } = health;

    const getZoneName = (z) => {
        return z[`name${i18n.language.charAt(0).toUpperCase()}${i18n.language.slice(1)}`] || z.name;
    };

    return (
        <div 
            onClick={onClick}
            className={`rounded-2xl border ${borderClass} ${bgClass} p-4 mt-4 shadow-sm cursor-pointer transition-transform active:scale-95`}
        >
            <div className="flex justify-between items-start mb-3">
                <div>
                     <h3 className={`font-bold ${textClass} flex items-center gap-2`}>
                          <Star size={16} />
                          {getZoneName(zone)} - Intelligence
                     </h3>
                     <p className="text-xs opacity-70 mt-0.5">Overall Health & AI Insights</p>
                </div>
                <div className={`px-2 py-1 rounded-xl text-xs font-black shadow-sm flex flex-col items-center justify-center ${
                     grade === 'A' ? 'bg-green-500 text-white' : 
                     grade === 'B' ? 'bg-lime-500 text-white' : 
                     grade === 'C' ? 'bg-amber-500 text-white' : 
                     'bg-red-500 text-white'
                }`}>
                    <span className="text-sm">{grade}</span>
                    <span className="text-[10px]">{score}/100</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
                 <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-black/5 dark:border-white/5">
                      <Droplets size={14} className="text-blue-500" />
                      <div className="flex flex-col text-xs">
                          <span className="opacity-70">Moisture</span>
                          <span className="font-semibold">{zone.moisture}%</span>
                      </div>
                 </div>
                 <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-black/5 dark:border-white/5">
                      <ThermometerSun size={14} className="text-orange-500" />
                      <div className="flex flex-col text-xs">
                          <span className="opacity-70">Temp</span>
                          <span className="font-semibold">{zone.temperature}°C</span>
                      </div>
                 </div>
                 <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-black/5 dark:border-white/5">
                      <Leaf size={14} className="text-green-500" />
                      <div className="flex flex-col text-xs">
                          <span className="opacity-70">Crop Stage</span>
                          <span className="font-semibold capitalize">{zone.cropStage || 'growing'}</span>
                      </div>
                 </div>
                 <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-black/5 dark:border-white/5">
                      <Activity size={14} className="text-purple-500" />
                      <div className="flex flex-col text-xs">
                          <span className="opacity-70">Action</span>
                          <span className="font-semibold">{zone.pumpOn ? 'Irrigating' : 'Idle'}</span>
                      </div>
                 </div>
            </div>

            <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                 <span className="text-blue-600 dark:text-blue-400 font-medium">
                     View AI Action Plan →
                 </span>
            </div>
        </div>
    );
}
