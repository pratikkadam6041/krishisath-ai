import { localize } from './formatters.js';

export function getSensorOfflineDetail(zone, language = 'hi') {
  if (!zone || zone.zoneType === 'manual') {
    return null;
  }

  if (!zone.online) {
    return {
      title: localize(
        { hi: 'सेंसर कनेक्ट नहीं', mr: 'सेन्सर कनेक्ट नाही', en: 'Sensor not connected' },
        language
      ),
      body: localize(
        {
          hi: 'हार्डवेयर से अभी तक कोई MQTT संदेश नहीं मिला। Wi-Fi और ब्रोकर सेटिंग जांचें।',
          mr: 'हार्डवेअरकडून अद्याप MQTT संदेश मिळाला नाही. Wi-Fi आणि ब्रोकर तपासा.',
          en: 'No MQTT message received from hardware yet. Check Wi-Fi and broker settings.',
        },
        language
      ),
    };
  }

  const last = zone.lastTelemetryAt;
  if (!last) {
    return {
      title: localize({ hi: 'डेटा प्रतीक्षा', mr: 'डेटा प्रतीक्षा', en: 'Awaiting data' }, language),
      body: localize(
        {
          hi: 'सेंसर ऑनलाइन है लेकिन अभी तक रीडिंग नहीं आई।',
          mr: 'सेन्सर ऑनलाइन आहे पण अद्याप रीडिंग आलेली नाही.',
          en: 'Sensor is online but no reading has arrived yet.',
        },
        language
      ),
    };
  }

  const ageMin = Math.round((Date.now() - last) / 60_000);
  if (ageMin > 15) {
    const lastTime = new Date(last).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return {
      title: localize({ hi: 'सेंसर ऑफलाइन', mr: 'सेन्सर ऑफलाइन', en: 'Sensor offline' }, language),
      body: localize(
        {
          hi: `आखिरी रीडिंग ${lastTime} पर (नमी ${zone.moisture ?? '—'}%)। ${ageMin} मिनट से कोई अपडेट नहीं।`,
          mr: `शेवटची रीडिंग ${lastTime} वाजता (ओलावा ${zone.moisture ?? '—'}%)। ${ageMin} मिनिटांपासून अपडेट नाही.`,
          en: `Last reading at ${lastTime} (moisture ${zone.moisture ?? '—'}%). No update for ${ageMin} minutes.`,
        },
        language
      ),
      lastReading: { moisture: zone.moisture, at: last },
    };
  }

  return null;
}
