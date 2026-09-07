import { getWriteApi, isInfluxConnected } from './influxClient.js';

/**
 * Write a sensor reading to InfluxDB
 * measurement: zone_telemetry
 * tags: zone_id, sensor_type
 * fields: value
 */
export async function writeSensorReading(zoneId, sensorType, value) {
  if (!isInfluxConnected()) return;
  try {
    const { Point } = await import('@influxdata/influxdb-client');
    const point = new Point('zone_telemetry')
      .tag('zone_id', zoneId)
      .tag('sensor_type', sensorType)
      .floatField('value', parseFloat(value))
      .timestamp(new Date());
    getWriteApi().writePoint(point);
  } catch (e) {
    console.warn('[InfluxDB] Write sensor failed:', e.message);
  }
}

/**
 * Write a hardware action event to InfluxDB
 * measurement: hardware_events
 * tags: zone_id, device
 * fields: action (string), triggered_by (string)
 */
export async function writeHardwareEvent(zoneId, device, action, triggeredBy = 'manual') {
  if (!isInfluxConnected()) return;
  try {
    const { Point } = await import('@influxdata/influxdb-client');
    const point = new Point('hardware_events')
      .tag('zone_id', zoneId)
      .tag('device', device)
      .stringField('action', action)
      .stringField('triggered_by', triggeredBy)
      .timestamp(new Date());
    getWriteApi().writePoint(point);
  } catch (e) {
    console.warn('[InfluxDB] Write event failed:', e.message);
  }
}

/**
 * Write NPK tank dose
 */
export async function writeFertigationDose(tank, doseMl) {
  if (!isInfluxConnected()) return;
  try {
    const { Point } = await import('@influxdata/influxdb-client');
    const point = new Point('fertigation_events')
      .tag('tank', tank)
      .floatField('dose_ml', parseFloat(doseMl))
      .timestamp(new Date());
    getWriteApi().writePoint(point);
  } catch (e) {
    console.warn('[InfluxDB] Write fert dose failed:', e.message);
  }
}
