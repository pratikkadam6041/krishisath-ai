import { forecastPrice, getAgriculturalSeason } from '../ai-ml/pricePrediction.js';
import { CROP_NUTRITION } from '../data/cropNutrition.js';

const SOWING_WINDOWS = {
  Kharif: 'June - July',
  Rabi: 'October - November',
  Zaid: 'February - March',
};

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function soilSuitability(cropId, soil = {}) {
  const profile = CROP_NUTRITION[cropId];
  if (!profile) return 62;

  const withinRange = (value, range) => {
    if (!Number.isFinite(Number(value))) return 0.65;
    if (value >= range.min && value <= range.max) return 1;
    const distance = value < range.min ? range.min - value : value - range.max;
    return clamp(1 - distance / Math.max(range.max - range.min, 0.1), 0, 1);
  };
  const phScore = withinRange(Number(soil.ph), profile.ph);
  const ecScore = withinRange(Number(soil.ec), profile.ec);
  const values = [Number(soil.n), Number(soil.p), Number(soil.k)];
  const completeNpk = values.every(Number.isFinite) && values.every((value) => value > 0);

  // Soil sensors and reports may use different absolute NPK units. Comparing
  // relative nutrient balance is robust across both, unlike comparing raw
  // values with a hard-coded laboratory unit.
  let balanceScore = 0.65;
  if (completeNpk) {
    const actualTotal = values.reduce((sum, value) => sum + value, 0);
    const targetValues = [profile.N.ideal, profile.P.ideal, profile.K.ideal];
    const targetTotal = targetValues.reduce((sum, value) => sum + value, 0);
    const imbalance = values.reduce(
      (sum, value, index) => sum + Math.abs(value / actualTotal - targetValues[index] / targetTotal),
      0
    );
    balanceScore = clamp(1 - imbalance * 1.6, 0.15, 1);
  }
  return Math.round((phScore * 0.4 + ecScore * 0.25 + balanceScore * 0.35) * 100);
}

function cropIdFromRecord(record = {}) {
  return String(record.id || record.crop || record.cropName || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

/**
 * Predicts the next crop based on NPK, history, and season.
 * @param {Object} params - { currentCrop, npk: { n, p, k }, historyData, region, season }
 * @returns {Promise<Object>} prediction data
 */
export async function getCropPrediction({ currentCrop, npk = {}, historyData = [], region = '', season }) {
  const activeSeason = season || getAgriculturalSeason();
  const candidates = historyData
    .map((record) => {
      const cropId = cropIdFromRecord(record);
      const market = forecastPrice(record.history7d || record.history || [record.price]);
      const soil = soilSuitability(cropId, npk);
      const rotation = cropId === cropIdFromRecord({ crop: currentCrop }) ? 25 : 100;
      const marketScore = clamp(50 + (market.expectedChangePct || 0) * 4 + market.confidence * 0.35);
      const score = Math.round(marketScore * 0.5 + soil * 0.32 + rotation * 0.18);
      return { ...record, cropId, market, soil, rotation, score };
    })
    .filter((candidate) => candidate.cropId && candidate.market.available)
    .sort((left, right) => right.score - left.score);

  const forecastReady = candidates.filter((candidate) => candidate.market.observations >= 5);

  const best = forecastReady[0];
  if (!best) {
    return {
      recommendedCrop: 'Collecting verified market history',
      confidenceScore: 0,
      expectedPriceRange: 'Available after 5 daily reports',
      recommendedSowingWindow: SOWING_WINDOWS[activeSeason],
      reasoning: `The official ${region || 'mandi'} rate is visible, but the crop adviser will wait for five verified daily reports before making a price-based recommendation.`,
      model: 'Market history collection',
      status: 'collecting-history',
    };
  }

  const cropName = best.cropName || best.crop || best.cropId;
  const priceDirection = best.market.trend === 'up' ? 'is projected to rise' : best.market.trend === 'down' ? 'is projected to soften' : 'is projected to stay broadly stable';
  const rotationNote = best.rotation < 100 ? 'It matches the current crop, so rotate if field history permits.' : 'It also avoids repeating the current crop.';

  return {
    recommendedCrop: cropName,
    confidenceScore: Math.round(clamp(best.market.confidence * 0.65 + best.soil * 0.35, 20, 90)),
    expectedPriceRange: `₹${best.market.lowerBound} - ₹${best.market.upperBound}/Q`,
    recommendedSowingWindow: SOWING_WINDOWS[activeSeason],
    reasoning: `${cropName} scores highest for ${region || 'your market'}: its modal price ${priceDirection} over the next 7 days, with ${best.soil}% soil-fit score. ${rotationNote}`,
    model: 'Market forecast + soil suitability + crop rotation scoring',
    status: 'ready',
    details: {
      marketForecast: best.market,
      soilScore: best.soil,
      candidateScores: candidates.map(({ cropId, score }) => ({ cropId, score })),
    },
  };
}
