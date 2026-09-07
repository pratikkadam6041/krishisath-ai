import { create } from 'zustand';

let alertIdCounter = 1;

export const useAlertStore = create((set, get) => ({
  alerts: [],

  addAlert: ({ type = 'info', titleKey, messageKey, params = {}, zone = null, actionKey = null, onAction = null }) => {
    const id = alertIdCounter++;
    const alert = {
      id,
      type, // 'critical' | 'warning' | 'info'
      titleKey,
      messageKey,
      params,
      zone,
      actionKey,
      onAction,
      dismissed: false,
      timestamp: Date.now(),
    };
    set((state) => ({ alerts: [alert, ...state.alerts].slice(0, 50) }));
    return id;
  },

  dismissAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a)),
    })),

  dismissAll: () =>
    set((state) => ({ alerts: state.alerts.map((a) => ({ ...a, dismissed: true })) })),

  clearAlert: (id) =>
    set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),

  getActive: () => get().alerts.filter((a) => !a.dismissed),
  getDismissed: () => get().alerts.filter((a) => a.dismissed),
  getCritical: () => get().alerts.filter((a) => !a.dismissed && a.type === 'critical'),
  getActiveCount: () => get().alerts.filter((a) => !a.dismissed).length,
}));
