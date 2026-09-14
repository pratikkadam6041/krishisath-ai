/**
 * zoneIntelligence.js - Computes overall zone health score
 * KrishiSarth AI | ai-ml module
 */

export function calculateZoneHealthScore(zone, weather, animalRiskScore = 0) {

  let score = 100;
  const metrics = [];

  // 1. Moisture Constraint (25%)
  const moisture = zone.moisture || 0;
  if (moisture >= 50 && moisture <= 70) {
    metrics.push({ name: 'Moisture', impact: 0, status: 'Optimal' });
  } else if (moisture < 35 || moisture > 85) {
    score -= 25;
    metrics.push({ name: 'Moisture', impact: -25, status: moisture < 35 ? 'Critical Low' : 'Critical High' });
  } else {
    score -= 10;
    metrics.push({ name: 'Moisture', impact: -10, status: 'Sub-optimal' });
  }

  // 2. Weather Impact (20% - Temp & Humidity)
  const temp = zone.temperature || weather?.temp || 28;
  if (temp > 38 || temp < 10) {
    score -= 10;
    metrics.push({ name: 'Temperature Stress', impact: -10, status: 'High' });
  }

  // 3. Animal Risk Impact (15%)
  if (animalRiskScore > 0) {
    const riskImpact = Math.round((animalRiskScore / 100) * 15);
    if (riskImpact > 0) {
      score -= riskImpact;
      metrics.push({ name: 'Animal Risk', impact: -riskImpact, status: 'Active Threat' });
    }
  }

  // Cap Score
  score = Math.max(0, Math.min(100, score));

  let label = 'Healthy';
  if (score < 50) label = 'Critical';
  else if (score < 80) label = 'Attention Needed';

  return {
    score,
    label,
    metrics
  };
}

export const calculateZoneHealth = calculateZoneHealthScore;

