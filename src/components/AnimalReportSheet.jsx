import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnimalProtectionStore } from '../store/animalProtectionStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { X, Send } from 'lucide-react';

export default function AnimalReportSheet({ isOpen, onClose }) {
  const { t, i18n } = useTranslation();
  const { addIncident } = useAnimalProtectionStore();
  const { zones } = useZoneStore();
  
  const [selectedZone, setSelectedZone] = useState('z1');
  const [selectedAnimal, setSelectedAnimal] = useState('');
  
  const animals = ['Boar', 'Deer', 'Monkey', 'Stray Cattle', 'Elephant', 'Nilgai', 'Rodent', 'Birds', 'Unknown'];
  
  if (!isOpen) return null;

  const handleSubmit = (e) => {
      e.preventDefault();
      if (!selectedAnimal) return;
      
      addIncident({
          zoneId: selectedZone,
          animal: selectedAnimal,
          source: 'FARMER_REPORTED'
      });
      
      onClose();
  };

  const getZoneName = (zone) => {
    if (!zone) return '';
    return zone[`name${i18n.language.charAt(0).toUpperCase()}${i18n.language.slice(1)}`] || zone.name;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div 
        className="w-full bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl max-w-md p-6 animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold dark:text-white">
            {t('animalProtection.reportIncident')}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 opacity-70 dark:text-white">Zone</label>
            <select 
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
            >
              {Object.values(zones).map(zone => (
                  <option key={zone.id} value={zone.id}>{getZoneName(zone)}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 opacity-70 dark:text-white">Animal Type</label>
            <div className="grid grid-cols-3 gap-2">
                {animals.map(animal => (
                     <button
                        key={animal}
                        type="button"
                        onClick={() => setSelectedAnimal(animal)}
                        className={`p-2 rounded-lg text-sm border transition-colors ${
                            selectedAnimal === animal 
                                ? 'bg-green-500 text-white border-green-600' 
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                     >
                         {animal}
                     </button>
                ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedAnimal}
            className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-opacity ${
              !selectedAnimal ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <Send size={18} />
            Submit Report
          </button>
        </form>
      </div>
    </div>
  );
}
