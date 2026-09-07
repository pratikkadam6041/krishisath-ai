/**
 * rainIntegration.js — Rain probability handler
 * KrishiSarth AI | ai-ml module
 *
 * Processes rain probability from MQTT and defers irrigation if needed.
 */

import { useAlertStore } from '../store/alertStore.js';
import { useZoneStore } from '../store/zoneStore.js';

const RAIN_WARN_THRESHOLD  = 40; // % — show warning
const RAIN_DEFER_THRESHOLD = 60; // % — defer irrigation in VIEW mode

let lastRainProb = 0;
let deferActive = false;

export function handleRainData(rainProb) {
  lastRainProb = rainProb;
  const alertStore = useAlertStore.getState();

  if (rainProb >= RAIN_DEFER_THRESHOLD && !deferActive) {
    deferActive = true;
    alertStore.addAlert({
      type: 'warning',
      titleKey: 'alert.rainIncoming',
      messageKey: 'alert.rainIncoming',
      params: { prob: Math.round(rainProb) },
    });
  } else if (rainProb < RAIN_WARN_THRESHOLD && deferActive) {
    deferActive = false;
  }
}

export function shouldDeferIrrigation() { return lastRainProb >= RAIN_DEFER_THRESHOLD; }
export function getRainProb() { return lastRainProb; }
export function isRainDeferred() { return deferActive; }

export function getRainRisk() {
  if (lastRainProb >= 70) return 'high';
  if (lastRainProb >= 40) return 'medium';
  return 'low';
}
