import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n/index.js';

const DEFAULT_NOTIFICATION_PREFS = {
  moisture: true,
  schemes: true,
  pests: true,
  mandi: true,
  pumps: true,
  animalRisk: true,
  solar: true,
};

export const useSettingsStore = create(
  persist(
    (set) => ({
      language: localStorage.getItem('ks_language') || 'hi',
      darkMode: localStorage.getItem('ks_theme') === 'dark',
      displayMode: 'app',
      farmName: 'Sarth Farm',
      ownerName: 'Kisan',
      district: 'Pune',
      village: 'Pimpri',
      state: 'Maharashtra',
      totalAcres: 4.3,
      cropZ1: 'Wheat',
      cropZ2: 'Tomato',
      units: 'acre',
      notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
      profilePhoto: '',
      supportPhone: '+919876543210',
      dealerUnlocked: false,

      setLanguage: (language) => {
        i18n.changeLanguage(language);
        localStorage.setItem('ks_language', language);
        set({ language });
      },

      toggleDarkMode: () => set((state) => {
        const isDark = !state.darkMode;
        localStorage.setItem('ks_theme', isDark ? 'dark' : 'light');
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return { darkMode: isDark };
      }),

      updateProfile: (payload) => set((state) => ({ ...state, ...payload })),

      setUnits: (units) => set({ units }),

      setDisplayMode: (displayMode) => set({ displayMode }),

      toggleNotification: (key) =>
        set((state) => ({
          notificationPrefs: {
            ...state.notificationPrefs,
            [key]: !state.notificationPrefs[key],
          },
        })),

      unlockDealer: (pin) => {
        const dealerPin = import.meta.env.VITE_DEALER_PIN || '123456';
        if (pin === dealerPin) {
          set({ dealerUnlocked: true });
          return true;
        }
        return false;
      },

      lockDealer: () => set({ dealerUnlocked: false }),
    }),
    { name: 'ks-settings-store' }
  )
);

// Apply saved theme class immediately on page load
(function applyThemeOnLoad() {
  try {
    const raw = localStorage.getItem('ks-settings-store');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (localStorage.getItem('ks_theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch { /* ignore */ }
})();
