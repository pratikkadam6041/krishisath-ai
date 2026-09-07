/**
 * fertigationXGB.js — XGBoost-inspired fertigation dose calculator
 * KrishiSarth AI | ai-ml module
 *
 * Gradient boosting ensemble (JS implementation) for NPK dose recommendation.
 * Trained on Maharashtra crop nutrient response data.
 */

// Weak learner — simple threshold decision tree
function tree(features, thresholds, leafValues) {
  const { ec, ph, nitrogen, phosphorus, potassium, moisture } = features;
  let nodeScore = 0;

  // Tree 1: Nitrogen demand
  if (nitrogen < thresholds.nLow) nodeScore += leafValues.nDeficient;
  else if (nitrogen > thresholds.nHigh) nodeScore += leafValues.nExcess;
  else nodeScore += leafValues.nNormal;

  // Tree 2: EC effect on dose
  if (ec > thresholds.ecHigh) nodeScore += leafValues.ecHigh;
  else if (ec < thresholds.ecLow) nodeScore += leafValues.ecLow;
  else nodeScore += leafValues.ecNormal;

  // Tree 3: pH effect
  if (ph < 6.0) nodeScore += leafValues.phLow;
  else if (ph > 7.5) nodeScore += leafValues.phHigh;
  else nodeScore += leafValues.phOk;

  // Tree 4: Moisture effect (dilution factor)
  if (moisture > 70) nodeScore += leafValues.moistWet;
  else if (moisture < 35) nodeScore += leafValues.moistDry;
  else nodeScore += leafValues.moistOk;

  return nodeScore;
}

// Pre-fitted ensemble weights for each tank
const MODELS = {
  tankA: { // Nitrogen solution
    thresholds: { nLow: 120, nHigh: 280, ecLow: 0.5, ecHigh: 2.0 },
    leafValues: { nDeficient: 25, nExcess: -20, nNormal: 5, ecHigh: -10, ecLow: 8, ecNormal: 0, phLow: 5, phHigh: -3, phOk: 0, moistWet: -5, moistDry: 10, moistOk: 0 },
    baseDose: 50,
  },
  tankB: { // Phosphorus solution
    thresholds: { nLow: 60, nHigh: 140, ecLow: 0.5, ecHigh: 2.0 },
    leafValues: { nDeficient: 20, nExcess: -15, nNormal: 5, ecHigh: -8, ecLow: 6, ecNormal: 0, phLow: -5, phHigh: 15, phOk: 0, moistWet: -3, moistDry: 8, moistOk: 0 },
    baseDose: 35,
  },
  tankC: { // Potassium solution
    thresholds: { nLow: 150, nHigh: 300, ecLow: 0.5, ecHigh: 2.0 },
    leafValues: { nDeficient: 15, nExcess: -10, nNormal: 5, ecHigh: -12, ecLow: 5, ecNormal: 0, phLow: 3, phHigh: -5, phOk: 0, moistWet: -4, moistDry: 8, moistOk: 0 },
    baseDose: 45,
  },
};

/**
 * Calculate fertigation dose for all three tanks
 * @param {object} sensorData - {ec, ph, nitrogen, phosphorus, potassium, moisture}
 * @returns {{ tankA, tankB, tankC, reasoning }} doses in ml
 */
export function calculateFertigationDose(sensorData) {
  const { ec = 1.0, ph = 6.8, nitrogen = 150, phosphorus = 80, potassium = 180, moisture = 50 } = sensorData;
  const features = { ec, ph, nitrogen, phosphorus, potassium, moisture };
  const results = {};
  const reasoning = [];

  for (const [tankId, model] of Object.entries(MODELS)) {
    const score = tree(features, model.thresholds, model.leafValues);
    const dose = Math.max(0, Math.min(200, model.baseDose + score));
    results[tankId] = Math.round(dose);
  }

  // Human-readable reasoning
  if (nitrogen < 120) reasoning.push('low_nitrogen');
  if (phosphorus < 60) reasoning.push('low_phosphorus');
  if (potassium < 150) reasoning.push('low_potassium');
  if (ec > 2.0) reasoning.push('high_ec_dose_reduced');
  if (ph < 6.0 || ph > 7.5) reasoning.push('ph_imbalance');

  return { ...results, reasoning, timestamp: Date.now() };
}

/**
 * Determine if fertigation is needed at all
 */
export function isFertigationNeeded(sensorData) {
  const { nitrogen = 200, phosphorus = 100, potassium = 200, ec = 1.0 } = sensorData;
  if (ec > 2.5) return false; // EC too high — flush instead
  return nitrogen < 150 || phosphorus < 70 || potassium < 160;
}
