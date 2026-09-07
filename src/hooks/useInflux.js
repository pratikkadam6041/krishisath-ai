import { useState, useCallback, useRef } from 'react';
import { querySensorHistory, queryMoistureTrend, queryPumpRuntime } from '../influxdb/queryService.js';
import { isInfluxConnected } from '../influxdb/influxClient.js';

const cache = new Map();
const CACHE_TTL = 60000; // 1 min

function cacheKey(fn, ...args) { return `${fn}:${args.join(',')}`; }

export function useInflux() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pendingRef = useRef(new Set());

  const query = useCallback(async (queryFn, ...args) => {
    const key = cacheKey(queryFn.name, ...args);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

    if (pendingRef.current.has(key)) return [];

    // Gracefully fail if InfluxDB not connected
    if (!isInfluxConnected()) return [];

    pendingRef.current.add(key);
    setLoading(true);
    setError(null);

    try {
      const data = await queryFn(...args);
      cache.set(key, { data, ts: Date.now() });
      return data;
    } catch (e) {
      setError(e.message);
      return [];
    } finally {
      pendingRef.current.delete(key);
      setLoading(false);
    }
  }, []);

  const getMoistureHistory = useCallback((zoneId, hours = 24) =>
    query(queryMoistureTrend, zoneId, hours), [query]);

  const getPumpHistory = useCallback((zoneId, days = 7) =>
    query(queryPumpRuntime, zoneId, days), [query]);

  const getSensorHistory = useCallback((zoneId, sensorType, hours = 24) =>
    query(querySensorHistory, zoneId, sensorType, hours), [query]);

  return { loading, error, getMoistureHistory, getPumpHistory, getSensorHistory };
}
