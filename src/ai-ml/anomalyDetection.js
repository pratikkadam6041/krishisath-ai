/**
 * anomalyDetection.js — Sensor anomaly detection using Z-score method
 * KrishiSarth AI | ai-ml module
 */

const WINDOW_SIZE = 20;
const Z_THRESHOLD = 3.0;

const BOUNDS = {
  moisture: { min: 0, max: 100 }, temperature: { min: -5, max: 55 },
  humidity: { min: 0, max: 100 }, ph: { min: 3, max: 10 },
  ec: { min: 0, max: 5 }, nitrogen: { min: 0, max: 500 },
  phosphorus: { min: 0, max: 500 }, potassium: { min: 0, max: 500 },
  flow: { min: 0, max: 50 },
};

const buffers = {};

function getKey(zone, field) { return `${zone}.${field}`; }

function getStats(arr) {
  const n = arr.length;
  if (n === 0) return { mean: 0, std: 0 };
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  return { mean, std: Math.sqrt(variance) };
}

export function detectAnomaly(zone, field, value) {
  const key = getKey(zone, field);
  if (!buffers[key]) buffers[key] = [];
  const buf = buffers[key];
  const bounds = BOUNDS[field];

  if (bounds && (value < bounds.min || value > bounds.max)) {
    buf.push(value);
    if (buf.length > WINDOW_SIZE) buf.shift();
    return { type: 'out_of_bounds', zone, field, value, bounds, severity: 'critical' };
  }

  if (buf.length >= 5) {
    const { mean, std } = getStats(buf);
    if (std > 0) {
      const zScore = Math.abs(value - mean) / std;
      if (zScore > Z_THRESHOLD) {
        buf.push(value);
        if (buf.length > WINDOW_SIZE) buf.shift();
        return {
          type: 'statistical_anomaly', zone, field, value,
          zScore: Math.round(zScore * 10) / 10,
          mean: Math.round(mean * 10) / 10,
          severity: zScore > 5 ? 'critical' : 'warning',
        };
      }
    }
  }

  buf.push(value);
  if (buf.length > WINDOW_SIZE) buf.shift();
  return null;
}

export function getSensorStats(zone, field) {
  const key = getKey(zone, field);
  const buf = buffers[key] || [];
  return { ...getStats(buf), count: buf.length };
}

export function resetBuffers(zone, field) {
  if (zone && field) delete buffers[getKey(zone, field)];
  else Object.keys(buffers).forEach((k) => delete buffers[k]);
}
