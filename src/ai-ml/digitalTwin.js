/**
 * digitalTwin.js — Farm Digital Twin simulation engine
 * KrishiSarth AI | ai-ml module
 *
 * Simulates real-world farm physics to predict outcomes
 * before executing hardware commands.
 */

import { getZonePhysics } from '../utils/zoneConstants.js';

const PUMP_POWER_KW = 0.75;     // RS385 pump ~750W
const ELECTRICITY_RATE = 8;     // ₹/kWh
const WATER_RATE = 0.05;        // ₹/litre

/**
 * Predict outcomes of running a pump for given duration
 * @param {string} zoneId - 'z1' | 'z2'
 * @param {number} durationHours - pump run duration
 * @param {object} currentState - {moisture, temperature, humidity, rainProb}
 * @returns {PredictionResult}
 */
export function predictPumpOutcome(zoneId, durationHours, currentState) {
  const zone = getZonePhysics(zoneId);
  const { moisture, temperature = 28, humidity = 60, rainProb = 0 } = currentState;

  // Volume of water applied
  const waterLitres = zone.pumpFlowLpm * durationHours * 60;

  // Soil moisture calculation
  // soil volume = area × depth × bulk density factor
  const soilVolumeLitres = zone.areaM2 * zone.soilDepthM * 1000 * 0.5; // 50% porosity
  const moistureIncrease = (waterLitres / soilVolumeLitres) * 100;
  const rawMoisture = moisture + moistureIncrease;

  // Apply drainage — soil can't exceed field capacity
  const moistureAfter = Math.min(rawMoisture, zone.fieldCapacity);

  // Energy and cost
  const electricKwh = PUMP_POWER_KW * durationHours;
  const electricCost = electricKwh * ELECTRICITY_RATE;
  const waterCost = waterLitres * WATER_RATE;
  const totalCost = electricCost + waterCost;

  // Time to optimal (target 65% moisture)
  const TARGET = 65;
  let timeToOptimalH = null;
  if (moisture < TARGET) {
    const neededLitres = ((TARGET - moisture) / 100) * soilVolumeLitres;
    timeToOptimalH = Math.round((neededLitres / zone.pumpFlowLpm) / 60 * 10) / 10;
  }

  // Warnings
  const warnings = [];
  if (rainProb > 40) warnings.push({ type: 'rain', hoursUntilRain: Math.round(24 * (1 - rainProb / 100)) });
  if (moistureAfter > zone.fieldCapacity * 0.95) warnings.push({ type: 'overwater' });
  if (temperature > 36) warnings.push({ type: 'heat' });

  return {
    zoneId,
    durationHours,
    waterLitres: Math.round(waterLitres),
    moistureBefore: Math.round(moisture * 10) / 10,
    moistureAfter: Math.round(moistureAfter * 10) / 10,
    electricKwh: Math.round(electricKwh * 100) / 100,
    electricCost: Math.round(electricCost * 100) / 100,
    waterCost: Math.round(waterCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    timeToOptimalH,
    warnings,
  };
}

/**
 * Predict valve open outcome (for zone flow control)
 */
export function predictValveOutcome(zoneId, durationHours, currentState) {
  return predictPumpOutcome(zoneId, durationHours * 0.6, currentState); // valve partial flow
}

/**
 * Predict fertigation outcome
 * @param {string} tank - 'tankA' | 'tankB' | 'tankC'
 * @param {number} doseMl - dose in ml
 * @param {object} currentState - {ec, ph, nitrogen, phosphorus, potassium}
 */
export function predictFertigationOutcome(tank, doseMl, currentState) {
  const { ec = 1.0, nitrogen = 150, phosphorus = 80, potassium = 180 } = currentState;

  const factors = {
    tankA: { field: 'nitrogen',  unitChange: doseMl * 0.8  },
    tankB: { field: 'phosphorus', unitChange: doseMl * 0.5 },
    tankC: { field: 'potassium',  unitChange: doseMl * 0.6 },
  };

  const factor = factors[tank] || factors.tankA;
  const currentVal = currentState[factor.field] || 100;
  const afterVal = Math.round(currentVal + factor.unitChange);
  const ecAfter = Math.round((ec + doseMl * 0.002) * 100) / 100;

  return {
    tank, doseMl,
    field: factor.field,
    valueBefore: currentVal,
    valueAfter: afterVal,
    ecBefore: ec,
    ecAfter,
    warnings: ecAfter > 2.5 ? [{ type: 'ec_high' }] : [],
  };
}

/**
 * Generate twin state from current zone data (for visualization)
 */
export function getTwinState(zones, tanks, mqttConnected) {
  const zoneEntries = Object.values(zones || {}).reduce((acc, zone) => {
    if (!zone?.id) return acc;
    acc[zone.id] = {
      ...zone,
      healthStatus: getMoistureStatus(zone.moisture),
      pumpAnimating: zone.pumpOn,
      flowAnimating: zone.valveOpen && zone.pumpOn,
    };
    return acc;
  }, {});

  return {
    zones: zoneEntries,
    tanks,
    mqttConnected,
  };
}

function getMoistureStatus(m = 0) {
  if (m < 25) return 'critical';
  if (m < 45) return 'low';
  if (m > 80) return 'high';
  return 'optimal';
}
