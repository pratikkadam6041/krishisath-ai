import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSolarStore = create(
  persist(
    (set, get) => ({
      config: {
        panelCapacityKw: 5,
        batteryCapacityKwh: 10,
        isSolarAwareIrrigationEnabled: false
      },
      estimates: {
        currentGenerationKw: 0,
        batteryLevelPercent: 100,
        totalGeneratedTodayKwh: 0
      },
      dailyForecast: [],
      
      updateConfig: (newConfig) => set((state) => ({
        config: { ...state.config, ...newConfig }
      })),
      
      updateEstimates: (newEstimates) => set((state) => ({
        estimates: { ...state.estimates, ...newEstimates, lastUpdated: Date.now() }
      })),
      
      setDailyForecast: (forecast) => set({ dailyForecast: forecast })
    }),
    {
      name: 'ks-solar-store'
    }
  )
);
