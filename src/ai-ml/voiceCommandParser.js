/**
 * voiceCommandParser.js — Hindi/Marathi/English voice command intent parser
 * KrishiSarth AI | ai-ml module
 *
 * Parses farmer voice commands into structured hardware action intents.
 * Supports pump, valve, fertigation control per zone.
 */

// Helper to convert word numbers to digits
function mapNum(val) {
  const map = {
    'one': 1, 'ek': 1, 'एक': 1,
    'two': 2, 'do': 2, 'don': 2, 'दो': 2, 'दोन': 2,
    'three': 3, 'teen': 3, 'तीन': 3,
    'four': 4, 'char': 4, 'चार': 4
  };
  return map[val.toLowerCase()] || val;
}

// Zone identification patterns
const ZONE_PATTERNS = [
  { regex: /zone[\s-]?(one|two|three|four|ek|do|don|teen|char|\d+)/i, extract: (m) => `z${mapNum(m[1])}` },
  { regex: /(?:ज़ोन|जोन)[\s]?(एक|दो|तीन|चार|\d+)/u, extract: (m) => `z${mapNum(m[1])}` },
  { regex: /झोन[\s]?(एक|दोन|तीन|चार|\d+)/u, extract: (m) => `z${mapNum(m[1])}` },
  { regex: /\bz(\d+)\b/i, extract: (m) => `z${m[1]}` },
  { regex: /north\s*field/i, extract: () => 'z1' },
  { regex: /south\s*orchard/i, extract: () => 'z2' },
  { regex: /नॉर्थ|north/i, extract: () => 'z1' },
  { regex: /साउथ|south/i, extract: () => 'z2' },
];

// Action patterns — pump ON
const PUMP_ON_PATTERNS = [
  /(pump|water|irrigation).*?\b(on|start|chalu|chaalu|shuru|suru|chal)\b/i,
  /\b(start|turn\s*on|open)\b.*?(pump|water|irrigation)/i,
  /(पंप|सिंचाई).*?(चालू|शुरू|ऑन|चालु|सुरू)/u,
  /(चालू|शुरू|ऑन|चालु|सुरू).*?(पंप|सिंचाई)/u,
  /(paani|pani).*?\b(do|de|daal|chalu|chaalu|suru)\b/i,
  /(पानी).*?(दो|दे|डाल|चालू|शुरू|सुरू)/u,
];

// Action patterns — pump OFF
const PUMP_OFF_PATTERNS = [
  /(pump|water|irrigation|paani|pani).*?\b(off|stop|band|bandh|roko|thamba|thambav|thambwa|thambawa)\b/i,
  /\b(stop|turn\s*off|shut\s*off|close|band|bandh)\b.*?(pump|water|irrigation|paani|pani)/i,
  /(पंप|सिंचाई|पानी).*?(बंद|बंध|रोको|बन्द|ऑफ|ऑफ़|थांबवा|थांबव|थांबा)/u,
  /(बंद|बंध|रोको|बन्द|ऑफ|ऑफ़|थांबवा|थांबव|थांबा).*?(पंप|सिंचाई|पानी)/u,
];

// Action patterns — valve open
const VALVE_OPEN_PATTERNS = [
  /valve\s*(open|khol|kholna)/i,
  /वाल्व\s*(खोलो|खोलें|ओपन)/u,
];

// Action patterns — valve close
const VALVE_CLOSE_PATTERNS = [
  /valve\s*(close|band|close)/i,
  /वाल्व\s*(बंद)/u,
];

// Action patterns — ask for status/recommendation
const STATUS_PATTERNS = [
  /status|report|kitna|kya\s*hal/i,
  /सलाह|सुझाव|रिपोर्ट|स्थिति/u,
  /namee?\s*kitni/i,
  /नमी\s*कितनी/u,
  /paani\s*kab/i,
  /पानी\s*कब/u,
  /mujhe\s*batao/i,
  /मुझे\s*बताओ/u,
];

// Action patterns — schedule irrigation
const SCHEDULE_PATTERNS = [
  /schedule|calendar|plan\s*irrigation/i,
  /कल\s*सुबह|kal\s*subah/i,
  /shedyul|शेड्यूल/i,
];

function detectZone(text, availableZones = []) {
  for (const pattern of ZONE_PATTERNS) {
    const m = text.match(pattern.regex);
    if (m) {
      const zoneId = pattern.extract(m);
      // Validate against available zones
      if (availableZones.length === 0 || availableZones.includes(zoneId)) {
        return zoneId;
      }
    }
  }
  // Default to first zone if only one exists
  if (availableZones.length === 1) return availableZones[0];
  return null;
}

function detectAction(text) {
  // Check OFF first to prevent "stop pump on zone 2" matching "on"
  if (PUMP_OFF_PATTERNS.some((p) => p.test(text))) return 'PUMP_OFF';
  if (PUMP_ON_PATTERNS.some((p) => p.test(text))) return 'PUMP_ON';
  if (VALVE_CLOSE_PATTERNS.some((p) => p.test(text))) return 'VALVE_CLOSE';
  if (VALVE_OPEN_PATTERNS.some((p) => p.test(text))) return 'VALVE_OPEN';
  if (STATUS_PATTERNS.some((p) => p.test(text))) return 'STATUS';
  if (SCHEDULE_PATTERNS.some((p) => p.test(text))) return 'SCHEDULE';
  return null;
}

/**
 * Parse a farmer voice command into a structured intent.
 * @param {string} text - raw voice transcript
 * @param {string[]} availableZones - zone IDs currently configured ['z1','z2',...]
 * @returns {{ intent: string, zoneId: string|null, device: string, action: string, raw: string } | null}
 */
export function parseFarmerCommand(text, availableZones = []) {
  if (!text || text.length < 3) return null;

  const action = detectAction(text);
  if (!action) return null;

  const zoneId = detectZone(text, availableZones);

  let device = 'pump';
  if (action === 'VALVE_OPEN' || action === 'VALVE_CLOSE') device = 'valve';

  return {
    intent: action,
    zoneId,
    device,
    action: action.includes('ON') || action.includes('OPEN') ? 'on' : 'off',
    raw: text,
    needsZone: zoneId === null && (action === 'PUMP_ON' || action === 'PUMP_OFF'),
  };
}

/**
 * Generate a confirmation message for a parsed command
 */
export function buildConfirmMessage(cmd, zones = {}, language = 'hi') {
  const zoneName = cmd.zoneId ? zones[cmd.zoneId]?.name || cmd.zoneId : null;

  if (language === 'mr') {
    if (!cmd.zoneId) return 'कोणता झोन? Zone 1 किंवा Zone 2 सांगा.';
    if (cmd.intent === 'PUMP_ON') return `${zoneName} मध्ये पाणी सुरू करू का?`;
    if (cmd.intent === 'PUMP_OFF') return `${zoneName} चा पंप बंद करू का?`;
    return `${zoneName} साठी ${cmd.device} ${cmd.action === 'on' ? 'सुरू' : 'बंद'} करू का?`;
  }
  if (language === 'en') {
    if (!cmd.zoneId) return 'Which zone? Please say Zone 1 or Zone 2.';
    if (cmd.intent === 'PUMP_ON') return `Start irrigation on ${zoneName}?`;
    if (cmd.intent === 'PUMP_OFF') return `Stop pump on ${zoneName}?`;
    return `${cmd.action === 'on' ? 'Start' : 'Stop'} ${cmd.device} on ${zoneName}?`;
  }
  // Hindi default
  if (!cmd.zoneId) return 'कौन सा ज़ोन? ज़ोन 1 या ज़ोन 2 बोलें।';
  if (cmd.intent === 'PUMP_ON') return `${zoneName} में सिंचाई शुरू करें?`;
  if (cmd.intent === 'PUMP_OFF') return `${zoneName} का पंप बंद करें?`;
  return `${zoneName} का ${cmd.device} ${cmd.action === 'on' ? 'चालू' : 'बंद'} करें?`;
}
