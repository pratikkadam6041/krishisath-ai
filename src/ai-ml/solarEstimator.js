/**
 * solarEstimator.js - Estimates solar panel power generation
 * KrishiSarth AI | ai-ml module
 */

// Simple estimation algorithm
export function estimateSolarGeneration(lat, lon, weather, config, timeOfDayHour) {
  const { panelCapacityKw, batteryCapacityKwh } = config;
  
  // Basic daylight check (simplified, could use actual sunrise/sunset from OpenMeteo)
  let isDaylight = timeOfDayHour >= 6 && timeOfDayHour <= 18;
  let currentGenerationKw = 0;
  
  if (isDaylight) {
    // Peak sun is around 12-14
    const solarAngleFactor = 1 - Math.abs(13 - timeOfDayHour) / 7; // Peak at 1.0, drops to ~0 at 6 and 20
    
    // Cloud cover / weather impact
    let weatherFactor = 1.0;
    if (weather) {
      if (weather.condition.includes('Rain') || weather.condition.includes('Thunderstorm')) {
        weatherFactor = 0.2;
      } else if (weather.condition.includes('Cloud')) {
        weatherFactor = 0.5;
      }
    }
    
    currentGenerationKw = panelCapacityKw * Math.max(0, solarAngleFactor) * weatherFactor;
  }
  
  // Rough estimate of daily total based on current weather for the next few days
  // In a real app, this would integrate over the hourly forecast
  const avgPeakHours = 5; 
  let weatherFactorDaily = 1.0;
  if (weather && weather.rainProb > 50) weatherFactorDaily = 0.4;
  else if (weather && weather.rainProb > 20) weatherFactorDaily = 0.7;
  
  const totalGeneratedTodayKwh = panelCapacityKw * avgPeakHours * weatherFactorDaily;
  
  return {
    currentGenerationKw: parseFloat(currentGenerationKw.toFixed(2)),
    totalGeneratedTodayKwh: parseFloat(totalGeneratedTodayKwh.toFixed(1)),
    isAvailable: currentGenerationKw > (panelCapacityKw * 0.1),
    estimatedPeakWindow: { start: 10, end: 15 }
  };
}
