export const DEFAULT_FEATURES = {
  scannerEnabled: true,
  twinEnabled: true,
  mandiEnabled: true,
};

export function getFeatureFlags(features) {
  return { ...DEFAULT_FEATURES, ...(features || {}) };
}

export function isFeatureRouteEnabled(route = '', features) {
  const flags = getFeatureFlags(features);

  if (route.includes('/mandi')) return flags.mandiEnabled !== false;
  if (route.includes('/scanner')) return flags.scannerEnabled !== false;
  if (route.includes('/twin')) return flags.twinEnabled !== false;

  return true;
}

export function safeFeatureRoute(route = '/', features, fallback = '/') {
  return isFeatureRouteEnabled(route, features) ? route : fallback;
}
