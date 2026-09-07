/**
 * waterScheduleAdvisor.js — AI-driven water schedule generator
 * KrishiSarth AI | ai-ml module
 *
 * Combines RL decision engine + moisture forecast + digital twin physics
 * to produce a 7-day actionable irrigation schedule per zone.
 */

import { rlDecide } from './irrigationRL.js';
import { timeToThreshold, predictMoistureDecay } from './moistureForecast.js';
import { predictPumpOutcome } from './digitalTwin.js';
import { getZonePhysics } from '../utils/zoneConstants.js';

const CRITICAL_THRESHOLD = 35;  // % moisture — must irrigate before this
const TARGET_MOISTURE = 65;     // % moisture — ideal post-irrigation

const CROP_WATER_NEEDS = {
  wheat: { dailyEvapMm: 4.5, stressThreshold: 40, optimalRange: [50, 70] },
  tomato: { dailyEvapMm: 6.0, stressThreshold: 45, optimalRange: [55, 75] },
  cotton: { dailyEvapMm: 5.5, stressThreshold: 38, optimalRange: [45, 65] },
  onion: { dailyEvapMm: 5.0, stressThreshold: 42, optimalRange: [50, 70] },
  potato: { dailyEvapMm: 4.0, stressThreshold: 45, optimalRange: [55, 75] },
  default: { dailyEvapMm: 5.0, stressThreshold: 40, optimalRange: [50, 70] },
};

const TIME_SLOTS = [
  { hour: 6, label: { hi: 'सुबह 6 बजे', mr: 'सकाळी 6', en: '6:00 AM' }, efficiency: 0.92 },
  { hour: 7, label: { hi: 'सुबह 7 बजे', mr: 'सकाळी 7', en: '7:00 AM' }, efficiency: 0.90 },
  { hour: 18, label: { hi: 'शाम 6 बजे', mr: 'संध्याकाळी 6', en: '6:00 PM' }, efficiency: 0.88 },
  { hour: 5, label: { hi: 'सुबह 5 बजे', mr: 'पहाटे 5', en: '5:00 AM' }, efficiency: 0.95 },
];

function getBestTimeSlot(rainProb = 0, temperature = 28) {
  // Avoid if rain likely
  if (rainProb > 60) return null;
  // Hot afternoon? Push to morning
  if (temperature > 36) return TIME_SLOTS[3]; // 5 AM
  return TIME_SLOTS[0]; // Default: 6 AM
}

function getDayLabel(daysFromNow, language) {
  if (daysFromNow === 0) {
    return { hi: 'आज', mr: 'आज', en: 'Today' }[language] || 'Today';
  }
  if (daysFromNow === 1) {
    return { hi: 'कल', mr: 'उद्या', en: 'Tomorrow' }[language] || 'Tomorrow';
  }
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  const locale = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';
  return date.toLocaleDateString(locale, opts);
}

/**
 * Generate a 7-day irrigation schedule for a zone
 * @param {Object} zone - zone object from zoneStore
 * @param {Object} weather - weather object { temp, humidity, rainProb, forecast7d[] }
 * @param {string} language - 'hi' | 'mr' | 'en'
 * @returns {Array} 7-day schedule array
 */
export function generateWaterSchedule(zone, weather = {}, language = 'hi') {
  const cropNeeds = CROP_WATER_NEEDS[zone.cropType] || CROP_WATER_NEEDS.default;
  const physics = getZonePhysics(zone.id);
  const schedule = [];

  let projectedMoisture = zone.moisture ?? 50;
  const temp = zone.temperature || weather.temp || 28;
  const humidity = zone.humidity || weather.humidity || 60;

  for (let day = 0; day < 7; day++) {
    const forecastDay = weather.forecast7d?.[day];
    const dayTemp = forecastDay?.maxTemp || temp;
    const dayRainProb = forecastDay?.rainProb || (day < 2 ? weather.rainProb || 0 : 20);
    const dayHumidity = forecastDay?.humidity || humidity;

    // Simulate moisture decay for this day (24h)
    const decayResult = predictMoistureDecay(projectedMoisture, dayTemp, dayHumidity, [24]);
    const endOfDayMoisture = decayResult[0]?.predicted ?? Math.max(0, projectedMoisture - 8);

    // RL decision
    const rlResult = rlDecide({
      moisture: endOfDayMoisture,
      temperature: dayTemp,
      rainProb: dayRainProb,
      hour: 6,
    });

    const needsWater =
      endOfDayMoisture < cropNeeds.stressThreshold ||
      rlResult.action === 'irrigate' ||
      (day === 0 && zone.moisture < cropNeeds.stressThreshold);

    let irrigationDurationH = null;
    let waterLitres = null;
    let moistureAfter = endOfDayMoisture;
    let costEstimate = null;

    if (needsWater && dayRainProb < 60) {
      // Calculate optimal duration to reach target
      const currentForPrediction = endOfDayMoisture;
      const prediction = predictPumpOutcome(zone.id, 2, {
        moisture: currentForPrediction,
        temperature: dayTemp,
        humidity: dayHumidity,
        rainProb: dayRainProb,
      });

      irrigationDurationH = prediction.timeToOptimalH || 1.5;
      waterLitres = prediction.waterLitres;
      moistureAfter = Math.min(TARGET_MOISTURE, prediction.moistureAfter);
      costEstimate = prediction.totalCost;
    }

    const timeSlot = needsWater ? getBestTimeSlot(dayRainProb, dayTemp) : null;

    schedule.push({
      day,
      date: getDayLabel(day, language),
      dateObj: new Date(Date.now() + day * 86400000).toISOString().split('T')[0],
      moistureStart: Math.round(projectedMoisture * 10) / 10,
      moistureEnd: Math.round(endOfDayMoisture * 10) / 10,
      moistureAfterIrrigation: irrigationDurationH ? Math.round(moistureAfter * 10) / 10 : null,
      needsWater,
      irrigationDurationH: irrigationDurationH ? Math.round(irrigationDurationH * 10) / 10 : null,
      waterLitres,
      costEstimate: costEstimate ? Math.round(costEstimate) : null,
      timeSlot,
      rainProb: Math.round(dayRainProb),
      temperature: Math.round(dayTemp),
      rlAction: rlResult.action,
      rlConfidence: rlResult.confidence,
      rlReasoning: rlResult.reasoning,
      warnings: needsWater && dayRainProb > 40
        ? [{ type: 'rain_risk', message: { hi: 'बारिश की संभावना है, सुबह जल्दी करें', mr: 'पाऊस शक्य आहे, सकाळी लवकर करा', en: 'Rain possible, irrigate early' }[language] }]
        : [],
    });

    // Update moisture for next day projection
    projectedMoisture = irrigationDurationH ? moistureAfter : endOfDayMoisture;
  }

  return schedule;
}

/**
 * Get the next recommended irrigation time for display on HomeScreen
 */
export function getNextIrrigationRecommendation(zone, weather = {}, language = 'hi') {
  const cropNeeds = CROP_WATER_NEEDS[zone.cropType] || CROP_WATER_NEEDS.default;
  const temp = zone.temperature || weather.temp || 28;
  const humidity = zone.humidity || weather.humidity || 60;
  const rainProb = weather.rainProb || 0;

  if (zone.moisture < cropNeeds.stressThreshold) {
    return {
      urgent: true,
      message: { hi: 'अभी सिंचाई करें', mr: 'आत्ता पाणी द्या', en: 'Irrigate now' }[language],
      hoursUntil: 0,
    };
  }

  const hoursUntilCritical = timeToThreshold(zone.moisture, cropNeeds.stressThreshold, temp, humidity);

  if (hoursUntilCritical <= 0) {
    return { urgent: true, message: { hi: 'अभी सिंचाई करें', mr: 'आत्ता पाणी द्या', en: 'Irrigate now' }[language], hoursUntil: 0 };
  }

  // Suggest time slot
  const timeSlot = getBestTimeSlot(rainProb, temp);
  const timeLabel = timeSlot ? timeSlot.label[language] || timeSlot.label.en : null;

  const rlResult = rlDecide({ moisture: zone.moisture, temperature: temp, rainProb, hour: new Date().getHours() });

  return {
    urgent: rlResult.action === 'irrigate',
    message: rlResult.action === 'irrigate'
      ? { hi: `${timeLabel || 'सुबह'} सिंचाई करें`, mr: `${timeLabel || 'सकाळी'} पाणी द्या`, en: `Irrigate ${timeLabel || 'morning'}` }[language]
      : { hi: `${Math.round(hoursUntilCritical)}h में पानी चाहिए`, mr: `${Math.round(hoursUntilCritical)}h मध्ये पाणी हवे`, en: `Water needed in ~${Math.round(hoursUntilCritical)}h` }[language],
    hoursUntil: Math.round(hoursUntilCritical),
    suggestedTime: timeLabel,
    rlReasoning: rlResult.reasoning,
  };
}
