import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useGeoFarmStore = create(
  persist(
    (set, get) => ({
      farmLocation: null, // { lat: number, lon: number }
      farmBoundary: [], // Array of { lat, lon }
      zoneLocations: {}, // { z1: { lat, lon }, z2: { lat, lon } }
      
      setFarmLocation: (location) => set({ farmLocation: location }),
      
      setFarmBoundary: (coordinates) => set({ farmBoundary: coordinates }),
      
      updateZoneLocation: (zoneId, location) => set((state) => ({
        zoneLocations: {
          ...state.zoneLocations,
          [zoneId]: location
        }
      }))
    }),
    {
      name: 'ks-geofarm-store'
    }
  )
);
