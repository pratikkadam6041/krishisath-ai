/**
 * voiceCommandParser.js — Hindi/Marathi/English voice command intent parser
 * KrishiSarth AI | ai-ml module
 *
 * Parses farmer voice commands into structured hardware action intents.
 * Supports pump, valve, fertigation control per zone.
 */

// Helper to convert word numbers to digits
function mapNum(val) {
  const clean = String(val || '').toLowerCase().trim();
  const map = {
    '1': 1, '१': 1, 'one': 1, 'won': 1, 'wan': 1, 'wun': 1, 'van': 1, 'vun': 1, 'first': 1, 'वन': 1, 'ek': 1, 'eka': 1, 'एक': 1, 'एका': 1, 'पहिला': 1, 'पहिली': 1, 'पहिल्या': 1, 'पहिले': 1,
    '2': 2, '२': 2, 'two': 2, 'to': 2, 'too': 2, 'tu': 2, 'do': 2, 'don': 2, 'second': 2, 'दो': 2, 'दोन': 2, 'दुसरा': 2, 'दुसरी': 2, 'दुसऱ्या': 2, 'दुसरे': 2,
    '3': 3, '३': 3, 'three': 3, 'tree': 3, 'teen': 3, 'तीन': 3, 'तिसरा': 3, 'तिसरी': 3, 'तिसऱ्या': 3,
    '4': 4, '४': 4, 'four': 4, 'for': 4, 'char': 4, 'चार': 4, 'चौथा': 4, 'चौथी': 4, 'चौथ्या': 4
  };
  return map[clean] || clean;
}

// Zone identification patterns
const ZONE_NUMBER_WORDS = 'one|won|wan|wun|van|vun|first|वन|two|too|to|tu|second|three|tree|four|for|ek|eka|do|don|teen|char|एक|एका|दो|दोन|तीन|चार|पहिला|पहिली|पहिल्या|पहिले|दुसरा|दुसरी|दुसऱ्या|दुसरे|तिसरा|तिसरी|तिसऱ्या|चौथा|चौथी|चौथ्या|[1-4]|[१-४]';
const ZONE_PATTERNS = [
  { regex: new RegExp(`(?:zone|zones|jon|john|झोन|जोन|ज़ोन|जॉन)\\s*(?:number|no\\.?|नंबर|क्रमांक|नं)?\\s*(${ZONE_NUMBER_WORDS})`, 'iu'), extract: (m) => `z${mapNum(m[1])}` },
  { regex: new RegExp(`(${ZONE_NUMBER_WORDS})\\s*(?:number|no\\.?|नंबर|क्रमांक|नं)?\\s*(?:zone|zones|झोन|जोन|ज़ोन)`, 'iu'), extract: (m) => `z${mapNum(m[1])}` },
  { regex: /\bz\s*([1-4])\b/i, extract: (m) => `z${m[1]}` },
  { regex: /झेड\s*([१-४1-4])/u, extract: (m) => `z${mapNum(m[1])}` },
  { regex: /north\s*field/i, extract: () => 'z1' },
  { regex: /south\s*orchard/i, extract: () => 'z2' },
  { regex: /नॉर्थ|north/i, extract: () => 'z1' },
  { regex: /साउथ|south/i, extract: () => 'z2' },
];

const LOOSE_ZONE_NUMBERS = [
  { zoneId: 'z1', regex: /(?:^|[\s,.;:-])(1|१|one|won|wan|wun|van|vun|first|ek|eka|एक|एका|वन|पहिला|पहिली|पहिल्या|पहिले)(?=$|[\s,.;:-])/iu },
  { zoneId: 'z2', regex: /(?:^|[\s,.;:-])(2|२|two|too|tu|second|do|don|दो|दोन|दुसरा|दुसरी|दुसऱ्या|दुसरे)(?=$|[\s,.;:-])/iu },
  { zoneId: 'z3', regex: /(?:^|[\s,.;:-])(3|३|three|tree|teen|तीन|तिसरा|तिसरी|तिसऱ्या)(?=$|[\s,.;:-])/iu },
  { zoneId: 'z4', regex: /(?:^|[\s,.;:-])(4|४|four|for|char|चार|चौथा|चौथी|चौथ्या)(?=$|[\s,.;:-])/iu },
];

// Action patterns — pump ON
const PUMP_ON_PATTERNS = [
  /(pump|water|irrigation).*?\b(on|start|chalu|chaalu|shuru|suru|chal)\b/i,
  /(pump|water|irrigation|paani|pani).*?(चालू|चालु|सुरू|करा|लावा|ऑन|शुरू)/iu,
  /(चालू|चालु|सुरू|लावा|ऑन|शुरू).*?(pump|water|irrigation|paani|pani)/iu,
  /\b(start|turn\s*on|open)\b.*?(pump|water|irrigation)/i,
  /(पंप|पाणी|सिंचन|सिंचाई).*?(चालू|चालु|सुरू|करा|लावा|ऑन|शुरू)/u,
  /(चालू|चालु|सुरू|लावा|ऑन|शुरू).*?(पंप|पाणी|सिंचन|सिंचाई)/u,
  /(paani|pani).*?\b(do|de|daal|chalu|chaalu|suru)\b/i,
  /(पानी).*?(दो|दे|डाल|चालू|शुरू|सुरू)/u,
];

// Action patterns — pump OFF
const PUMP_OFF_PATTERNS = [
  /(pump|water|irrigation|paani|pani).*?\b(off|stop|band|bandh|roko|thamba|thambav|thambwa|thambawa)\b/i,
  /(pump|water|irrigation|paani|pani).*?(बंद|बंध|रोको|बन्द|ऑफ|ऑफ़|थांबवा|थांबव|थांबा)/iu,
  /(बंद|बंध|रोको|बन्द|ऑफ|ऑफ़|थांबवा|थांबव|थांबा).*?(pump|water|irrigation|paani|pani)/iu,
  /\b(stop|turn\s*off|shut\s*off|close|band|bandh)\b.*?(pump|water|irrigation|paani|pani)/i,
  /(पंप|पाणी|सिंचन|सिंचाई|पानी).*?(बंद|बंध|रोको|बन्द|ऑफ|ऑफ़|थांबवा|थांबव|थांबा)/u,
  /(बंद|बंध|रोको|बन्द|ऑफ|ऑफ़|थांबवा|थांबव|थांबा).*?(पंप|पाणी|सिंचन|सिंचाई|पानी)/u,
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

  // Chrome speech recognition sometimes drops/mishears the word "zone" in
  // mixed Marathi-English commands. If there is exactly one clear zone number,
  // use it instead of asking the farmer again.
  const looseMatches = LOOSE_ZONE_NUMBERS
    .filter(({ zoneId, regex }) => regex.test(text) && (availableZones.length === 0 || availableZones.includes(zoneId)))
    .map(({ zoneId }) => zoneId);
  if (looseMatches.length === 1) return looseMatches[0];

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
