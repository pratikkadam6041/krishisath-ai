/**
 * Offline read cache for mandi, weather, and zone telemetry.
 */

const PREFIX = 'ks-cache-';

export function cacheSet(key, data, ttlMs = 24 * 60 * 60 * 1000) {
  try {
    localStorage.setItem(
      PREFIX + key,
      JSON.stringify({ data, expiresAt: Date.now() + ttlMs, savedAt: Date.now() })
    );
  } catch {
    /* quota */
  }
}

export function cacheGet(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function cacheMandi(data) {
  cacheSet('mandi', data, 12 * 60 * 60 * 1000);
}

export function getCachedMandi() {
  return cacheGet('mandi');
}

export function cacheWeather(lat, lon, data) {
  cacheSet(`weather-${lat.toFixed(2)}-${lon.toFixed(2)}`, data, 3 * 60 * 60 * 1000);
}

export function getCachedWeather(lat, lon) {
  return cacheGet(`weather-${lat.toFixed(2)}-${lon.toFixed(2)}`);
}

export function cacheZoneSnapshot(zones) {
  cacheSet('zones', zones, 7 * 24 * 60 * 60 * 1000);
}

export function getCachedZoneSnapshot() {
  return cacheGet('zones');
}
