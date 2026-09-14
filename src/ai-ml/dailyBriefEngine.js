/**
 * dailyBriefEngine.js - Aggregates daily farm summary
 * KrishiSarth AI | ai-ml module
 */

import { calculateAnimalRisk } from './animalRiskEngine.js';

export function generateDailyBrief(zones, weather, solarConfig, solarEstimates) {
  let overallScore = 0;
  const zoneList = Object.values(zones);
  const totalZones = zoneList.length;
  
  const brief = {
    date: new Date().toISOString(),
    overallHealth: 'Good',
    highlights: [],
    actionItems: [],
    metrics: {}
  };

  if (totalZones === 0) {
    brief.overallHealth = 'Unknown';
    brief.highlights.push({ type: 'info', text: 'No zones configured. Add a zone to start monitoring.' });
    return brief;
  }

  // Assess Moisture
  const lowMoistureZones = zoneList.filter(z => (z.moisture || 0) < 40);
  if (lowMoistureZones.length > 0) {
    brief.actionItems.push({
      type: 'water',
      text: `${lowMoistureZones.length} zone(s) need water today.`
    });
  }

  // Access Weather
  if (weather && weather.rainProb > 50) {
    brief.highlights.push({
      type: 'weather',
      text: `High chance of rain (${weather.rainProb}%). Delay irrigation.`
    });
  } else {
      brief.highlights.push({
          type: 'weather',
          text: `Clear weather for farming activities today.`
      });
  }

  // Assess Animal Risk (Generalize across farm)
  let maxAnimalRisk = 0;
  zoneList.forEach(z => {
      const risk = calculateAnimalRisk(z, weather, new Date().getHours(), z.cropStage || 'growing');
      if (risk.score > maxAnimalRisk) maxAnimalRisk = risk.score;
  });

  if (maxAnimalRisk > 50) {
      brief.actionItems.push({
          type: 'security',
          text: `High animal risk detected. Check protection settings.`
      });
  }

  // Solar Metrics
  if (solarConfig && solarEstimates && solarConfig.panelCapacityKw > 0) {
      if (solarEstimates.totalGeneratedTodayKwh > 0) {
           brief.metrics.solar = {
               label: 'Est. Solar Generation',
               value: `${solarEstimates.totalGeneratedTodayKwh} kWh`
           };
      }
  }

  return brief;
}
