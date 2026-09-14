/**
 * Preference-aware notifications + mandi price alert checks.
 */

import { useNotificationStore } from '../store/notificationStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useMandiStore } from '../store/mandiStore.js';
import { useAdminStore } from '../store/adminStore.js';
import { isFeatureRouteEnabled } from '../utils/featureFlags.js';

const PREF_MAP = {
  moisture: 'moisture',
  pump: 'pumps',
  pumps: 'pumps',
  mandi: 'mandi',
  scheme: 'schemes',
  schemes: 'schemes',
  pest: 'pests',
  pests: 'pests',
  weather: 'moisture',
  animalRisk: 'animalRisk',
  solar: 'solar',
};

export function isNotificationEnabled(type) {
  const key = PREF_MAP[type] || type;
  const prefs = useSettingsStore.getState().notificationPrefs;
  return prefs[key] !== false;
}

export function notifyFarmer(payload, type = 'moisture') {
  if (!isNotificationEnabled(type)) return null;
  return useNotificationStore.getState().addNotification({
    ...payload,
    createdAt: payload.createdAt || Date.now(),
  });
}

export function checkMandiPriceAlerts() {
  if (!isNotificationEnabled('mandi')) return;
  if (!isFeatureRouteEnabled('/mandi', useAdminStore.getState().features)) return;

  const { crops, priceAlerts } = useMandiStore.getState();
  const existing = useNotificationStore.getState().notifications;

  crops.forEach((crop) => {
    const threshold = priceAlerts[crop.id];
    if (!threshold) return;

    const crossed = crop.price >= threshold;
    const alertId = `mandi-alert-${crop.id}`;

    if (crossed) {
      const already = existing.find((n) => n.id === alertId);
      if (!already) {
        useNotificationStore.getState().addNotification({
          id: alertId,
          type: 'mandi',
          title: `📈 ${crop.cropNameHi || crop.cropName}: ₹${crop.price}`,
          subtitle: `आपका लक्ष्य ₹${threshold} पार हो गया। बेचने का सही वक्त!`,
          body: `${crop.cropName} crossed your price alert of ₹${threshold} at ${crop.mandi}`,
          actionRoute: '/mandi',
        });
      }
    }
  });
}


/** Request browser notification permission (FCM requires backend — this is local fallback) */
export async function requestPushPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

export function showLocalPush(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, tag, icon: '/pwa-192x192.png' });
  } catch {
    /* ignore */
  }
}
