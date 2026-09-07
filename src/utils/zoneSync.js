import { getCropMeta } from '../data/appContent.js';
import { localize } from './formatters.js';
import { isNotificationEnabled } from '../services/notificationEngine.js';
import { useNotificationStore } from '../store/notificationStore.js';

const SENSOR_FIELDS = ['moisture', 'temp', 'humidity', 'ph', 'ec', 'npk', 'flow'];
const STATUS_FIELDS = ['pump', 'mode', 'threshold', 'reason'];

/** MQTT topic helpers — any zone id (z1, z3, manual1, …) */
export function getZoneSensorTopic(zoneId, field) {
  const map = {
    moisture: 'moisture',
    temperature: 'temp',
    temp: 'temp',
    humidity: 'humidity',
    ph: 'ph',
    ec: 'ec',
    npk: 'npk',
    flow: 'flow',
  };
  const suffix = map[field] || field;
  return `krishisarth/${zoneId}/${suffix}`;
}

export function getZoneStatusTopic(zoneId, field) {
  return `krishisarth/${zoneId}/status/${field}`;
}

export function getPumpTopic(zoneId) {
  return `krishisarth/${zoneId}/cmd/pump`;
}

export function getValveTopic(zoneId) {
  return `krishisarth/${zoneId}/cmd/valve`;
}

export function getFertTopic(zoneId) {
  return `krishisarth/${zoneId}/cmd/fertigation`;
}

export function buildSubscribeTopics(zoneIds) {
  const weather = ['krishisarth/weather/rain_prob', 'krishisarth/weather/temp'];
  const sensor = zoneIds.flatMap((id) =>
    SENSOR_FIELDS.map((field) => getZoneSensorTopic(id, field))
  );
  const status = zoneIds.flatMap((id) =>
    STATUS_FIELDS.map((field) => getZoneStatusTopic(id, field))
  );
  return [...sensor, ...status, ...weather];
}

export function buildTopicMap(zoneIds) {
  const map = {};
  zoneIds.forEach((zoneId) => {
    SENSOR_FIELDS.forEach((field) => {
      const storeField =
        field === 'temp' ? 'temperature' : field === 'npk' ? 'npk' : field;
      map[getZoneSensorTopic(zoneId, field)] = { zone: zoneId, field: storeField };
    });
  });
  return map;
}

export function nextZoneId(existingZones = {}) {
  const keys = Object.keys(existingZones);
  let n = 1;
  while (keys.includes(`z${n}`)) n += 1;
  return `z${n}`;
}

export function formatZoneContextLine(zone, language = 'en') {
  const crop = getCropMeta(zone.cropType);
  const cropLabel = localize(crop.name, language);
  return `${zone.name} (${cropLabel}): moisture ${zone.moisture ?? '--'}%, temp ${zone.temperature ?? '--'}°C, humidity ${zone.humidity ?? '--'}%, pH ${zone.ph ?? '--'}, EC ${zone.ec ?? '--'}, pump ${zone.pumpOn ? 'ON' : 'OFF'}, valve ${zone.valveOpen ? 'OPEN' : 'CLOSED'}`;
}

export function syncNotificationsFromZones(zones, storeApi) {
  const notifStore = storeApi || useNotificationStore.getState();
  const { addNotification, dismiss, notifications } = notifStore;
  const getNotifications = () => notifications;

  const zoneList = Object.values(zones || {});
  const existing = getNotifications?.() || [];

  zoneList.forEach((zone) => {
    const moistureId = `zone-moisture-${zone.id}`;
    const pumpId = `zone-pump-${zone.id}`;
    const moisture = zone.moisture ?? 0;

    if (moisture < 40 && zone.zoneType !== 'manual' && isNotificationEnabled('moisture')) {
      const already = existing.find((n) => n.id === moistureId);
      if (!already) {
        addNotification({
          id: moistureId,
          type: 'moisture',
          title: `${zone.name} — moisture ${moisture}%`,
          subtitle: 'Soil is drying — consider irrigation soon.',
          body: `Live reading for ${zone.name}. Open the Digital Twin or zone detail to start watering in Act mode.`,
          actionRoute: `/zone/${zone.id}`,
        });
      }
    } else {
      dismiss?.(moistureId);
    }

    if (zone.pumpOn && isNotificationEnabled('pumps')) {
      const already = existing.find((n) => n.id === pumpId);
      if (!already) {
        addNotification({
          id: pumpId,
          type: 'pump',
          title: `${zone.name} — pump running`,
          subtitle: 'Irrigation is active on this zone.',
          body: 'You can monitor progress in the Digital Twin or stop from the zone panel.',
          actionRoute: `/twin`,
        });
      }
    } else {
      dismiss?.(pumpId);
    }
  });

  const zoneIds = new Set(zoneList.map((z) => z.id));
  existing
    .filter((n) => n.id?.startsWith('zone-moisture-') || n.id?.startsWith('zone-pump-'))
    .forEach((n) => {
      const match = n.id.match(/^zone-(?:moisture|pump)-(.+)$/);
      if (match && !zoneIds.has(match[1])) dismiss?.(n.id);
    });
}

export function dispatchHardwareUpdate(zone) {
  if (!zone?.id) return;
  document.dispatchEvent(
    new CustomEvent('hardware-update', {
      detail: {
        zone_id: zone.id,
        moisture_pct: zone.moisture,
        temp_c: zone.temperature,
        humidity_pct: zone.humidity,
        N: zone.nitrogen,
        P: zone.phosphorus,
        K: zone.potassium,
        pump_status: zone.pumpOn ? 'on' : 'off',
        fertigation_status: zone.fertigationOn ? 'active' : 'idle',
        irrigating: zone.pumpOn,
        fertigating: zone.fertigationOn,
      },
    })
  );
}
