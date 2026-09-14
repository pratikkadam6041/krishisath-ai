/**
 * animalRiskEngine.js - Predicts risk of animal intrusion
 * KrishiSarth AI | ai-ml module
 */

const ANIMAL_TYPES = ['Boar', 'Deer', 'Monkey', 'Stray Cattle', 'Elephant', 'Nilgai', 'Rodent', 'Birds'];

export function calculateAnimalRisk(zone, weather, timeOfDayHour, cropStage, recentIncidents = []) {
  let score = 10; // Baseline risk
  const reasons = [];
  const likelyThreats = [];
  let confidence = 0.5;

  // Time of Day Factors
  if (timeOfDayHour >= 18 || timeOfDayHour <= 5) {
    score += 40;
    reasons.push({ key: 'night_time', desc: 'Night time increases nocturnal animal activity (Boar, Deer)' });
    likelyThreats.push('Boar', 'Deer', 'Nilgai');
    confidence += 0.2;
  } else {
    score += 10;
    likelyThreats.push('Monkey', 'Stray Cattle', 'Birds');
  }

  // Crop Stage Factors
  if (cropStage === 'fruition' || cropStage === 'harvesting') {
    score += 30;
    reasons.push({ key: 'crop_stage', desc: `Crop is in high-value stage (${cropStage}), attracting herbivores` });
    confidence += 0.1;
  } else if (cropStage === 'germination') {
    score += 15;
    likelyThreats.push('Birds');
  }

  // Weather Factors
  if (weather && weather.temp < 15) {
    score += 10;
    reasons.push({ key: 'cold_weather', desc: 'Cold weather might drive animals towards covered areas' });
  }

  // Recent Incidents Multiplier
  if (recentIncidents.length > 0) {
    const recent = recentIncidents.filter(inc => (Date.now() - inc.timestamp) < (7 * 24 * 60 * 60 * 1000));
    if (recent.length > 0) {
      score += Math.min(20, recent.length * 5);
      reasons.push({ key: 'recent_incidents', desc: `${recent.length} incidents in the last 7 days` });
      confidence += 0.1;
    }
  }

  // Deduplicate and filter threats
  const uniqueThreats = [...new Set(likelyThreats)].slice(0, 3);
  
  // Cap at 100
  score = Math.min(100, score);
  
  // Risk Level Map
  let level = 'LOW';
  if (score >= 80) level = 'CRITICAL';
  else if (score >= 50) level = 'HIGH';
  else if (score >= 30) level = 'MEDIUM';

  return {
    score,
    level,
    reasons,
    likelyThreats: uniqueThreats,
    confidence: Math.min(1.0, confidence),
    highRiskPeriod: { start: '18:00', end: '05:00' }
  };
}
