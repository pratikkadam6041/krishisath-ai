/**
 * Lightweight market-price forecaster.
 *
 * This is deliberately deterministic and runs completely in the browser so a
 * farmer still gets a forecast when the app is offline. It blends a recency
 * weighted linear trend with exponential smoothing, then derives an honest
 * prediction interval from the observed residuals and day-to-day volatility.
 * It is not presented as a trained commodity-market model: confidence falls
 * when the price history is short or noisy.
 */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function cleanHistory(history = []) {
  return history
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
    .slice(-30);
}

function standardDeviation(values = []) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
}

function weightedTrend(values) {
  const count = values.length;
  const weights = values.map((_, index) => 0.55 + (index + 1) / count);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const meanX = weights.reduce((sum, weight, index) => sum + weight * index, 0) / totalWeight;
  const meanY = weights.reduce((sum, weight, index) => sum + weight * values[index], 0) / totalWeight;
  const denominator = weights.reduce((sum, weight, index) => sum + weight * (index - meanX) ** 2, 0);
  const slope = denominator
    ? weights.reduce((sum, weight, index) => sum + weight * (index - meanX) * (values[index] - meanY), 0) / denominator
    : 0;
  const intercept = meanY - slope * meanX;
  const residuals = values.map((value, index) => value - (intercept + slope * index));

  return { slope, intercept, residualStdDev: standardDeviation(residuals) };
}

function exponentialSmooth(values, alpha = 0.45) {
  return values.slice(1).reduce((smoothed, value) => alpha * value + (1 - alpha) * smoothed, values[0]);
}

/**
 * Forecast the modal price for the next seven days.
 * @param {number[]} history Recent, oldest-to-newest modal prices.
 * @param {number} horizon Number of days ahead to forecast.
 */
export function forecastPrice(history = [], horizon = 7) {
  const values = cleanHistory(history);
  const days = clamp(Math.round(Number(horizon) || 7), 1, 30);

  if (!values.length) {
    return {
      available: false,
      forecast: null,
      lowerBound: null,
      upperBound: null,
      expectedChange: null,
      expectedChangePct: null,
      confidence: 0,
      trend: 'unknown',
      observations: 0,
      model: 'Waiting for mandi price history',
    };
  }

  if (values.length === 1) {
    const current = values[0];
    return {
      available: true,
      forecast: current,
      lowerBound: Math.round(current * 0.9),
      upperBound: Math.round(current * 1.1),
      expectedChange: 0,
      expectedChangePct: 0,
      confidence: 20,
      trend: 'flat',
      observations: 1,
      model: 'Baseline estimate - collect more mandi observations',
    };
  }

  const current = values.at(-1);
  const { slope, intercept, residualStdDev } = weightedTrend(values);
  const trendForecast = intercept + slope * (values.length - 1 + days);
  const smoothForecast = exponentialSmooth(values);
  // Favor the trend only when it is stronger than the observed daily noise.
  const differences = values.slice(1).map((value, index) => value - values[index]);
  const dailyVolatility = standardDeviation(differences);
  const signalStrength = Math.abs(slope) / Math.max(dailyVolatility, 1);
  const trendWeight = clamp(0.35 + signalStrength * 0.2, 0.35, 0.7);
  const rawForecast = trendForecast * trendWeight + smoothForecast * (1 - trendWeight);
  const forecast = Math.max(0, Math.round(rawForecast));
  const uncertainty = Math.max(
    current * 0.025,
    residualStdDev * 1.96,
    dailyVolatility * Math.sqrt(days) * 1.25
  );
  const lowerBound = Math.max(0, Math.round(forecast - uncertainty));
  const upperBound = Math.round(forecast + uncertainty);
  const expectedChange = forecast - current;
  const expectedChangePct = current ? (expectedChange / current) * 100 : 0;
  const consistency = 1 - clamp(dailyVolatility / Math.max(current * 0.08, 1), 0, 1);
  const confidence = Math.round(clamp(20 + Math.min(values.length, 14) * 4 + consistency * 25, 20, 88));
  const trend = expectedChangePct > 1.5 ? 'up' : expectedChangePct < -1.5 ? 'down' : 'flat';

  return {
    available: true,
    forecast,
    lowerBound,
    upperBound,
    expectedChange,
    expectedChangePct: Number(expectedChangePct.toFixed(1)),
    confidence,
    trend,
    observations: values.length,
    model: 'Recency-weighted trend + exponential smoothing',
  };
}

export function getAgriculturalSeason(date = new Date()) {
  const month = date.getMonth() + 1;
  if (month >= 6 && month <= 10) return 'Kharif';
  if (month === 11 || month === 12 || month <= 3) return 'Rabi';
  return 'Zaid';
}
