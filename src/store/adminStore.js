/**
 * adminStore.js — Global admin configurations pushed to farmer UI
 *
 * TODO: REPLACE WITH FIREBASE REALTIME DATABASE BEFORE PRODUCTION.
 * Currently uses localStorage — changes only reflect on the SAME device.
 * In production: admin writes to Firestore, farmer app listens via real-time listener.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAdminStore = create(
  persist(
    (set, get) => ({
      // Global alert banner shown on farmer Home Screen
      globalAlert: null, // { message: string, type: 'info'|'warning'|'critical', createdAt: number }

      // Maintenance mode flag
      maintenanceMode: false,

      // Feature flags
      features: {
        scannerEnabled: true,
        twinEnabled: true,
        mandiEnabled: true,
      },

      // Platform stats (set by admin)
      platformStats: {
        activeFarmers: 12450,
        monthlyRevenue: '₹1.2M',
        systemUptime: '99.9%',
      },

      // Admin actions
      setGlobalAlert: (message, type = 'info') => {
        set({ globalAlert: { message, type, createdAt: Date.now() } });
      },

      clearGlobalAlert: () => {
        set({ globalAlert: null });
      },

      setMaintenanceMode: (enabled) => {
        set({ maintenanceMode: enabled });
      },

      toggleFeature: (featureKey) => {
        set((state) => ({
          features: { ...state.features, [featureKey]: !state.features[featureKey] },
        }));
      },

      updatePlatformStats: (stats) => {
        set((state) => ({
          platformStats: { ...state.platformStats, ...stats },
        }));
      },
    }),
    {
      name: 'ks-admin-store',
      version: 2,
      migrate: (persisted) => ({
        ...(persisted || {}),
        features: {
          scannerEnabled: true,
          twinEnabled: true,
          ...(persisted?.features || {}),
          mandiEnabled: true,
        },
      }),
      // TODO: Replace with Firebase Realtime DB adapter before production
    }
  )
);

// Cross-tab synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'ks-admin-store') {
      useAdminStore.persist.rehydrate();
    }
  });
}
