import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_EVENTS = 250;

export const useActivityLogStore = create(
  persist(
    (set, get) => ({
      events: [],

      logActivity: (event = {}) => {
        const entry = {
          id: event.id || `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: Date.now(),
          type: event.type || 'system',
          farmerPhone: event.farmerPhone || '',
          farmerName: event.farmerName || 'Farmer',
          zoneId: event.zoneId || '',
          zoneName: event.zoneName || '',
          title: event.title || 'Farm activity',
          detail: event.detail || '',
          metadata: event.metadata || {},
        };

        set((state) => ({ events: [entry, ...(state.events || [])].slice(0, MAX_EVENTS) }));
        return entry;
      },

      getFarmerEvents: (phone) =>
        (get().events || []).filter((event) => event.farmerPhone === phone),
    }),
    { name: 'ks-admin-activity-log', version: 1 }
  )
);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'ks-admin-activity-log') {
      useActivityLogStore.persist.rehydrate();
    }
  });
}
