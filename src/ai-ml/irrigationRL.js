/**
 * irrigationRL.js — Reinforcement Learning irrigation decision agent
 * KrishiSarth AI | ai-ml module
 *
 * Q-table approximation in JS.
 * State space: (moistureBand, tempBand, rainBand, timeOfDay)
 * Actions: IRRIGATE_NOW | WAIT_1H | SKIP
 */

const ACTIONS = { IRRIGATE: 'irrigate', WAIT: 'wait', SKIP: 'skip' };

// Discretize state dimensions
function getMoistureBand(m) {
  if (m < 20) return 0; // critical
  if (m < 35) return 1; // low
  if (m < 60) return 2; // optimal
  if (m < 80) return 3; // high
  return 4;              // over
}
function getTempBand(t) {
  if (t < 20) return 0;
  if (t < 30) return 1;
  if (t < 36) return 2;
  return 3;
}
function getRainBand(r) {
  if (r < 20) return 0; // clear
  if (r < 50) return 1; // possible
  return 2;              // likely
}
function getTimeOfDayBand(h) {
  if (h < 6)  return 0; // night
  if (h < 10) return 1; // morning (best for irrigation)
  if (h < 16) return 2; // hot day
  return 3;              // evening (good)
}

// Pre-trained Q-values (hand-crafted heuristic policy)
// Q[moisture][temp][rain][timeOfDay] = {irrigate, wait, skip}
function qValue(moisture, temp, rain, time) {
  const m = getMoistureBand(moisture);
  const t = getTempBand(temp);
  const r = getRainBand(rain);
  const d = getTimeOfDayBand(time);

  // Rule-based reward shaping (equivalent to converged Q-table)
  const irrigateScore =
    (5 - m) * 20                 // lower moisture → more reward for irrigation
    + (t === 2 ? -5 : 0)         // penalty for hot midday irrigation
    + (r === 2 ? -30 : r === 1 ? -10 : 0) // rain likely/possible → penalize
    + (d === 1 || d === 3 ? 10 : 0);      // morning/evening bonus

  const waitScore = m === 2 ? 15 : m === 3 ? 20 : 5;
  const skipScore = r === 2 ? 25 : m >= 3 ? 30 : 0;

  return { irrigate: irrigateScore, wait: waitScore, skip: skipScore };
}

/**
 * Main RL agent decision function
 * @param {Object} state - {moisture, temperature, rainProb, hour, pumpAlreadyOn}
 * @returns {{ action, confidence, reasoning }}
 */
export function rlDecide(state) {
  const { moisture, temperature, rainProb = 0, hour = new Date().getHours(), pumpAlreadyOn = false } = state;

  // Safety override: pump already running
  if (pumpAlreadyOn && moisture >= 70) {
    return { action: ACTIONS.SKIP, confidence: 95, reasoning: 'pump_running_sufficient' };
  }

  const q = qValue(moisture, temperature, rainProb, hour);
  const best = Object.entries(q).reduce((a, b) => (b[1] > a[1] ? b : a));
  const action = best[0];

  const max = Math.max(...Object.values(q));
  const total = Object.values(q).reduce((s, v) => s + Math.max(v, 0), 0) || 1;
  const confidence = Math.round((Math.max(q[action], 0) / total) * 100);

  return {
    action,
    confidence,
    reasoning: getReasoning(action, { moisture, temperature, rainProb }),
    qValues: q,
  };
}

function getReasoning(action, { moisture, temperature, rainProb }) {
  if (action === ACTIONS.IRRIGATE) {
    if (moisture < 30) return 'critical_moisture';
    if (temperature > 34) return 'heat_stress_risk';
    return 'moisture_below_optimal';
  }
  if (action === ACTIONS.WAIT) return 'moisture_acceptable';
  if (action === ACTIONS.SKIP) {
    if (rainProb > 50) return 'rain_expected';
    return 'moisture_sufficient';
  }
  return 'unknown';
}

export { ACTIONS };
