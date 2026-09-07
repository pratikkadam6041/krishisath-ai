import { useZoneStore } from '../store/zoneStore.js';

export function useZoneData(zoneId) {
  const zone = useZoneStore((s) => s.zones[zoneId]);
  const isDemo = useZoneStore((s) => s.isDemo);
  const getMoistureStatus = useZoneStore((s) => s.getMoistureStatus);

  const moistureStatus = getMoistureStatus(zoneId);

  const healthColor = {
    optimal: '#2E7D32', low: '#F9A825', critical: '#C62828', high: '#0277BD',
  }[moistureStatus] || '#555555';

  const getPumpRuntime = () => {
    if (!zone?.pumpOn || !zone?.pumpStartTime) return null;
    const ms = Date.now() - zone.pumpStartTime;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return {
    zone,
    isDemo,
    moistureStatus,
    healthColor,
    pumpRuntime: getPumpRuntime(),
  };
}
