import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Shield, AlertTriangle, AlertOctagon, Info, Clock, CheckCircle } from 'lucide-react';
import { useZoneStore } from '../store/zoneStore.js';
import { useAnimalProtectionStore } from '../store/animalProtectionStore.js';
import { calculateAnimalRisk } from '../ai-ml/animalRiskEngine.js';
import AnimalReportSheet from '../components/AnimalReportSheet.jsx';

export default function AnimalProtectionScreen() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { zones, weatherCache } = useZoneStore();
    const { protectionMode, setProtectionMode, incidents, riskAssessments, updateRiskAssessment } = useAnimalProtectionStore();
    
    const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);

    // Refresh assessments on mount
    useEffect(() => {
        Object.values(zones).forEach(zone => {
            const risk = calculateAnimalRisk(zone, weatherCache, new Date().getHours(), zone.cropStage || 'growing', incidents);
            updateRiskAssessment(zone.id, risk);
        });
    }, [zones, weatherCache, incidents, updateRiskAssessment]);

    const getZoneName = (zone) => {
        return zone[`name${i18n.language.charAt(0).toUpperCase()}${i18n.language.slice(1)}`] || zone.name;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20">
                <div className="flex items-center p-4">
                    <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold dark:text-white flex-1">{t('animalProtection.title')}</h1>
                    <Shield className="text-green-600 dark:text-green-400" size={24} />
                </div>
            </div>

            <div className="p-4 space-y-6 max-w-3xl mx-auto">
                {/* Mode Selector */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 dark:text-white">
                         <Shield size={20} className="text-blue-500" />
                         {t('animalProtection.mode')}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                            { key: 'OFF', labelKey: 'modeOff' },
                            { key: 'MANUAL', labelKey: 'modeManual' },
                            { key: 'AUTOMATIC', labelKey: 'modeAuto' },
                            { key: 'NIGHT_ONLY', labelKey: 'modeNight' }
                        ].map(item => (
                            <button
                                key={item.key}
                                onClick={() => setProtectionMode(item.key)}
                                className={`py-3 px-2 rounded-xl border text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center min-h-[44px] ${
                                    protectionMode === item.key 
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-400/40' 
                                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                <span className="truncate max-w-full">{t(`animalProtection.${item.labelKey}`)}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Risk Assessments per Zone */}
                <div>
                     <h2 className="text-lg font-bold mb-3 ml-1 dark:text-white">{t('animalProtection.riskOverview')}</h2>
                     <div className="space-y-4">
                         {Object.values(zones).map(zone => {
                             const risk = riskAssessments[zone.id];
                             if (!risk) return null;
                             
                             const isHighRisk = risk.level === 'HIGH' || risk.level === 'CRITICAL';
                             
                             return (
                                 <div key={zone.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                                     <div className="flex justify-between items-start mb-3">
                                         <div>
                                            <h3 className="font-bold text-lg dark:text-white">{getZoneName(zone)}</h3>
                                            <p className="text-sm opacity-70 dark:text-gray-400">Score: {risk.score}/100 • Predicted</p>
                                         </div>
                                         <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                                             isHighRisk ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                         }`}>
                                            {isHighRisk ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                                            {risk.level}
                                         </div>
                                     </div>
                                     
                                     {isHighRisk && (
                                         <div className="mt-3 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30 text-sm dark:text-red-200">
                                             <p><strong>{t('animalProtection.likelyThreats')}:</strong> {risk.likelyThreats.join(', ')}</p>
                                             <div className="mt-2 space-y-1">
                                                 {risk.reasons.map((r, i) => (
                                                     <div key={i} className="flex items-start gap-2 text-xs">
                                                        <Info size={14} className="mt-0.5 shrink-0" />
                                                        <span>{r.desc}</span>
                                                     </div>
                                                 ))}
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             );
                         })}
                     </div>
                </div>

                {/* Incident History */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2 dark:text-white">
                             <Clock size={20} className="text-gray-500" />
                             {t('animalProtection.recentIncidents')}
                        </h2>
                        <button 
                             onClick={() => setIsReportSheetOpen(true)}
                             className="text-sm text-green-600 font-semibold"
                        >
                            + {t('animalProtection.reportIncident')}
                        </button>
                    </div>
                    
                    {incidents.length === 0 ? (
                        <p className="text-gray-500 italic text-center py-4">{t('animalProtection.noIncidents')}</p>
                    ) : (
                        <div className="space-y-3">
                            {incidents.slice(0,5).map(inc => (
                                <div key={inc.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <AlertOctagon size={18} className="text-orange-500" />
                                        <div>
                                            <p className="font-semibold text-sm dark:text-white">{inc.animal}</p>
                                            <p className="text-xs text-gray-500">{zones[inc.zoneId]?.name || `Zone ${inc.zoneId}`}</p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {new Date(inc.timestamp).toLocaleDateString()} {new Date(inc.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <AnimalReportSheet 
                isOpen={isReportSheetOpen} 
                onClose={() => setIsReportSheetOpen(false)} 
            />
        </div>
    );
}
