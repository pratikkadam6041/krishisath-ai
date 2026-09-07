import { getQueryApi, isInfluxConnected, getInfluxBucket } from './influxClient.js';

async function runQuery(fluxQuery) {
  if (!isInfluxConnected()) return [];
  return new Promise((resolve, reject) => {
    const rows = [];
    getQueryApi().queryRows(fluxQuery, {
      next(row, tableMeta) { rows.push(tableMeta.toObject(row)); },
      error(e) { console.warn('[InfluxDB] Query error:', e.message); resolve([]); },
      complete() { resolve(rows); },
    });
  });
}

const bucket = () => getInfluxBucket();

/** Last 24h moisture trend per zone — returns [{_time, _value, zone_id}] */
export async function queryMoistureTrend(zoneId = 'z1', hours = 24) {
  const flux = `
    from(bucket: "${bucket()}")
      |> range(start: -${hours}h)
      |> filter(fn: (r) => r._measurement == "zone_telemetry")
      |> filter(fn: (r) => r.zone_id == "${zoneId}")
      |> filter(fn: (r) => r.sensor_type == "moisture")
      |> aggregateWindow(every: 30m, fn: mean, createEmpty: false)
      |> yield(name: "moisture_trend")
  `;
  return runQuery(flux);
}

/** Pump runtime total per day */
export async function queryPumpRuntime(zoneId = 'z1', days = 7) {
  const flux = `
    from(bucket: "${bucket()}")
      |> range(start: -${days}d)
      |> filter(fn: (r) => r._measurement == "hardware_events")
      |> filter(fn: (r) => r.zone_id == "${zoneId}")
      |> filter(fn: (r) => r.device == "pump")
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> yield(name: "pump_runtime")
  `;
  return runQuery(flux);
}

/** Water consumption estimate per zone */
export async function queryWaterConsumption(zoneId = 'z1', days = 7) {
  const flux = `
    from(bucket: "${bucket()}")
      |> range(start: -${days}d)
      |> filter(fn: (r) => r._measurement == "zone_telemetry")
      |> filter(fn: (r) => r.zone_id == "${zoneId}")
      |> filter(fn: (r) => r.sensor_type == "flow")
      |> aggregateWindow(every: 1d, fn: sum, createEmpty: false)
      |> yield(name: "water_consumption")
  `;
  return runQuery(flux);
}

/** Fertigation history per tank */
export async function queryFertigationHistory(tank = 'tankA', days = 30) {
  const flux = `
    from(bucket: "${bucket()}")
      |> range(start: -${days}d)
      |> filter(fn: (r) => r._measurement == "fertigation_events")
      |> filter(fn: (r) => r.tank == "${tank}")
      |> yield(name: "fert_history")
  `;
  return runQuery(flux);
}

/** Temperature trend for crop stress detection */
export async function queryTemperatureTrend(zoneId = 'z1', hours = 48) {
  const flux = `
    from(bucket: "${bucket()}")
      |> range(start: -${hours}h)
      |> filter(fn: (r) => r._measurement == "zone_telemetry")
      |> filter(fn: (r) => r.zone_id == "${zoneId}")
      |> filter(fn: (r) => r.sensor_type == "temperature")
      |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
      |> yield(name: "temp_trend")
  `;
  return runQuery(flux);
}

/** Generic multi-sensor query for history screen */
export async function querySensorHistory(zoneId, sensorType, hours = 24) {
  const flux = `
    from(bucket: "${bucket()}")
      |> range(start: -${hours}h)
      |> filter(fn: (r) => r._measurement == "zone_telemetry")
      |> filter(fn: (r) => r.zone_id == "${zoneId}")
      |> filter(fn: (r) => r.sensor_type == "${sensorType}")
      |> aggregateWindow(every: 20m, fn: mean, createEmpty: false)
      |> yield(name: "${sensorType}_history")
  `;
  return runQuery(flux);
}
