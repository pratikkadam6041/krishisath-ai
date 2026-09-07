import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useModeStore = create(
  persist(
    (set, get) => ({
      mode: 'view', // 'view' | 'act'
      autoRevertMinutes: 10,
      autoRevertTimer: null,

      setMode: (mode) => {
        const state = get();
        // Clear any existing auto-revert timer
        if (state.autoRevertTimer) clearTimeout(state.autoRevertTimer);

        let timer = null;
        if (mode === 'act' && state.autoRevertMinutes > 0) {
          timer = setTimeout(() => {
            set({ mode: 'view', autoRevertTimer: null });
          }, state.autoRevertMinutes * 60 * 1000);
        }

        set({ mode, autoRevertTimer: timer });
      },

      toggleMode: () => {
        const current = get().mode;
        get().setMode(current === 'view' ? 'act' : 'view');
      },

      setAutoRevertMinutes: (mins) => set({ autoRevertMinutes: mins }),

      isActMode: () => get().mode === 'act',
      isViewMode: () => get().mode === 'view',
    }),
    {
      name: 'ks-mode-store',
      partialize: (s) => ({ mode: s.mode, autoRevertMinutes: s.autoRevertMinutes }),
    }
  )
);
