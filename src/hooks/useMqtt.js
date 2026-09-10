import { useEffect, useState, useCallback } from 'react';
import mqttClient from '../mqtt/mqttClient.js';
import { CMD, TOPICS } from '../mqtt/mqttTopics.js';
import { getPumpTopic, getValveTopic, getFertTopic } from '../utils/zoneSync.js';
import { writeHardwareEvent } from '../influxdb/writeService.js';
import { useZoneStore } from '../store/zoneStore.js';
import { detectAnomaly } from '../ai-ml/anomalyDetection.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { useActivityLogStore } from '../store/activityLogStore.js';

// Track which anomalies have already fired notifications (avoid spam)
const notifiedAnomalies = new Set();

function canMirrorHardwareLocally() {
  return (
    import.meta.env.DEV ||
    ['localhost', '127.0.0.1'].includes(window.location.hostname)
  );
}

function logFieldCommand(zoneId, title, detail) {
  const zoneState = useZoneStore.getState();
  const zone = zoneState.zones?.[zoneId] || {};
  useActivityLogStore.getState().logActivity({
    type: 'field-command',
    farmerPhone: zoneState.farmerPhone,
    farmerName: zoneState.userName || zoneState.farmName || 'Farmer',
    zoneId,
    zoneName: zone.name || zoneId,
    title,
    detail,
  });
}

function getAnomalyNotification(anomaly, zoneName, language = 'hi') {
  const key = `${anomaly.zone}-${anomaly.field}-${Math.floor(Date.now() / 60000)}`; // dedupe per minute
  if (notifiedAnomalies.has(key)) return null;
  notifiedAnomalies.add(key);
  // Cleanup old keys after 5 minutes
  setTimeout(() => notifiedAnomalies.delete(key), 5 * 60 * 1000);

  const fieldLabels = {
    moisture: { hi: 'नमी', mr: 'ओलावा', en: 'Moisture' },
    temperature: { hi: 'तापमान', mr: 'तापमान', en: 'Temperature' },
    humidity: { hi: 'हवा नमी', mr: 'आर्द्रता', en: 'Humidity' },
    ph: { hi: 'pH', mr: 'pH', en: 'pH' },
    ec: { hi: 'EC', mr: 'EC', en: 'EC' },
    nitrogen: { hi: 'नाइट्रोजन', mr: 'नायट्रोजन', en: 'Nitrogen' },
    phosphorus: { hi: 'फास्फोरस', mr: 'फॉस्फरस', en: 'Phosphorus' },
    potassium: { hi: 'पोटाश', mr: 'पोटॅश', en: 'Potassium' },
  };

  const fieldLabel = (fieldLabels[anomaly.field] || { hi: anomaly.field, mr: anomaly.field, en: anomaly.field })[language];
  const sevLabel = anomaly.severity === 'critical' ? '🔴' : '🟠';

  if (language === 'mr') {
    return {
      type: 'anomaly',
      title: `${sevLabel} ${zoneName}: असामान्य ${fieldLabel}`,
      subtitle: `${fieldLabel} ${anomaly.type === 'out_of_bounds' ? 'मर्यादेबाहेर' : 'असामान्यपणे'} बदलले — ${anomaly.value}`,
      body: `सेन्सर तपासा. Z-score: ${anomaly.zScore || 'N/A'}`,
      actionRoute: '/zone/' + anomaly.zone,
    };
  }
  if (language === 'en') {
    return {
      type: 'anomaly',
      title: `${sevLabel} ${zoneName}: Abnormal ${fieldLabel}`,
      subtitle: `${fieldLabel} ${anomaly.type === 'out_of_bounds' ? 'out of bounds' : 'anomaly detected'} — value: ${anomaly.value}`,
      body: `Check sensor. Z-score: ${anomaly.zScore || 'N/A'}`,
      actionRoute: '/zone/' + anomaly.zone,
    };
  }
  return {
    type: 'anomaly',
    title: `${sevLabel} ${zoneName}: असामान्य ${fieldLabel}`,
    subtitle: `${fieldLabel} अचानक बदला — मान: ${anomaly.value}`,
    body: `सेंसर जांचें। Z-score: ${anomaly.zScore || 'N/A'}`,
    actionRoute: '/zone/' + anomaly.zone,
  };
}

export function useMqtt() {
  const [status, setStatus] = useState(mqttClient.getStatus());

  useEffect(() => {
    const unsub = mqttClient.onStatus(setStatus);
    if (!mqttClient.isConnected()) mqttClient.connect();

    const onZonesChanged = () => mqttClient.resubscribeZones();
    document.addEventListener('zones-changed', onZonesChanged);

    return () => {
      unsub();
      document.removeEventListener('zones-changed', onZonesChanged);
    };
  }, []);

  const publishPump = useCallback((zoneId, on, triggeredBy = 'manual') => {
    if (!zoneId || String(zoneId) === 'null') return false;
    const payload = on ? CMD.PUMP_ON : CMD.PUMP_OFF;
    const ok = mqttClient.publish(getPumpTopic(zoneId), payload);
    // In the local demo there may be no physical MQTT device. Mirror the state
    // so controls, including Stop pump, remain demonstrably functional there.
    // A deployed/real farm never mirrors a failed publish as a hardware action.
    if (ok || canMirrorHardwareLocally()) {
      useZoneStore.getState().setPumpState(zoneId, on);
      if (!on) {
        useZoneStore.getState().updateZoneField(zoneId, 'pumpOffTime', null);
      }
      logFieldCommand(zoneId, on ? 'Irrigation started' : 'Irrigation stopped', `${zoneId} pump command sent by ${triggeredBy}.`);
      if (ok) {
        writeHardwareEvent(zoneId, 'pump', payload, triggeredBy).catch(() => {});
      }
    }
    return ok || canMirrorHardwareLocally();
  }, []);

  const publishValve = useCallback((zoneId, open, triggeredBy = 'manual') => {
    if (!zoneId || String(zoneId) === 'null') return false;
    const payload = open ? CMD.VALVE_OPEN : CMD.VALVE_CLOSE;
    const ok = mqttClient.publish(getValveTopic(zoneId), payload);
    if (ok || canMirrorHardwareLocally()) {
      useZoneStore.getState().setValveState(zoneId, open);
      logFieldCommand(zoneId, open ? 'Valve opened' : 'Valve closed', `${zoneId} valve command sent by ${triggeredBy}.`);
      if (ok) {
        writeHardwareEvent(zoneId, 'valve', payload, triggeredBy).catch(() => {});
      }
    }
    return ok || canMirrorHardwareLocally();
  }, []);

  const publishFertigation = useCallback((zoneId, start, triggeredBy = 'manual') => {
    if (!zoneId || String(zoneId) === 'null') return false;
    const payload = start ? CMD.FERT_START : CMD.FERT_STOP;
    const ok = mqttClient.publish(getFertTopic(zoneId), payload);
    if (ok || canMirrorHardwareLocally()) {
      useZoneStore.getState().setFertigationState(zoneId, start);
      if (ok) {
        writeHardwareEvent(zoneId, 'fertigation', payload, triggeredBy).catch(() => {});
        logFieldCommand(zoneId, start ? 'Fertigation started' : 'Fertigation stopped', `${zoneId} fertigation command sent by ${triggeredBy}.`);
      }
    }
    return ok || canMirrorHardwareLocally();
  }, []);

  const publishThreshold = useCallback((zoneId, threshold) => {
    if (!zoneId || String(zoneId) === 'null') return false;
    const ok = mqttClient.publish(`krishisarth/${zoneId}/cmd/threshold`, threshold);
    if (ok) {
      useZoneStore.getState().updateZoneField(zoneId, 'stopThreshold', threshold);
    }
    return ok;
  }, []);

  const publishTankDose = useCallback((tank, doseMl) => {
    const topicMap = {
      tankA: 'krishisarth/npk/cmd/tank_a',
      tankB: 'krishisarth/npk/cmd/tank_b',
      tankC: 'krishisarth/npk/cmd/tank_c',
    };
    return mqttClient.publish(topicMap[tank], String(doseMl));
  }, []);

  const publishFertigationDose = useCallback((command) => {
    const ok = mqttClient.publish(TOPICS.FERTIGATION_CMD_DOSE, JSON.stringify(command));
    if ((ok || canMirrorHardwareLocally()) && command?.zoneId) {
      useZoneStore.getState().setFertigationState(command.zoneId, true);
      if (ok) {
        writeHardwareEvent(command.zoneId, 'fertigation_dose', JSON.stringify(command), 'advisor').catch(() => {});
      }
    }
    return ok || canMirrorHardwareLocally();
  }, []);

  const publishSystemMode = useCallback((nextMode) => {
    return mqttClient.publish('krishisarth/system/mode', nextMode === 'act' ? 'ACT' : 'VIEW');
  }, []);

  /**
   * Run anomaly detection on incoming sensor readings.
   * Call this whenever a new sensor value arrives (from MQTT message handler).
   * Automatically fires a notification if an anomaly is detected.
   */
  const checkAndNotifyAnomaly = useCallback((zoneId, field, value) => {
    try {
      const zones = useZoneStore.getState().zones;
      const zone = zones[zoneId];
      if (!zone) return;

      const anomaly = detectAnomaly(zoneId, field, value);
      if (!anomaly) return;

      const language = 'hi'; // Will use store language in a real app
      const notification = getAnomalyNotification(anomaly, zone.name || zoneId, language);
      if (notification) {
        useNotificationStore.getState().addNotification(notification);
      }
    } catch (err) {
      // Non-critical: anomaly detection should never break the MQTT flow
      console.warn('[AnomalyBridge]', err);
    }
  }, []);

  // Expose publishPump on window so ChatBot voice hardware can reach it
  useEffect(() => {
    window.__ks_mqtt__ = { publishPump, publishValve, publishFertigation, publishFertigationDose };
    return () => { window.__ks_mqtt__ = null; };
  }, [publishPump, publishValve, publishFertigation, publishFertigationDose]);

  return {
    status,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting' || status === 'reconnecting',
    isMaxRetries: status === 'max_retries',
    retryConnection: () => mqttClient.manualRetry(),
    publishPump,
    publishValve,
    publishFertigation,
    publishThreshold,
    publishTankDose,
    publishFertigationDose,
    publishSystemMode,
    checkAndNotifyAnomaly,
  };
}
