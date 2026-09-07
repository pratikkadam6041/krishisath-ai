/**
 * Crop-specific NPK ideal ranges and irrigation targets for Indian field crops.
 */

export const CROP_NUTRITION = {
  wheat: {
    targetMoisturePct: 55,
    minutesPer10PctDeficit: 12,
    N: { min: 40, max: 60, ideal: 50 },
    P: { min: 20, max: 35, ideal: 28 },
    K: { min: 30, max: 50, ideal: 40 },
    ph: { min: 6.0, max: 7.5, ideal: 6.8 },
    ec: { min: 0.8, max: 2.0, ideal: 1.4 },
  },
  tomato: {
    targetMoisturePct: 65,
    minutesPer10PctDeficit: 14,
    N: { min: 50, max: 80, ideal: 65 },
    P: { min: 25, max: 45, ideal: 35 },
    K: { min: 80, max: 120, ideal: 100 },
    ph: { min: 6.0, max: 6.8, ideal: 6.4 },
    ec: { min: 1.5, max: 3.0, ideal: 2.2 },
  },
  onion: {
    targetMoisturePct: 50,
    minutesPer10PctDeficit: 10,
    N: { min: 35, max: 55, ideal: 45 },
    P: { min: 18, max: 30, ideal: 24 },
    K: { min: 40, max: 70, ideal: 55 },
    ph: { min: 6.0, max: 7.0, ideal: 6.5 },
    ec: { min: 1.0, max: 2.2, ideal: 1.6 },
  },
  potato: {
    targetMoisturePct: 60,
    minutesPer10PctDeficit: 13,
    N: { min: 45, max: 70, ideal: 58 },
    P: { min: 22, max: 40, ideal: 32 },
    K: { min: 90, max: 140, ideal: 115 },
    ph: { min: 5.5, max: 6.5, ideal: 6.0 },
    ec: { min: 1.2, max: 2.5, ideal: 1.8 },
  },
  cotton: {
    targetMoisturePct: 58,
    minutesPer10PctDeficit: 15,
    N: { min: 55, max: 90, ideal: 72 },
    P: { min: 20, max: 35, ideal: 28 },
    K: { min: 35, max: 60, ideal: 48 },
    ph: { min: 6.0, max: 7.2, ideal: 6.6 },
    ec: { min: 1.0, max: 2.4, ideal: 1.7 },
  },
};

const DEFAULT = CROP_NUTRITION.wheat;

export function getCropWaterProfile(cropType) {
  return CROP_NUTRITION[cropType] || DEFAULT;
}

export function getNpkStatus(cropType, { nitrogen, phosphorus, potassium, ph, ec }) {
  const profile = getCropWaterProfile(cropType);
  const status = (value, range) => {
    if (value == null) return 'unknown';
    if (value < range.min) return 'low';
    if (value > range.max) return 'high';
    return 'good';
  };

  return {
    N: status(nitrogen, profile.N),
    P: status(phosphorus, profile.P),
    K: status(potassium, profile.K),
    ph: status(ph, profile.ph),
    ec: status(ec, profile.ec),
    ranges: profile,
  };
}
