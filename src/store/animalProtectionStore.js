import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAnimalProtectionStore = create(
  persist(
    (set, get) => ({
      protectionMode: 'OFF', // OFF | MANUAL | AUTOMATIC | NIGHT_ONLY
      incidents: [],
      riskAssessments: {},
      
      setProtectionMode: (mode) => set({ protectionMode: mode }),
      
      addIncident: (incident) => set((state) => ({
        incidents: [{ ...incident, id: Date.now().toString(), timestamp: Date.now() }, ...state.incidents].slice(0, 100)
      })),
      
      updateRiskAssessment: (zoneId, assessment) => set((state) => ({
        riskAssessments: {
          ...state.riskAssessments,
          [zoneId]: { ...assessment, timestamp: Date.now() }
        }
      })),
      
      clearIncidents: () => set({ incidents: [] })
    }),
    {
      name: 'ks-animal-protection-store'
    }
  )
);
