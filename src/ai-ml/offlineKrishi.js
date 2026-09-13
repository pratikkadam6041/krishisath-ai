/**
 * offlineKrishi.js
 * Rule-based smart farming assistant using live sensor data.
 * Works 100% offline — no API key required.
 */

const EMOJIS = { good: '✅', warn: '⚠️', critical: '🚨', water: '💧', sun: '☀️', rain: '🌧️', plant: '🌱', temp: '🌡️', npk: '🧪' };

function moistureLabel(m) {
  if (m === undefined || m === null) return 'unknown';
  if (m < 25) return 'critically low';
  if (m < 40) return 'low';
  if (m <= 70) return 'optimal';
  return 'high';
}

function tempAdvice(temp) {
  if (temp === undefined || temp === null) return null;
  if (temp > 38) return `${EMOJIS.warn} Temperature is very high (${temp}°C). Water early morning or evening to reduce heat stress on crops.`;
  if (temp < 12) return `${EMOJIS.warn} Temperature is low (${temp}°C). Avoid watering at night — risk of root freeze.`;
  return null;
}

function npkAdvice(zone) {
  const issues = [];
  if (zone?.nitrogen !== undefined && zone.nitrogen < 20) issues.push(`Nitrogen (N) is LOW (${zone.nitrogen} mg/kg) — apply urea or DAP fertilizer`);
  if (zone?.phosphorus !== undefined && zone.phosphorus < 15) issues.push(`Phosphorus (P) is LOW (${zone.phosphorus} mg/kg) — apply SSP or DAP`);
  if (zone?.potassium !== undefined && zone.potassium < 15) issues.push(`Potassium (K) is LOW (${zone.potassium} mg/kg) — apply MOP or potash`);
  return issues;
}

/**
 * Main offline response function
 * @param {string} text - user message
 * @param {object} zones - zone data from zoneStore
 * @param {object} weather - weather data from zoneStore
 * @param {string} lang - language code
 * @returns {string} - response message
 */
function getZoneList(zones) {
  return Object.values(zones || {}).filter((z) => z?.id);
}

function findZoneByQuery(zones, q) {
  const list = getZoneList(zones);
  for (const zone of list) {
    const name = (zone.name || '').toLowerCase();
    const id = (zone.id || '').toLowerCase();
    if (q.includes(name) && name.length > 1) return zone;
    if (q.includes(id)) return zone;
  }
  const m = q.match(/zone\s*(\d+)|झोन\s*(\d+)|z(\d+)/i);
  if (m) {
    const n = m[1] || m[2] || m[3];
    return list.find((z) => z.id === `z${n}`) || list[Number(n) - 1];
  }
  return null;
}

function formatZoneStatusBlock(zone) {
  const m = zone.moisture;
  let block = `🌿 **${zone.name}** (${zone.id})\n`;
  block += `• Moisture: ${m ?? 'N/A'}% — ${moistureLabel(m)}\n`;
  block += `• Temperature: ${zone.temperature ?? 'N/A'}°C\n`;
  block += `• Pump: ${zone.pumpOn ? '🟢 ON' : '⚫ OFF'}\n`;
  if (zone.nitrogen !== undefined) {
    block += `• NPK: N=${zone.nitrogen} / P=${zone.phosphorus} / K=${zone.potassium} mg/kg\n`;
  }
  return block;
}

function moistureLabelMr(m) {
  if (m === undefined || m === null) return 'डेटा नाही';
  if (m < 25) return 'खूप कमी';
  if (m < 40) return 'कमी';
  if (m <= 70) return 'योग्य';
  return 'जास्त';
}

function formatMrZoneLine(zone) {
  const m = zone.moisture;
  return `• ${zone.name}: ओलावा ${m ?? 'N/A'}% (${moistureLabelMr(m)}), तापमान ${zone.temperature ?? 'N/A'}°C, पंप ${zone.pumpOn ? 'चालू' : 'बंद'}`;
}

export function offlineKrishiResponse(text, zones, weather, lang = 'en') {
  const q = text.toLowerCase();
  const zoneList = getZoneList(zones);
  const w = weather || {};

  if (lang === 'mr') {
    const matchedZone = findZoneByQuery(zones, q);

    if (/rain|paaus|पाऊस|weather|हवामान|मौसम/.test(q)) {
      const prob = w.rainProb;
      if (prob === undefined) return 'आजचा लाईव्ह हवामान डेटा उपलब्ध नाही. पण सेंसर डेटा वापरून सिंचन निर्णय घेऊ शकतो.';
      if (prob > 70) return `आज पावसाची शक्यता जास्त आहे (${prob}%). शक्य असल्यास सिंचन थांबवा आणि पाणी वाचवा.`;
      if (prob > 40) return `आज पावसाची मध्यम शक्यता आहे (${prob}%). मातीचा ओलावा कमी असेल तरच सिंचन करा.`;
      return `आज पावसाची शक्यता कमी आहे (${prob}%). ओलावा कमी असलेल्या झोनला पाणी देता येईल.`;
    }

    if (matchedZone && /zone|झोन|moisture|ओलावा|pump|पंप|status|स्थिती|माहिती|शेत/.test(q)) {
      const m = matchedZone.moisture;
      let reply = `${matchedZone.name} (${matchedZone.id}) ची स्थिती: ओलावा ${m ?? 'N/A'}%, तापमान ${matchedZone.temperature ?? 'N/A'}°C, पंप ${matchedZone.pumpOn ? 'चालू' : 'बंद'}. `;
      if (m !== undefined && m < 35) reply += 'ओलावा खूप कमी आहे, ACT मोडमध्ये पंप सुरू करून सिंचन करा.';
      else if (m !== undefined && m > 75) reply += 'माती जास्त ओली आहे, सिंचन बंद ठेवा.';
      else reply += `ओलावा ${moistureLabelMr(m)} आहे.`;
      return reply;
    }

    if (/water|paani|पाणी|irrigat|सिंचन|pump|पंप|moisture|ओलावा/.test(q)) {
      let reply = 'सिंचन सल्ला: ';
      if (!zoneList.length) return 'अजून झोन डेटा उपलब्ध नाही. हार्डवेअर कनेक्ट झाल्यावर मी सिंचन सल्ला देऊ शकतो.';
      reply += zoneList.map((zone) => {
        const m = zone.moisture;
        if (m < 35) return `${zone.name} ला आत्ता पाणी हवे आहे (${m}%).`;
        if (m < 50) return `${zone.name} थोडा कोरडा होत आहे (${m}%), लवकर सिंचन करा.`;
        return `${zone.name} ठीक आहे (${m}%), आत्ता पाणी गरजेचे नाही.`;
      }).join(' ');
      if (w.rainProb > 60) reply += ` पावसाची शक्यता ${w.rainProb}% आहे, म्हणून शक्य असल्यास थांबा.`;
      return reply;
    }

    if (/help|काय करू|commands|कमांड|मदत/.test(q)) {
      return 'मी सिंचन, पंप, ओलावा, हवामान आणि झोनची माहिती सांगू शकतो. उदाहरण: Zone one pump चालू करा, Zone two pump बंद करा, किंवा माझ्या शेताची माहिती द्या.';
    }

    if (!zoneList.length) {
      return 'मी Krishi AI आहे. सध्या झोन डेटा उपलब्ध नाही, पण तुम्ही शेती, हवामान, पंप आणि सिंचनाबद्दल विचारू शकता.';
    }

    return `तुमच्या शेताची सध्याची माहिती: ${zoneList.map(formatMrZoneLine).join(' ')} हवामान: ${w.temp ?? 'N/A'}°C, पावसाची शक्यता ${w.rainProb ?? 'N/A'}%.`;
  }

  // ── Rain / weather questions ─────────────────────────────
  if (/rain|paaus|पाऊस|बारिश|weather|havas|हवामान|मौसम/.test(q)) {
    const prob = w.rainProb;
    if (prob === undefined) return `${EMOJIS.sun} No live weather data available. Please check your internet connection for weather updates.`;
    if (prob > 70) return `${EMOJIS.rain} Rain is highly likely today (${prob}% probability). **Delay irrigation** — do not water Zone 1 or Zone 2 today. Save water and electricity!`;
    if (prob > 40) return `${EMOJIS.rain} Moderate rain chance (${prob}%). Consider waiting before watering. Current temp: ${w.temp}°C, humidity: ${w.humidity}%.`;
    return `${EMOJIS.sun} Low rain probability today (${prob}%). Temp: ${w.temp}°C, Humidity: ${w.humidity}%. Good day to irrigate if moisture is low.`;
  }

  // ── Zone status / summary ────────────────────────────────
  if (/status|summary|report|theek|ठीक|sab|सगळं|everything|how is|kaisa|कसं/.test(q)) {
    let reply = `📊 **Farm Status Report** (${zoneList.length} zones)\n\n`;
    zoneList.forEach((zone) => {
      const m = zone.moisture;
      reply += `🌿 **${zone.name}** — Moisture: ${m !== undefined ? m + '%' : 'N/A'} (${moistureLabel(m)}), Temp: ${zone.temperature ?? 'N/A'}°C, Pump: ${zone.pumpOn ? '🟢 ON' : '⚫ OFF'}\n`;
    });
    reply += `\n${EMOJIS.sun} Weather: ${w.temp ?? 'N/A'}°C, Humidity: ${w.humidity ?? 'N/A'}%, Rain: ${w.rainProb ?? 'N/A'}%\n`;

    const alerts = [];
    zoneList.forEach((zone) => {
      if ((zone.moisture ?? 100) < 30) {
        alerts.push(`${EMOJIS.critical} ${zone.name} moisture is critically low — water immediately!`);
      }
      npkAdvice(zone).forEach((a) => alerts.push(`${zone.name}: ${EMOJIS.npk} ${a}`));
    });

    if (alerts.length) reply += `\n⚠️ **Alerts:**\n` + alerts.map((a) => `• ${a}`).join('\n');
    else reply += `\n${EMOJIS.good} Farm is in good condition!`;

    return reply;
  }

  const matchedZone = findZoneByQuery(zones, q);
  if (matchedZone && /zone|झोन|moisture|pump|npk|status|theek|ठीक/.test(q)) {
    const m = matchedZone.moisture;
    let reply = formatZoneStatusBlock(matchedZone);
    const npkIssues = npkAdvice(matchedZone);
    if (m !== undefined && m < 35) reply += `\n${EMOJIS.critical} **Action needed:** Start watering from Digital Twin (Act mode).`;
    else if (m !== undefined && m > 75) reply += `\n${EMOJIS.warn} Soil is too wet — stop irrigation.`;
    else reply += `\n${EMOJIS.good} Moisture is ${moistureLabel(m)}.`;
    if (npkIssues.length) reply += `\n\n${EMOJIS.npk} **Nutrient alerts:**\n` + npkIssues.map((a) => `• ${a}`).join('\n');
    const t = tempAdvice(matchedZone.temperature);
    if (t) reply += `\n\n${t}`;
    return reply;
  }

  // ── Water / irrigation questions ─────────────────────────
  if (/water|paani|पाणी|irrigat|pump|moisture|ओलावा/.test(q)) {
    let reply = `${EMOJIS.water} **Irrigation Recommendation**\n\n`;
    zoneList.forEach((zone) => {
      const m = zone.moisture;
      const advice =
        m < 35
          ? `${EMOJIS.critical} ${zone.name} NEEDS water now! (${m}%)`
          : m < 50
          ? `${EMOJIS.warn} ${zone.name} is getting dry (${m}%) — water within 2 hours`
          : `${EMOJIS.good} ${zone.name} is fine (${m}%) — no watering needed`;
      reply += `• ${advice}\n`;
    });
    if (w.rainProb > 60) reply += `\n${EMOJIS.rain} ${w.rainProb}% rain expected — delay irrigation if possible!`;
    return reply;
  }

  // ── NPK / fertilizer questions ───────────────────────────
  if (/npk|nitrogen|phosphorus|potassium|fertilizer|khad|खत|nutrient/.test(q)) {
    let reply = `${EMOJIS.npk} **NPK Analysis**\n\n`;
    let anyIssue = false;
    zoneList.forEach((zone) => {
      if (zone.nitrogen !== undefined) {
        reply += `${zone.name} — N: ${zone.nitrogen} / P: ${zone.phosphorus} / K: ${zone.potassium} mg/kg\n`;
      }
      const issues = npkAdvice(zone);
      if (issues.length) {
        anyIssue = true;
        reply += `\n**${zone.name}:**\n` + issues.map((a) => `• ${a}`).join('\n') + '\n';
      }
    });
    if (!anyIssue) reply += `\n${EMOJIS.good} All nutrients are in good range!`;
    return reply;
  }

  // ── Temperature questions ────────────────────────────────
  if (/temp|taapmaan|तापमान|hot|cold|thandi|garam/.test(q)) {
    let reply = `${EMOJIS.temp} **Temperature Report**\n`;
    zoneList.forEach((zone) => {
      reply += `• ${zone.name}: ${zone.temperature ?? 'N/A'}°C\n`;
    });
    reply += `• Outside: ${w.temp ?? 'N/A'}°C\n`;
    const tips = zoneList.map((z) => tempAdvice(z.temperature)).filter(Boolean);
    if (tips.length) reply += `\n${tips.join('\n')}`;
    else reply += `\n${EMOJIS.good} Temperatures are in a healthy range for your crops.`;
    return reply;
  }

  // ── Help / what can you do ───────────────────────────────
  if (/help|kiti|काय करू|what can|features|commands/.test(q)) {
    const zoneHint =
      zoneList.length > 0
        ? zoneList.map((z) => z.name).join(', ')
        : 'your zones';
    return `🌱 **Krishi AI — I can help you with:**\n\n• 💧 "Does ${zoneList[0]?.name || 'Zone 1'} need water?" — irrigation advice\n• 🌧️ "Will it rain today?" — weather analysis\n• 📊 "Give me a farm status report" — full summary (${zoneList.length} zones)\n• 🧪 "Is NPK low?" — fertilizer recommendations\n• 🌡️ "What is the temperature?" — temp report\n• 🌿 Zone-specific: ${zoneHint}\n\n_Ask me anything about your farm!_`;
  }

  // ── Default: give full farm status ──────────────────────
  let reply = `🌱 I'm Krishi, your offline farming assistant!\n\n`;
  reply += `📍 Current farm snapshot (${zoneList.length} zones):\n`;
  zoneList.forEach((zone) => {
    const m = zone.moisture;
    reply += `• ${zone.name}: ${m ?? 'N/A'}% moisture (${moistureLabel(m)}), pump ${zone.pumpOn ? 'ON' : 'OFF'}\n`;
  });
  reply += `• Weather: ${w.temp ?? 'N/A'}°C, ${w.rainProb ?? 'N/A'}% rain\n\n`;

  if (zoneList.some((z) => (z.moisture ?? 100) < 35)) {
    reply += `${EMOJIS.critical} **Alert: Low soil moisture detected!** Use Digital Twin (Act mode) to irrigate.\n\n`;
  }
  reply += `_Type "help" to see all questions I can answer, or ask about specific zones, weather, or nutrients._`;
  return reply;
}
