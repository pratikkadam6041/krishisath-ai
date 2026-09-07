import { useEffect, useRef } from 'react';
import { useZoneStore } from '../store/zoneStore.js';
import { useAlertStore } from '../store/alertStore.js';
import { useSettingsStore } from '../store/settingsStore.js';

export function useAlerts() {
  const zones     = useZoneStore((s) => s.zones);
  const addAlert  = useAlertStore((s) => s.addAlert);
  const moistureLowThreshold = useSettingsStore((s) => s.moistureLowThreshold);
  const moistureHighThreshold = useSettingsStore((s) => s.moistureHighThreshold);
  const pumpMaxHours = useSettingsStore((s) => s.pumpMaxHours);

  const settings = { moistureLowThreshold, moistureHighThreshold, pumpMaxHours };

  const lastAlerts = useRef({});

  useEffect(() => {
    const throttle = (key, fn, ms = 300000) => {
      const now = Date.now();
      if (!lastAlerts.current[key] || now - lastAlerts.current[key] > ms) {
        lastAlerts.current[key] = now;
        fn();
      }
    };

    for (const [zoneId, zone] of Object.entries(zones)) {
      if (!zone) continue;
      const zoneName = zoneId.toUpperCase();

      // Critical moisture
      if (zone.moisture < settings.moistureLowThreshold) {
        throttle(`moisture_critical_${zoneId}`, () =>
          addAlert({
            type: 'critical',
            titleKey: 'alert.critical',
            messageKey: 'alert.criticalMoisture',
            params: { zone: zoneName },
            zone: zoneId,
          })
        );
      }

      // Pump running too long
      if (zone.pumpOn && zone.pumpStartTime) {
        const hrs = (Date.now() - zone.pumpStartTime) / 3600000;
        if (hrs >= settings.pumpMaxHours) {
          throttle(`pump_long_${zoneId}`, () =>
            addAlert({
              type: 'warning',
              titleKey: 'alert.warning',
              messageKey: 'alert.pumpTooLong',
              params: { zone: zoneName, hours: Math.round(hrs) },
              zone: zoneId,
            })
          );
        }
      }

      // pH imbalance
      if (zone.ph < 5.5) {
        throttle(`ph_low_${zoneId}`, () =>
          addAlert({
            type: 'warning',
            titleKey: 'alert.warning',
            messageKey: 'alert.phImbalance',
            params: { zone: zoneName, state: 'कमी' },
            zone: zoneId,
          })
        );
      } else if (zone.ph > 8.0) {
        throttle(`ph_high_${zoneId}`, () =>
          addAlert({
            type: 'warning',
            titleKey: 'alert.warning',
            messageKey: 'alert.phImbalance',
            params: { zone: zoneName, state: 'जास्त' },
            zone: zoneId,
          })
        );
      }

      // High moisture warning
      if (zone.moisture > settings.moistureHighThreshold) {
        throttle(`moisture_high_${zoneId}`, () =>
          addAlert({
            type: 'info',
            titleKey: 'alert.info',
            messageKey: 'alert.ecHigh',
            params: { zone: zoneName },
            zone: zoneId,
          })
        );
      }
    }
  }, [zones, addAlert, settings]);
}
