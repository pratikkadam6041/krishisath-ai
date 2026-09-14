import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAnimalProtectionStore } from '../store/animalProtectionStore.js';
import { MapPin, AlertTriangle, Shield, CheckCircle } from 'lucide-react';

export default function AnimalRiskCard({ zone, weather, onClick }) {
  const { t, i18n } = useTranslation();
  const { riskAssessments, protectionMode } = useAnimalProtectionStore();
  
  // Use the cached assessment if available, otherwise just basic display
  const assessment = riskAssessments[zone.id];
  
  if (!assessment) {
    return null; // Don't show card if no assessment
  }
  
  const { score, level, likelyThreats } = assessment;
  
  let bgClass = 'bg-white dark:bg-gray-800';
  let borderClass = 'border-gray-200 dark:border-gray-700';
  let textClass = 'text-gray-800 dark:text-gray-100';
  let iconClass = 'text-gray-400';
  
  if (level === 'CRITICAL') {
      bgClass = 'bg-red-50 dark:bg-red-900/20';
      borderClass = 'border-red-200 dark:border-red-800';
      textClass = 'text-red-800 dark:text-red-300';
      iconClass = 'text-red-500';
  } else if (level === 'HIGH') {
      bgClass = 'bg-orange-50 dark:bg-orange-900/20';
      borderClass = 'border-orange-200 dark:border-orange-800';
      textClass = 'text-orange-800 dark:text-orange-300';
      iconClass = 'text-orange-500';
  } else if (level === 'MEDIUM') {
      bgClass = 'bg-yellow-50 dark:bg-yellow-900/20';
      borderClass = 'border-yellow-200 dark:border-yellow-800';
      textClass = 'text-yellow-800 dark:text-yellow-300';
      iconClass = 'text-yellow-500';
  } else {
      bgClass = 'bg-green-50 dark:bg-green-900/20';
      borderClass = 'border-green-200 dark:border-green-800';
      textClass = 'text-green-800 dark:text-green-300';
      iconClass = 'text-green-500';
  }

  // Get localized zone name helper
  const getZoneName = (zone) => {
    return zone[`name${i18n.language.charAt(0).toUpperCase()}${i18n.language.slice(1)}`] || zone.name;
  };
  
  const localizedZoneName = getZoneName(zone);

  return (
    <div 
      onClick={onClick}
      className={`rounded-2xl border ${borderClass} ${bgClass} p-4 mt-4 shadow-sm cursor-pointer transition-transform active:scale-95`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {level === 'LOW' ? (
              <CheckCircle className={`w-5 h-5 ${iconClass}`} />
          ) : (
              <AlertTriangle className={`w-5 h-5 ${iconClass}`} />
          )}
          <h3 className={`font-semibold ${textClass}`}>
             {t('animalProtection.title')} - {localizedZoneName}
          </h3>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-bold ${level === 'LOW' ? 'bg-green-100 text-green-700' : 'bg-white text-gray-800 shadow-sm border'}`}>
          {t('animalProtection.score')}: {score}
        </div>
      </div>
      
      {level !== 'LOW' && (
        <div className="text-sm opacity-80 mb-3 ml-7">
           <p className="font-medium">{t('animalProtection.level')}: {level}</p>
           {likelyThreats && likelyThreats.length > 0 && (
             <p className="mt-1">{t('animalProtection.likelyThreats')}: {likelyThreats.join(', ')}</p>
           )}
        </div>
      )}
      
      {(level === 'LOW') && (
          <div className="text-sm opacity-80 mb-3 ml-7">
            <p>Risk is currently low.</p>
          </div>
      )}

      <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-black/5 dark:border-white/5">
        <div className="flex items-center gap-1 opacity-60">
          <Shield className="w-3.5 h-3.5" />
          <span>{t('animalProtection.mode')}: {t(`animalProtection.mode${protectionMode.charAt(0).toUpperCase() + protectionMode.toLowerCase().slice(1)}`)}</span>
        </div>
        <div className="font-medium text-blue-600 dark:text-blue-400">
           {t('zone.details')} →
        </div>
      </div>
    </div>
  );
}
