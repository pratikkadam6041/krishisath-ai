import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_EVENTS = 250;

function normalizePhone(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}

function postLocalDb(payload) {
  if (typeof fetch !== 'function') return;
  fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

function mergeEvents(current = [], incoming = []) {
  const records = new Map();
  [...incoming, ...current].forEach((event) => {
    if (!event?.id) return;
    records.set(event.id, event);
  });
  return Array.from(records.values())
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, MAX_EVENTS);
}

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

        const nextEvents = [entry, ...(get().events || [])].slice(0, MAX_EVENTS);
        set({ events: nextEvents });
        postLocalDb({ activityEvents: nextEvents });
        return entry;
      },

      getFarmerEvents: (phone) =>
        (get().events || []).filter((event) => normalizePhone(event.farmerPhone) === normalizePhone(phone)),

      syncWithServer: async () => {
        try {
          const res = await fetch('/api/db');
          const data = await res.json();
          if (Array.isArray(data?.activityEvents)) {
            const mergedEvents = mergeEvents(get().events, data.activityEvents);
            set({ events: mergedEvents });
            postLocalDb({ activityEvents: mergedEvents });
          }
        } catch {
          // Local backend is only available while running the dev server.
        }
      },
    }),
    {
      name: 'ks-admin-activity-log',
      version: 2,
      onRehydrateStorage: () => (state, error) => {
        if (!error) {
          setTimeout(() => useActivityLogStore.getState().syncWithServer(), 100);
        }
      },
    }
  )
);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'ks-admin-activity-log') {
      useActivityLogStore.persist.rehydrate();
    }
  });
}
