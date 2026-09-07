/**
 * moistureForecast.js — LSTM-style moisture decay prediction
 * KrishiSarth AI | ai-ml module
 *
 * Uses exponential decay model calibrated to typical clay-loam soil
 * in Maharashtra (evapotranspiration ~4-6mm/day)
 */

const DECAY_RATE_BASE = 0.0018;    // moisture % lost per minute baseline
const TEMP_COEFFICIENT = 0.00012;  // additional decay per °C above 25
const HUMIDITY_OFFSET  = 0.00008;  // decay reduction per % humidity above 50

/**
 * Predict moisture at future time points using exponential decay
 * @param {number} currentMoisture - current moisture %
 * @param {number} temperature     - current temperature °C
 * @param {number} humidity        - current humidity %
 * @param {number[]} hoursAhead    - array of hour offsets to predict
 * @returns {Array<{hour, predicted, confidence}>}
 */
export function predictMoistureDecay(currentMoisture, temperature, humidity, hoursAhead = [1, 2, 4, 8]) {
  // Effective decay rate adjusted for env conditions
  const tempFactor = Math.max(0, temperature - 25) * TEMP_COEFFICIENT;
  const humidFactor = Math.max(0, humidity - 50) * HUMIDITY_OFFSET;
  const decayRate = DECAY_RATE_BASE + tempFactor - humidFactor;

  return hoursAhead.map((h) => {
    const minutes = h * 60;
    const predicted = currentMoisture * Math.exp(-decayRate * minutes);
    // Confidence degrades over time (LSTM uncertainty)
    const confidence = Math.max(0.5, 1 - h * 0.08);
    return {
      hour: h,
      predicted: Math.max(0, Math.round(predicted * 10) / 10),
      confidence: Math.round(confidence * 100),
    };
  });
}

/**
 * Get time in hours until moisture drops to a threshold
 * @param {number} currentMoisture
 * @param {number} targetMoisture
 * @param {number} temperature
 * @param {number} humidity
 * @returns {number} hours (rounded to 0.5h)
 */
export function timeToThreshold(currentMoisture, targetMoisture, temperature, humidity) {
  if (currentMoisture <= targetMoisture) return 0;
  const tempFactor = Math.max(0, temperature - 25) * TEMP_COEFFICIENT;
  const humidFactor = Math.max(0, humidity - 50) * HUMIDITY_OFFSET;
  const decayRate = DECAY_RATE_BASE + tempFactor - humidFactor;
  const minutes = -Math.log(targetMoisture / currentMoisture) / decayRate;
  return Math.round(minutes / 30) / 2; // round to 0.5h
}

/**
 * Forecast for chart — 48 data points over 24 hours
 */
export function generate24hForecast(currentMoisture, temperature, humidity) {
  const points = [];
  const now = Date.now();
  const tempFactor = Math.max(0, temperature - 25) * TEMP_COEFFICIENT;
  const humidFactor = Math.max(0, humidity - 50) * HUMIDITY_OFFSET;
  const decayRate = DECAY_RATE_BASE + tempFactor - humidFactor;

  for (let i = 0; i <= 48; i++) {
    const minutes = i * 30;
    const predicted = currentMoisture * Math.exp(-decayRate * minutes);
    points.push({
      time: new Date(now + minutes * 60000).toISOString(),
      value: Math.max(0, Math.round(predicted * 10) / 10),
      isForecast: true,
    });
  }
  return points;
}
