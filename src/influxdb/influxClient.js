// InfluxDB client singleton for KrishiSarth AI
// Uses @influxdata/influxdb-client (influxdb-client-js)

let influxClient = null;
let writeApi = null;
let queryApi = null;
let connected = false;

const INFLUX_URL    = import.meta.env.VITE_INFLUX_URL    || 'http://localhost:8086';
const INFLUX_TOKEN  = import.meta.env.VITE_INFLUX_TOKEN  || '';
const INFLUX_ORG    = import.meta.env.VITE_INFLUX_ORG    || 'krishisarth';
const INFLUX_BUCKET = import.meta.env.VITE_INFLUX_BUCKET || 'farm_data';

export async function initInflux() {
  if (!INFLUX_TOKEN) {
    console.warn('[InfluxDB] No token configured — writes/queries disabled');
    return false;
  }
  try {
    const { InfluxDB } = await import('@influxdata/influxdb-client');
    influxClient = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });
    writeApi = influxClient.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, 'ns');
    writeApi.useDefaultTags({ app: 'krishisarth' });
    queryApi = influxClient.getQueryApi(INFLUX_ORG);
    connected = true;
    console.log('[InfluxDB] Connected to', INFLUX_URL);
    return true;
  } catch (e) {
    console.error('[InfluxDB] Init failed:', e);
    return false;
  }
}

export function getWriteApi() { return writeApi; }
export function getQueryApi() { return queryApi; }
export function isInfluxConnected() { return connected; }
export function getInfluxBucket() { return INFLUX_BUCKET; }
export function getInfluxOrg() { return INFLUX_ORG; }

export async function flushWrites() {
  if (writeApi) { try { await writeApi.flush(); } catch (_) {} }
}

export async function writePoint(measurement, fields, tags = {}) {
  if (!writeApi) return false;
  try {
    const { Point } = await import('@influxdata/influxdb-client');
    const p = new Point(measurement);
    for (const [k, v] of Object.entries(tags)) p.tag(k, v);
    for (const [k, v] of Object.entries(fields)) {
      if (typeof v === 'number') p.floatField(k, v);
      else p.stringField(k, v);
    }
    writeApi.writePoint(p);
    await writeApi.flush();
    return true;
  } catch (e) {
    console.error('[InfluxDB] writePoint error:', e);
    return false;
  }
}
