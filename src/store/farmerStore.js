/**
 * farmerStore.js — Manage farmer directory
 *
 * v2: Removed all fake/seed farmers. Only real app-registered farmers appear.
 * TODO: REPLACE WITH REAL API (Firebase Firestore / REST) BEFORE PRODUCTION.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Normalize phone for comparison — strips +91, spaces, dashes */
function normalizePhone(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  // Strip leading country code 91 if 12 digits
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

function mergeFarmers(current = [], incoming = []) {
  const records = new Map();
  [...incoming, ...current].forEach((farmer) => {
    if (!farmer) return;
    const key = normalizePhone(farmer.phone) || farmer.id;
    if (!key) return;
    records.set(key, { ...records.get(key), ...farmer });
  });
  return Array.from(records.values());
}

export const useFarmerStore = create(
  persist(
    (set, get) => ({
      // Start empty — only real registered farmers will appear
      farmers: [],

      /** Admin manual "Add Farmer" button — generates random suffix */
      addFarmer: (farmerData) => {
        const distPart = (farmerData.district || 'UNK').slice(0, 3).toUpperCase();
        const namePart = (farmerData.name || 'FARMER').replace(/\s+/g, '').slice(0, 3).toUpperCase();
        const cropPart = (farmerData.crops?.[0] || 'CR').slice(0, 2).toUpperCase();
        const phoneSuffix = normalizePhone(farmerData.phone).slice(-3).padStart(3, '0');
        const id = `KS-${distPart}-${namePart}-${cropPart}${phoneSuffix}`;

        // Don't duplicate if phone already exists
        const existing = get().farmers.find(
          f => normalizePhone(f.phone) === normalizePhone(farmerData.phone)
        );
        if (existing) return existing;

        const newFarmer = {
          ...farmerData,
          id,
          status: 'Active',
          joined: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          zones: farmerData.zones || 1,
        };

        const nextFarmers = [newFarmer, ...(get().farmers || [])];
        set({ farmers: nextFarmers });
        postLocalDb({ farmers: nextFarmers });
        return newFarmer;
      },

      /**
       * Called automatically when a farmer completes onboarding.
       * Uses normalized phone number as stable unique key:
       *   - Same farmer re-logging in → updates their record (no duplicate)
       *   - New farmer with different phone → new row added
       */
      addOrUpdateFarmer: (farmerData) => {
        const phone = farmerData.phone || '';
        const normalizedNew = normalizePhone(phone);

        if (normalizedNew) {
          const existing = get().farmers.find(
            f => normalizePhone(f.phone) === normalizedNew
          );

          if (existing) {
            // Update existing record — preserve ID, update other fields
            const nextFarmers = (get().farmers || []).map(f =>
                normalizePhone(f.phone) === normalizedNew
                  ? {
                      ...f,
                      name:     farmerData.name     || f.name,
                      district: farmerData.district || f.district,
                      village:  farmerData.village  || f.village,
                      crops:    farmerData.crops?.length ? farmerData.crops : f.crops,
                      acres:    farmerData.acres    || f.acres,
                      plan:     farmerData.plan     || f.plan,
                      status:   'Active',
                    }
                  : f
              );
            const updatedFarmer = nextFarmers.find(f => normalizePhone(f.phone) === normalizedNew) || existing;
            set({ farmers: nextFarmers });
            postLocalDb({ farmers: nextFarmers });
            return updatedFarmer;
          }
        }

        // New farmer — generate deterministic ID
        const distPart  = (farmerData.district || 'UNK').slice(0, 3).toUpperCase();
        const namePart  = (farmerData.name || 'FARMER').replace(/\s+/g, '').slice(0, 3).toUpperCase();
        const cropPart  = (farmerData.crops?.[0] || 'CR').slice(0, 2).toUpperCase();
        const phoneSuffix = normalizedNew.slice(-3).padStart(3, '0');
        const id = `KS-${distPart}-${namePart}-${cropPart}${phoneSuffix}`;

        const newFarmer = {
          ...farmerData,
          phone,
          id,
          status: 'Active',
          joined: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          zones: farmerData.zones || 1,
        };

        const nextFarmers = [newFarmer, ...(get().farmers || [])];
        set({ farmers: nextFarmers });
        postLocalDb({ farmers: nextFarmers });
        return newFarmer;
      },

      changeStatus: (id, newStatus) => {
        const nextFarmers = (get().farmers || []).map((f) => (f.id === id ? { ...f, status: newStatus } : f));
        set({ farmers: nextFarmers });
        postLocalDb({ farmers: nextFarmers });
      },

      removeFarmer: (id) => {
        const nextFarmers = (get().farmers || []).filter((f) => f.id !== id);
        set({ farmers: nextFarmers });
        postLocalDb({ farmers: nextFarmers });
      },

      /** Admin can wipe all farmers (for testing) */
      clearAll: () => {
        set({ farmers: [] });
        postLocalDb({ farmers: [] });
      },

      syncWithServer: async () => {
        try {
          const res = await fetch('/api/db');
          const data = await res.json();
          if (Array.isArray(data?.farmers)) {
            const mergedFarmers = mergeFarmers(get().farmers, data.farmers);
            set({ farmers: mergedFarmers });
            postLocalDb({ farmers: mergedFarmers });
          }
        } catch {
          // Local backend is only available while running the dev server.
        }
      },
    }),
    {
      // v2 key — clears old fake-farmer data from localStorage automatically
      name: 'ks-farmer-store-v2',
      version: 2,
      onRehydrateStorage: () => (state, error) => {
        if (!error) {
          setTimeout(() => useFarmerStore.getState().syncWithServer(), 100);
        }
      },
    }
  )
);

// Cross-tab synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'ks-farmer-store-v2') {
      useFarmerStore.persist.rehydrate();
    }
  });
}
