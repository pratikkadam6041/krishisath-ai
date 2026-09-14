import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Newspaper, ChevronRight, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { useZoneStore } from '../store/zoneStore.js';
import { useAnimalProtectionStore } from '../store/animalProtectionStore.js';
import { generateDailyBrief } from '../ai-ml/dailyBriefEngine.js';

export default function DailyBriefCard({ onClick }) {
    const { t, i18n } = useTranslation();
    const { zones, weatherCache } = useZoneStore();
    const { riskAssessments } = useAnimalProtectionStore();
    
    const [brief, setBrief] = useState(null);

    useEffect(() => {
        if (Object.keys(zones).length > 0 && weatherCache) {
            const data = generateDailyBrief(zones, weatherCache, riskAssessments);
            setBrief(data);
        }
    }, [zones, weatherCache, riskAssessments]);

    if (!brief) return null;

    return (
        <div 
            onClick={onClick}
            className="group rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-800 p-5 mt-2 mb-6 shadow-lg text-white relative overflow-hidden cursor-pointer transition-transform active:scale-[0.98]"
        >
            {/* Background design */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-900 opacity-20 rounded-full -ml-10 -mb-10" />
            
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                            <Newspaper size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">{t('dailyBrief.title')}</h3>
                            <p className="text-xs text-indigo-200">KrishiSarth AI Summary</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
                        <ChevronRight size={20} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                     <div className="bg-black/10 rounded-2xl p-3 border border-white/10">
                          <p className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider flex items-center gap-1 mb-1">
                               <Activity size={12} /> {t('dailyBrief.overallHealth')}
                          </p>
                          <p className="font-black text-2xl">{brief.overallHealth}/100</p>
                     </div>
                     <div className="bg-black/10 rounded-2xl p-3 border border-white/10">
                          <p className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider flex items-center gap-1 mb-1">
                               <TrendingUp size={12} /> Crop Stage
                          </p>
                          <p className="font-bold text-sm leading-tight capitalize">{brief.dominantStage || 'Growing'}</p>
                     </div>
                </div>

                <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm border border-white/20">
                     <p className="text-xs font-bold text-indigo-100 flex items-center gap-1 mb-2">
                         <AlertCircle size={14} /> {t('dailyBrief.actionItems')}
                     </p>
                     <ul className="text-sm space-y-1.5">
                         {brief.actionItems.slice(0, 2).map((item, idx) => (
                             <li key={idx} className="flex items-start gap-2">
                                 <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 mt-1.5 shrink-0" />
                                 <span className="opacity-90">{item}</span>
                             </li>
                         ))}
                         {brief.actionItems.length === 0 && (
                             <li className="text-indigo-200 italic">No urgent actions required today.</li>
                         )}
                     </ul>
                </div>
            </div>
        </div>
    );
}
