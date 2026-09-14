/**
 * solarIrrigationOptimizer.js - Integrates solar constraints into irrigation schedule
 * KrishiSarth AI | services module
 */

import { estimateSolarGeneration } from '../ai-ml/solarEstimator.js';

/**
 * Wraps the existing irrigation decision logic to prefer solar hours
 * @param {Object} originalDecision - Decision from rlDecide or static schedule
 * @param {Object} solarConfig - Config from solarStore
 * @param {Object} weather - Current weather
 * @returns {Object} Modified decision
 */
export function optimizeDecisionForSolar(originalDecision, solarConfig, weather, targetHour) {
    // If not enabled or no solar panel config, return original
    if (!solarConfig || !solarConfig.isSolarAwareIrrigationEnabled || solarConfig.panelCapacityKw <= 0) {
        return originalDecision;
    }

    // Never override 'urgent' needs
    if (originalDecision.action === 'irrigate' && originalDecision.confidence > 0.8) {
       return {
           ...originalDecision,
           solarOptimized: false,
           reasoning: `${originalDecision.reasoning} (Urgent: overriding solar constraint)`
       };
    }

    // Estimate solar availability at target hour
    const estimate = estimateSolarGeneration(0, 0, weather, solarConfig, targetHour);
    
    // If we want to irrigate but no solar is available (and it's not urgent)
    if (originalDecision.action === 'irrigate' && !estimate.isAvailable && targetHour < 18) {
        // Suggest waiting for peak solar
        return {
            action: 'wait',
            confidence: 0.7,
            solarOptimized: true,
            reasoning: `Waiting for optimal solar generation window (Est. ${estimate.estimatedPeakWindow.start}:00 - ${estimate.estimatedPeakWindow.end}:00)`
        };
    }

    // Ensure we tag it so UI can show it was considered
    return {
        ...originalDecision,
        solarOptimized: true
    };
}
