const CHAT_LANGUAGES = [
  { code: 'hi', label: 'HI', speechLang: 'hi-IN' },
  { code: 'en', label: 'EN', speechLang: 'en-IN' },
  { code: 'mr', label: 'MR', speechLang: 'mr-IN' },
];

const DEVANAGARI_RE = /[\u0900-\u097F]/;
const LATIN_RE = /[A-Za-z]/;

const MARATHI_HINTS = [
  'आहे',
  'माझ',
  'तुम्ह',
  'काय',
  'शेती',
  'पीक',
  'पाऊस',
  'आजचा',
  'मला',
  'सांग',
  'सल्ला',
  'भाव',
];

const HINDI_HINTS = [
  'है',
  'मेरी',
  'क्या',
  'किसान',
  'फसल',
  'मंडी',
  'आज',
  'सलाह',
  'भाव',
  'योजना',
  'सिंचाई',
  'बताओ',
];

const GREETING_PATTERNS = {
  en: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'],
  hi: ['नमस्ते', 'हाय', 'हेलो', 'राम राम', 'नमस्कार'],
  mr: ['नमस्कार', 'हॅलो', 'हाय', 'राम राम'],
};

const GOODBYE_PATTERNS = {
  en: ['bye', 'goodbye', 'see you', 'ok bye', 'bye bye'],
  hi: ['बाय', 'अलविदा', 'फिर मिलते हैं', 'ठीक है बाय'],
  mr: ['बाय', 'पुन्हा भेटू', 'नंतर बोलू'],
};

const THANKS_PATTERNS = {
  en: ['thanks', 'thank you', 'thx'],
  hi: ['धन्यवाद', 'शुक्रिया', 'थैंक यू'],
  mr: ['धन्यवाद', 'आभारी आहे', 'थँक यू'],
};

function countMatches(text, hints) {
  return hints.reduce((total, hint) => total + (text.includes(hint) ? 1 : 0), 0);
}

export function detectLanguage(text, fallback = 'hi') {
  const sample = String(text || '').trim();

  if (!sample) {
    return fallback;
  }

  const hasDevanagari = DEVANAGARI_RE.test(sample);
  const hasLatin = LATIN_RE.test(sample);

  if (hasLatin && !hasDevanagari) {
    return 'en';
  }

  if (!hasDevanagari) {
    return fallback;
  }

  const marathiScore = countMatches(sample, MARATHI_HINTS);
  const hindiScore = countMatches(sample, HINDI_HINTS);

  if (marathiScore > hindiScore) {
    return 'mr';
  }

  return 'hi';
}

export function getSpeechLang(languageCode) {
  return CHAT_LANGUAGES.find((item) => item.code === languageCode)?.speechLang || 'hi-IN';
}

export function getLanguageLabel(languageCode) {
  return CHAT_LANGUAGES.find((item) => item.code === languageCode)?.label || 'HI';
}

export function getChatLanguages() {
  return CHAT_LANGUAGES;
}

export function isGreetingOnly(text) {
  const sample = normalizeChatText(text);

  if (!sample) {
    return false;
  }

  return Object.values(GREETING_PATTERNS).some((patterns) => patterns.includes(sample));
}

export function isGoodbyeOnly(text) {
  const sample = normalizeChatText(text);

  if (!sample) {
    return false;
  }

  return Object.values(GOODBYE_PATTERNS).some((patterns) => patterns.includes(sample));
}

export function isThanksOnly(text) {
  const sample = normalizeChatText(text);

  if (!sample) {
    return false;
  }

  return Object.values(THANKS_PATTERNS).some((patterns) => patterns.includes(sample));
}

function normalizeChatText(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[!.,?]+/g, '')
    .replace(/\s+/g, ' ');
}
