/**
 * Dynamic irrigation scheduling: moisture, crop stage, weather, ET, time-of-day, RL policy.
 */

import { rlDecide, ACTIONS } from '../ai-ml/irrigationRL.js';
import { getCropMeta } from '../data/appContent.js';
import { getCropWaterProfile } from '../data/cropNutrition.js';

const MS_PER_MIN = 60_000;

/** Crop water need multiplier by growth stage (0–1 of season) */
function dayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60_000;
  return Math.floor(diff / 86_400_000);
}

function growthStageFactor(cropType, doy = dayOfYear()) {
  const profiles = {
    wheat: { peak: [120, 200], factor: 1.0 },
    tomato: { peak: [90, 180], factor: 1.15 },
    onion: { peak: [60, 140], factor: 0.9 },
    potato: { peak: [80, 160], factor: 1.05 },
    cotton: { peak: [100, 220], factor: 1.1 },
  };
  const p = profiles[cropType] || { peak: [100, 200], factor: 1 };
  const [start, end] = p.peak;
  const inPeak = doy >= start && doy <= end;
  return inPeak ? p.factor : p.factor * 0.75;
}

/** Simplified ET (mm/day) from temp °C and humidity % */
export function estimateEvapotranspiration(tempC, humidityPct) {
  const t = tempC ?? 30;
  const h = humidityPct ?? 55;
  return Math.max(2, (0.0023 * (t + 17.8) * Math.sqrt(Math.max(1, 100 - h))) * 0.85);
}

function preferredIrrigationWindow(hour) {
  if (hour >= 5 && hour < 9) return { score: 1, label: 'morning' };
  if (hour >= 17 && hour < 20) return { score: 0.85, label: 'evening' };
  if (hour >= 11 && hour < 15) return { score: 0.2, label: 'midday_avoid' };
  return { score: 0.5, label: 'neutral' };
}

/**
 * Build 7-day irrigation plan for one zone.
 */
export function buildWeeklyIrrigationPlan({
  zone,
  weatherForecast = [],
  physics = {},
}) {
  const cropProfile = getCropWaterProfile(zone.cropType);
  const cropMeta = getCropMeta(zone.cropType);
  const flowLpm = physics.pumpFlowLpm ?? 25;
  const plan = [];
  const now = new Date();

  for (let d = 0; d < 7; d += 1) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    const forecast = weatherForecast[d] || {};
    const rainProb = forecast.rainProb ?? 0;
    const temp = forecast.maxTemp ?? zone.temperature ?? 32;
    const humidity = zone.humidity ?? 58;

    const moisture = zone.moisture ?? 50;
    const et = estimateEvapotranspiration(temp, humidity);
    const cropFactor = growthStageFactor(zone.cropType);
    const targetMoisture = cropProfile.targetMoisturePct;
    const deficit = Math.max(0, targetMoisture - moisture + et * cropFactor * 0.4);

    const rl = rlDecide({
      moisture,
      temperature: temp,
      rainProb,
      hour: 6,
      pumpAlreadyOn: zone.pumpOn,
    });

    const skipRain = rainProb >= 55;
    const shouldIrrigate =
      !skipRain &&
      rl.action === ACTIONS.IRRIGATE &&
      deficit > 8;

    const durationMin = shouldIrrigate
      ? Math.min(90, Math.max(15, Math.round((deficit / 100) * cropProfile.minutesPer10PctDeficit * 10)))
      : 0;
    const volumeL = Math.round(durationMin * flowLpm);

    const window = preferredIrrigationWindow(6);
    const timeLabel = `${String(6).padStart(2, '0')}:30`;

    plan.push({
      date: day.toISOString().slice(0, 10),
      dayName: day.toLocaleDateString('en-IN', { weekday: 'short' }),
      time: timeLabel,
      durationMin,
      volumeL,
      shouldIrrigate,
      rainProb,
      et: Math.round(et * 10) / 10,
      crop: cropMeta.name?.en || zone.cropType,
      reason: skipRain
        ? 'rain_expected'
        : rl.reasoning,
      confidence: rl.confidence,
      window: window.label,
    });
  }

  return plan;
}

/** Check if a scheduled time (HH:mm) is due within the last minute */
export function isScheduleDue(scheduleTime, now = new Date()) {
  if (!scheduleTime || !/^\d{1,2}:\d{2}$/.test(scheduleTime)) return false;
  const [h, m] = scheduleTime.split(':').map(Number);
  return now.getHours() === h && now.getMinutes() === m;
}

/** Client-side schedule tick — production should mirror this on backend cron */
export function getDueZoneSchedules(zones, now = new Date()) {
  return Object.values(zones || {}).filter((z) => {
    if (!z.schedule || z.zoneType === 'manual' || z.pumpOn) return false;
    return isScheduleDue(z.schedule, now);
  });
}

export function formatWaterCostLiters(liters, ratePer1000L = 12) {
  return Math.round((liters / 1000) * ratePer1000L);
}
