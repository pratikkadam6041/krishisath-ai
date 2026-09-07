import mqtt from 'mqtt';
import { TOPICS } from './mqttTopics.js';
import { buildSubscribeTopics, buildTopicMap } from '../utils/zoneSync.js';
import { useZoneStore } from '../store/zoneStore.js';
import { useAlertStore } from '../store/alertStore.js';
import { writeSensorReading } from '../influxdb/writeService.js';
import { detectAnomaly } from '../ai-ml/anomalyDetection.js';
import { handleRainData } from '../ai-ml/rainIntegration.js';

const DEFAULT_BROKER_URLS = [
  'ws://broker.emqx.io:8083/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
];

function buildBrokerUrls() {
  const configured = [
    import.meta.env.VITE_MQTT_BROKER_URLS,
    import.meta.env.VITE_MQTT_BROKER_URL,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set([...configured, ...DEFAULT_BROKER_URLS])];
}

const BROKER_URLS = buildBrokerUrls();
const BASE_DELAY = 500;
const MAX_DELAY = 3000;

class MqttClientSingleton {
  constructor() {
    this.client = null;
    this.retryCount = 0;
    this.retryTimer = null;
    this.brokerIndex = 0;
    this.shouldReconnect = true;
    this.statusListeners = new Set();
    this.status = 'disconnected';
  }

  onStatus(fn) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  _emit(status) {
    this.status = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  connect() {
    if (this.client?.connected) return;
    if (this.status === 'connecting' && this.client) return;

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    this.shouldReconnect = true;
    this._emit(this.retryCount > 0 ? 'reconnecting' : 'connecting');

    const clientId = `${import.meta.env.VITE_MQTT_CLIENT_ID_PREFIX || 'krishisarth_web_'}${Date.now()}`;
    const brokerUrl = BROKER_URLS[this.brokerIndex % BROKER_URLS.length];

    if (this.client) {
      try {
        this.client.end(true);
      } catch {
        // Ignore cleanup failures from stale MQTT clients.
      }
      this.client = null;
    }

    try {
      const client = mqtt.connect(brokerUrl, {
        clientId,
        keepalive: 30,
        reconnectPeriod: 0,
        connectTimeout: 4000,
        clean: true,
      });
      this.client = client;
    } catch (e) {
      console.error('[MQTT] Connect error:', e);
      this._scheduleRetry();
      return;
    }

    const activeClient = this.client;

    activeClient.on('connect', () => {
      if (this.client !== activeClient) return;
      this.retryCount = 0;
      this._emit('connected');
      useZoneStore.getState().setDemo(false);
      this.resubscribeZones();
      console.log('[MQTT] Connected to', brokerUrl);
    });

    activeClient.on('message', (topic, payloadBuf, packet) => {
      if (this.client !== activeClient) return;
      const raw = payloadBuf.toString().trim();
      const value = parseFloat(raw);
      this._routeMessage(topic, isNaN(value) ? raw : value, { isRetained: Boolean(packet?.retain) });
    });

    activeClient.on('error', (err) => {
      if (this.client !== activeClient) return;
      console.warn(`[MQTT] Error (${brokerUrl}):`, err.message);
    });

    activeClient.on('close', () => {
      if (this.client !== activeClient || !this.shouldReconnect) return;
      this._scheduleRetry();
    });

    activeClient.on('offline', () => {
      if (this.client !== activeClient) return;
      this._emit('disconnected');
    });
  }

  _scheduleRetry() {
    if (!this.shouldReconnect || this.retryTimer) {
      return;
    }

    this.retryCount++;
    this.brokerIndex = (this.brokerIndex + 1) % BROKER_URLS.length;

    const delay = Math.min(BASE_DELAY * Math.pow(1.5, Math.max(this.retryCount - 1, 0)), MAX_DELAY);
    this._emit('reconnecting');
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }

  manualRetry() {
    this.retryCount = 0;
    this.brokerIndex = 0;

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    if (this.client) {
      try {
        this.client.end(true);
      } catch {
        // Ignore cleanup failures from stale MQTT clients.
      }
      this.client = null;
    }

    this.connect();
  }

  resubscribeZones() {
    if (!this.client?.connected) return;
    const zoneIds = Object.keys(useZoneStore.getState().zones || {});
    const topics = buildSubscribeTopics(zoneIds);
    topics.forEach((topic) => this.client.subscribe(topic));
    console.log('[MQTT] Subscribed to', topics.length, 'topics for', zoneIds.length, 'zones');
  }

  _routeMessage(topic, value, options = {}) {
    const topicMap = buildTopicMap(Object.keys(useZoneStore.getState().zones || {}));
    if (topicMap[topic]) {
      const { zone, field } = topicMap[topic];
      useZoneStore.getState().applySensorReading(zone, field, value, options);

      writeSensorReading(zone, field, value).catch(() => undefined);

      const anomaly = detectAnomaly(zone, field, value);
      if (anomaly) {
        useAlertStore.getState().addAlert({
          type: 'warning',
          titleKey: 'sensor.fault',
          messageKey: 'alert.sensorFault',
          params: { zone: zone.toUpperCase(), sensor: field },
        });
      }
      return;
    }

    const statusMatch = topic.match(/^krishisarth\/([^/]+)\/status\/(pump|mode|threshold|reason|online)$/);
    if (statusMatch) {
      this._routeStatusMessage(statusMatch[1], statusMatch[2], value, options);
      return;
    }

    if (topic === TOPICS.WEATHER_RAIN) {
      useZoneStore.getState().updateWeather({ rainProb: value });
      handleRainData(value);
    }

    if (topic === TOPICS.WEATHER_TEMP) {
      useZoneStore.getState().updateWeather({ temp: value });
    }
  }

  _routeStatusMessage(zoneId, statusField, value, options = {}) {
    const normalized = String(value).trim().toUpperCase();
    const now = Date.now();

    useZoneStore.setState((state) => {
      const zone = state.zones?.[zoneId];
      if (!zone) return state;

      const patch = {
        online: options.isRetained ? zone.online : true,
        lastTelemetryAt: options.isRetained ? zone.lastTelemetryAt : now,
        lastUpdated: options.isRetained ? zone.lastUpdated : now,
      };

      if (statusField === 'pump') {
        const pumpOn = normalized === 'ON';
        patch.pumpOn = pumpOn;
        patch.valveOpen = pumpOn;
        patch.pumpStartTime = pumpOn ? zone.pumpStartTime || now : null;
      }

      if (statusField === 'mode') {
        patch.hardwareMode = normalized;
      }

      if (statusField === 'threshold') {
        patch.stopThreshold = Number(value);
      }

      if (statusField === 'reason') {
        patch.lastHardwareReason = String(value);
      }

      // LWT online/offline — hardware publishes 'online' on connect,
      // broker auto-publishes 'offline' as Last Will on unexpected disconnect
      if (statusField === 'online') {
        patch.online = String(value).toLowerCase() === 'online';
      }

      return {
        zones: {
          ...state.zones,
          [zoneId]: {
            ...zone,
            ...patch,
          },
        },
      };
    });
  }

  publish(topic, payload, opts = {}) {
    if (!this.client || !this.client.connected) {
      console.warn('[MQTT] Cannot publish - not connected');
      return false;
    }
    this.client.publish(topic, String(payload), { qos: 1, ...opts });
    return true;
  }

  disconnect() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.shouldReconnect = false;
    if (this.client) {
      try {
        this.client.end();
      } catch {
        // Ignore cleanup failures while disconnecting.
      }
    }
    this.client = null;
    this._emit('disconnected');
  }

  getStatus() { return this.status; }
  isConnected() { return this.client?.connected === true; }
}

const mqttClient = new MqttClientSingleton();
export default mqttClient;
