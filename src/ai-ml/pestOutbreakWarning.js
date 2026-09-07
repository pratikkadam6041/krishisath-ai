/**
 * pestOutbreakWarning.js — Regional pest outbreak prediction
 * KrishiSarth AI | ai-ml module
 *
 * Uses location + season + crop + weather to warn farmers
 * about incoming pest/disease risks BEFORE they occur.
 */

// Regional pest outbreak calendar
// Keys: cropType → month (1-12) → condition → pest data
const PEST_CALENDAR = {
  wheat: {
    months: [11, 12, 1, 2, 3],
    pests: [
      {
        name: 'Yellow Rust',
        nameHi: 'पीली रतुआ',
        nameMr: 'पिवळा गंज',
        triggerTempMin: 5,
        triggerTempMax: 15,
        triggerHumidityMin: 70,
        risk: 'high',
        action: 'Spray Propiconazole 25 EC @ 0.1% at first sign',
        actionHi: 'पहले लक्षण पर Propiconazole 25 EC @ 0.1% का छिड़काव करें',
        actionMr: 'पहिल्या लक्षणावर Propiconazole 25 EC @ 0.1% फवारणी करा',
        daysWarning: 5,
      },
      {
        name: 'Aphids',
        nameHi: 'माहू कीट',
        nameMr: 'माहू कीड',
        triggerTempMin: 15,
        triggerTempMax: 25,
        triggerHumidityMin: 60,
        risk: 'medium',
        action: 'Use imidacloprid 17.8 SL or yellow sticky traps',
        actionHi: 'Imidacloprid 17.8 SL या पीले चिपचिपे ट्रैप उपयोग करें',
        actionMr: 'Imidacloprid 17.8 SL किंवा पिवळे चिकट सापळे वापरा',
        daysWarning: 4,
      },
    ],
  },
  tomato: {
    months: [3, 4, 5, 6, 7, 8, 9],
    pests: [
      {
        name: 'Whitefly',
        nameHi: 'सफेद मक्खी',
        nameMr: 'पांढरी माशी',
        triggerTempMin: 25,
        triggerTempMax: 40,
        triggerHumidityMin: 50,
        risk: 'high',
        action: 'Spray neem oil 5ml/L or imidacloprid. Check leaf undersides daily.',
        actionHi: 'नीम तेल 5ml/L या imidacloprid का छिड़काव करें। पत्ती के नीचे रोज जांचें।',
        actionMr: 'नीम तेल 5ml/L किंवा imidacloprid फवारणी करा. रोज पानाखाली तपासा.',
        daysWarning: 3,
      },
      {
        name: 'Early Blight',
        nameHi: 'प्रारंभिक झुलसा',
        nameMr: 'प्रारंभिक करपा',
        triggerTempMin: 20,
        triggerTempMax: 30,
        triggerHumidityMin: 75,
        risk: 'high',
        action: 'Apply Mancozeb 75 WP @ 2g/L. Avoid overhead irrigation.',
        actionHi: 'Mancozeb 75 WP @ 2g/L लगाएं। ऊपर से पानी देना बंद करें।',
        actionMr: 'Mancozeb 75 WP @ 2g/L फवारणी करा. वरून पाणी देणे टाळा.',
        daysWarning: 4,
      },
    ],
  },
  cotton: {
    months: [6, 7, 8, 9, 10],
    pests: [
      {
        name: 'Pink Bollworm',
        nameHi: 'गुलाबी बोलवर्म',
        nameMr: 'गुलाबी बोलवर्म',
        triggerTempMin: 28,
        triggerTempMax: 38,
        triggerHumidityMin: 55,
        risk: 'critical',
        action: 'Install pheromone traps. Spray chlorpyrifos 50 EC if infestation detected.',
        actionHi: 'फेरोमोन ट्रैप लगाएं। संक्रमण मिलने पर chlorpyrifos 50 EC छिड़कें।',
        actionMr: 'फेरोमोन सापळे लावा. chlorpyrifos 50 EC फवारणी करा.',
        daysWarning: 6,
      },
      {
        name: 'Thrips',
        nameHi: 'थ्रिप्स',
        nameMr: 'थ्रिप्स',
        triggerTempMin: 25,
        triggerTempMax: 38,
        triggerHumidityMin: 40,
        risk: 'medium',
        action: 'Apply spinosad or fipronil. Monitor with blue sticky traps.',
        actionHi: 'Spinosad या fipronil का छिड़काव करें। नीले ट्रैप से निगरानी करें।',
        actionMr: 'Spinosad किंवा fipronil फवारणी करा. निळ्या सापळ्यांनी देखरेख करा.',
        daysWarning: 5,
      },
    ],
  },
  onion: {
    months: [11, 12, 1, 2, 3, 4],
    pests: [
      {
        name: 'Thrips',
        nameHi: 'थ्रिप्स',
        nameMr: 'थ्रिप्स',
        triggerTempMin: 20,
        triggerTempMax: 35,
        triggerHumidityMin: 50,
        risk: 'high',
        action: 'Spray spinosad 45 SC @ 0.5ml/L during evening hours.',
        actionHi: 'शाम को spinosad 45 SC @ 0.5ml/L छिड़कें।',
        actionMr: 'संध्याकाळी spinosad 45 SC @ 0.5ml/L फवारणी करा.',
        daysWarning: 4,
      },
    ],
  },
  potato: {
    months: [10, 11, 12, 1, 2],
    pests: [
      {
        name: 'Late Blight',
        nameHi: 'पछेती झुलसा',
        nameMr: 'उशिराचा करपा',
        triggerTempMin: 10,
        triggerTempMax: 20,
        triggerHumidityMin: 80,
        risk: 'critical',
        action: 'Apply metalaxyl + mancozeb immediately. Avoid wet foliage at night.',
        actionHi: 'तुरंत metalaxyl + mancozeb लगाएं। रात को पत्तियां गीली न रहने दें।',
        actionMr: 'ताबडतोब metalaxyl + mancozeb फवारणी करा. रात्री पाने ओली राहू नयेत.',
        daysWarning: 3,
      },
    ],
  },
};

// Regional outbreak modifiers by state
const STATE_RISK_MULTIPLIER = {
  Maharashtra: 1.2,
  Punjab: 1.1,
  'Uttar Pradesh': 1.15,
  Gujarat: 1.1,
  default: 1.0,
};

/**
 * Get pest outbreak warnings for a zone
 * @param {Object} params
 * @param {string} params.cropType - crop type from zone
 * @param {number} params.temperature - current temperature
 * @param {number} params.humidity - current humidity
 * @param {string} params.district - district name
 * @param {string} params.state - state name
 * @param {string} params.language - 'hi' | 'mr' | 'en'
 * @returns {Array} list of pest warnings sorted by risk
 */
export function getPestOutbreakWarnings({ cropType, temperature, humidity, district, state = 'Maharashtra', language = 'hi' }) {
  const currentMonth = new Date().getMonth() + 1;
  const cropData = PEST_CALENDAR[cropType];
  if (!cropData) return [];

  const inSeason = cropData.months.includes(currentMonth);
  const riskMultiplier = STATE_RISK_MULTIPLIER[state] || STATE_RISK_MULTIPLIER.default;

  const warnings = [];

  for (const pest of cropData.pests) {
    const tempInRange = temperature >= pest.triggerTempMin && temperature <= pest.triggerTempMax;
    const humidityAtRisk = humidity >= pest.triggerHumidityMin;
    const seasonalRisk = inSeason ? 1 : 0.4;

    // Calculate risk score
    const riskScore = (tempInRange ? 0.5 : 0.1) + (humidityAtRisk ? 0.4 : 0.05) + (seasonalRisk * 0.3);
    const adjustedScore = riskScore * riskMultiplier;

    if (adjustedScore < 0.4) continue; // Below threshold

    const name = language === 'hi' ? pest.nameHi : language === 'mr' ? pest.nameMr : pest.name;
    const action = language === 'hi' ? pest.actionHi : language === 'mr' ? pest.actionMr : pest.action;

    warnings.push({
      pest: name,
      pestEn: pest.name,
      risk: pest.risk,
      riskScore: Math.round(adjustedScore * 100),
      action,
      daysWarning: pest.daysWarning,
      season: inSeason ? 'peak' : 'moderate',
      district,
      cropType,
    });
  }

  // Sort by risk score descending
  return warnings.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Generate notification payload for outbreak warning
 */
export function buildOutbreakNotification(warning, zoneName, language = 'hi') {
  const riskLabel = { critical: '🔴', high: '🟠', medium: '🟡' }[warning.risk] || '🟡';

  if (language === 'mr') {
    return {
      type: 'pest',
      title: `${riskLabel} ${zoneName}: ${warning.pest} चा धोका`,
      subtitle: `पुढील ${warning.daysWarning} दिवसांत ${warning.cropType} पिकावर हल्ला शक्य आहे.`,
      body: warning.action,
      actionRoute: '/scanner',
    };
  }
  if (language === 'en') {
    return {
      type: 'pest',
      title: `${riskLabel} ${zoneName}: ${warning.pest} Risk`,
      subtitle: `${warning.pest} may attack your ${warning.cropType} in next ${warning.daysWarning} days.`,
      body: warning.action,
      actionRoute: '/scanner',
    };
  }
  return {
    type: 'pest',
    title: `${riskLabel} ${zoneName}: ${warning.pest} का खतरा`,
    subtitle: `अगले ${warning.daysWarning} दिनों में ${warning.cropType} पर हमला संभव है।`,
    body: warning.action,
    actionRoute: '/scanner',
  };
}
