/**
 * nlpParser.js — Voice command NLP parser (Marathi / Hindi / English)
 * KrishiSarth AI | ai-ml module
 *
 * Pattern-matching NLP for voice commands.
 * Returns: { intent, zone, device, action, duration, confidence }
 */

const INTENTS = {
  TURN_ON:  'turn_on',
  TURN_OFF: 'turn_off',
  STATUS:   'status',
  CONFIRM:  'confirm',
  CANCEL:   'cancel',
  SUMMARY:  'summary',
};

const PATTERNS = [
  // ── TURN ON patterns ──
  { lang: 'mr', regex: /zone\s*([12]|एक|दोन).*(?:pump|पंप).*(?:chalu|चालू|sur|सुरू)/i, intent: INTENTS.TURN_ON, device: 'pump' },
  { lang: 'mr', regex: /(?:chalu|चालू|sur|सुरू).*zone\s*([12]|एक|दोन).*(?:pump|पंप)/i, intent: INTENTS.TURN_ON, device: 'pump' },
  { lang: 'mr', regex: /(?:paani|पाणी).*zone\s*([12]|एक|दोन)/i, intent: INTENTS.TURN_ON, device: 'pump' },
  { lang: 'mr', regex: /zone\s*([12]|एक|दोन).*(?:valve|valve|वाल्व).*(?:ugad|उघड)/i, intent: INTENTS.TURN_ON, device: 'valve' },
  { lang: 'mr', regex: /(?:fertigation|khad|खत).*(?:sur|सुरू|start)/i, intent: INTENTS.TURN_ON, device: 'fertigation' },

  // ── TURN OFF patterns ──
  { lang: 'mr', regex: /zone\s*([12]|एक|दोन).*(?:bandh|बंद|stop|थांबव)/i, intent: INTENTS.TURN_OFF, device: 'pump' },
  { lang: 'mr', regex: /(?:bandh|बंद|thambav|थांबव).*zone\s*([12]|एक|दोन)/i, intent: INTENTS.TURN_OFF, device: 'pump' },
  { lang: 'mr', regex: /sab\s*(?:bandh|बंद)/i, intent: INTENTS.TURN_OFF, device: 'all' },

  // ── Hindi ──
  { lang: 'hi', regex: /zone\s*([12]|ek|do).*(?:pump|पंप).*(?:on|chalu|चालू)/i, intent: INTENTS.TURN_ON, device: 'pump' },
  { lang: 'hi', regex: /zone\s*([12]|ek|do).*(?:band|बंद|off)/i, intent: INTENTS.TURN_OFF, device: 'pump' },
  { lang: 'hi', regex: /(?:paani|पानी).*(?:do|दो|dalo|डालो)/i, intent: INTENTS.TURN_ON, device: 'pump' },
  { lang: 'hi', regex: /(?:sab|सब).*(?:band|बंद)/i, intent: INTENTS.TURN_OFF, device: 'all' },

  // ── English ──
  { lang: 'en', regex: /(?:turn\s+on|start|on).*zone\s*([12])/i, intent: INTENTS.TURN_ON, device: 'pump' },
  { lang: 'en', regex: /zone\s*([12]).*(?:pump|water).*(?:on|start)/i, intent: INTENTS.TURN_ON, device: 'pump' },
  { lang: 'en', regex: /(?:turn\s+off|stop|off).*zone\s*([12])/i, intent: INTENTS.TURN_OFF, device: 'pump' },
  { lang: 'en', regex: /zone\s*([12]).*(?:pump|water).*(?:off|stop)/i, intent: INTENTS.TURN_OFF, device: 'pump' },
  { lang: 'en', regex: /stop\s+all/i, intent: INTENTS.TURN_OFF, device: 'all' },
  { lang: 'en', regex: /(?:open|turn on).*valve.*zone\s*([12])/i, intent: INTENTS.TURN_ON, device: 'valve' },
  { lang: 'en', regex: /(?:close|shut).*valve.*zone\s*([12])/i, intent: INTENTS.TURN_OFF, device: 'valve' },
  { lang: 'en', regex: /(?:start|begin).*fertigation/i, intent: INTENTS.TURN_ON, device: 'fertigation' },
  { lang: 'en', regex: /(?:stop).*fertigation/i, intent: INTENTS.TURN_OFF, device: 'fertigation' },

  // ── Status queries ──
  { lang: 'mr', regex: /(?:moisture|ओलावा|kitni|किती)/i, intent: INTENTS.STATUS, device: 'moisture' },
  { lang: 'mr', regex: /(?:theek|ठीक|sab|सगळ)/i, intent: INTENTS.STATUS, device: 'all' },
  { lang: 'mr', regex: /pump.*(?:vel|वेळ|kitvel|कितवेळ)/i, intent: INTENTS.STATUS, device: 'pump_runtime' },
  { lang: 'hi', regex: /(?:moisture|nami|नमी)/i, intent: INTENTS.STATUS, device: 'moisture' },
  { lang: 'en', regex: /(?:what|status|how|check).*(?:moisture|soil)/i, intent: INTENTS.STATUS, device: 'moisture' },
  { lang: 'en', regex: /(?:how|what).*everything/i, intent: INTENTS.STATUS, device: 'all' },

  // ── Confirm / Cancel ──
  { lang: 'mr', regex: /^(?:ho|हो|haan|हां|yes)$/i, intent: INTENTS.CONFIRM, device: null },
  { lang: 'mr', regex: /^(?:nahi|नाही|no|naa|ना)$/i, intent: INTENTS.CANCEL, device: null },
  { lang: 'en', regex: /^(?:yes|yeah|ok|okay|confirm)$/i, intent: INTENTS.CONFIRM, device: null },
  { lang: 'en', regex: /^(?:no|nope|cancel|stop)$/i, intent: INTENTS.CANCEL, device: null },
];

function extractZone(text) {
  const m = text.match(/zone\s*([12]|एक|दोन|ek|do|one|two)/i);
  if (!m) return null;
  const v = m[1].toLowerCase();
  if (v === '1' || v === 'एक' || v === 'ek' || v === 'one') return 'z1';
  if (v === '2' || v === 'दोन' || v === 'do'  || v === 'two') return 'z2';
  return null;
}

function extractDuration(text) {
  const m = text.match(/(\d+(?:\.\d+)?)\s*(?:hour|hours|taa?s|ghante)/i);
  return m ? parseFloat(m[1]) : 1;
}

/**
 * Parse a voice command string
 * @param {string} text - raw speech text
 * @returns {{ intent, zone, device, action, duration, confidence, raw }}
 */
export function parseVoiceCommand(text) {
  const normalized = text.trim().toLowerCase();

  for (const pattern of PATTERNS) {
    if (pattern.regex.test(normalized)) {
      const zone = extractZone(normalized);
      const duration = extractDuration(normalized);
      return {
        intent: pattern.intent,
        zone: zone || (pattern.device === 'all' ? 'all' : null),
        device: pattern.device,
        action: pattern.intent === INTENTS.TURN_ON ? 'on' : pattern.intent === INTENTS.TURN_OFF ? 'off' : 'query',
        duration,
        confidence: 0.85,
        raw: text,
      };
    }
  }

  return {
    intent: null,
    zone: null,
    device: null,
    action: null,
    duration: null,
    confidence: 0,
    raw: text,
  };
}

export { INTENTS };
