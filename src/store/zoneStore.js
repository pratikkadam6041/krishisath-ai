import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { nextZoneId as generateNextZoneId, syncNotificationsFromZones } from '../utils/zoneSync.js';

const ZONE_STORE_SYNC_KEY = 'ks-zone-store-sync';

function afterZonesMutation(zones) {
  queueMicrotask(() => {
    syncNotificationsFromZones(zones);
    document.dispatchEvent(new CustomEvent('zones-changed', { detail: { zones } }));
    try {
      window.localStorage.setItem(ZONE_STORE_SYNC_KEY, String(Date.now()));
    } catch {
      // Local sync is best-effort; state persistence still works without it.
    }
  });
}

const now = Date.now();

const DEFAULT_TANKS = {
  tankA: 82,
  tankB: 76,
  tankC: 68,
  composition: 0,
};

const DEFAULT_FERTIGATION_CALIBRATION = {
  tankA: 1.8,
  tankB: 1.6,
  tankC: 1.7,
  waterFlow: 80,
};

const DEFAULT_ZONES = {
  z1: {
    id: 'z1',
    name: 'North Field',
    cropType: 'wheat',
    area: 2.5,
    zoneType: 'sensor',
    moisture: 42,
    temperature: 30.5,
    humidity: 64,
    ph: 6.8,
    ec: 1.2,
    nitrogen: 210,
    phosphorus: 110,
    potassium: 195,
    flow: 3.4,
    pumpOn: false,
    valveOpen: false,
    fertigationOn: false,
    cropStage: 'Vegetative',
    pumpStartTime: null,
    battery: null,
    online: false,
    lastUpdated: null,
    lastTelemetryAt: null,
    sowingDate: now - 45 * 24 * 60 * 60 * 1000,
    waterUsageToday: 104,
  },
  z2: {
    id: 'z2',
    name: 'South Orchard',
    cropType: 'tomato',
    area: 1.8,
    zoneType: 'sensor',
    moisture: 71,
    temperature: 28.9,
    humidity: 69,
    ph: 7.1,
    ec: 0.9,
    nitrogen: 235,
    phosphorus: 122,
    potassium: 201,
    flow: 0,
    pumpOn: true,
    valveOpen: true,
    fertigationOn: false,
    cropStage: 'Flowering',
    pumpStartTime: now - 38 * 60 * 1000,
    battery: null,
    online: false,
    lastUpdated: null,
    lastTelemetryAt: null,
    sowingDate: now - 62 * 24 * 60 * 60 * 1000,
    waterUsageToday: 100,
  },
};

export const useZoneStore = create(
  persist(
    (set, get) => ({
      zones: DEFAULT_ZONES,
      weatherCache: null,
      userName: '',
      farmerPhone: '',
      farmName: 'Sarth Farm',
      village: 'Pimpri',
      district: 'Pune',
      state: 'Maharashtra',
      totalAcres: 4.3,
      selectedCrops: ['wheat', 'tomato'],
      isManualMode: false,
      isDemo: false,
      manualEntries: {},
      queuedCommands: [],
      tanks: DEFAULT_TANKS,
      fertigationCalibration: DEFAULT_FERTIGATION_CALIBRATION,
      soilReports: {},
      fertigationHistory: [],

      setUserProfile: ({
        userName,
        farmerPhone,
        farmName,
        district,
        state,
        village,
        totalAcres,
        crops,
        isManualMode,
      }) =>
        set((current) => ({
          userName: userName || current.userName,
          farmerPhone: farmerPhone || current.farmerPhone,
          farmName: farmName || current.farmName,
          district: district || current.district,
          state: state || current.state,
          village: village || current.village,
          totalAcres: totalAcres ?? current.totalAcres,
          selectedCrops: crops?.length ? crops : current.selectedCrops,
          isManualMode: Boolean(isManualMode),
        })),

      setWeatherCache: (weather) => set({ weatherCache: weather }),

      setDemo: (isDemo) => set({ isDemo: Boolean(isDemo) }),

      addZone: (zoneId, zone = {}) => {
        let next;
        set((state) => {
          next = {
            ...state.zones,
            [zoneId]: {
              id: zoneId,
              name: zone.name || `Zone ${Object.keys(state.zones).length + 1}`,
              cropType: zone.cropType || state.selectedCrops[0] || 'wheat',
              area: zone.area || 1,
              zoneType: zone.isManual ? 'manual' : 'sensor',
              moisture: zone.isManual ? 0 : 48,
              temperature: zone.isManual ? null : 29,
              humidity: zone.isManual ? null : 62,
              ph: zone.isManual ? null : 6.7,
              ec: zone.isManual ? null : 1.1,
              nitrogen: zone.isManual ? null : 180,
              phosphorus: zone.isManual ? null : 94,
              potassium: zone.isManual ? null : 168,
              flow: 0,
              pumpOn: false,
              valveOpen: false,
              fertigationOn: false,
              cropStage: 'Vegetative',
              pumpStartTime: null,
              battery: zone.isManual ? null : 100,
              online: false,
              lastUpdated: zone.isManual ? null : Date.now(),
              lastTelemetryAt: zone.isManual ? null : null,
              sowingDate: Date.now() - 35 * 24 * 60 * 60 * 1000,
              waterUsageToday: 0,
            },
          };
          return { zones: next };
        });
        afterZonesMutation(next);
      },

      nextZoneId: () => generateNextZoneId(get().zones),

      replaceZones: (zones) => {
        set({ zones });
        afterZonesMutation(zones);
      },

      configureZonesForMode: ({ isManualMode, crops = [] }) => {
        let next;
        set(() => {
          if (isManualMode) {
            next = {
              isManualMode: true,
              zones: {
                manual1: {
                  id: 'manual1',
                  name: 'Main Plot',
                  cropType: crops[0] || 'wheat',
                  area: 2,
                  zoneType: 'manual',
                  moisture: 58,
                  temperature: null,
                  humidity: null,
                  ph: null,
                  ec: null,
                  nitrogen: null,
                  phosphorus: null,
                  potassium: null,
                  flow: 0,
                  pumpOn: false,
                  valveOpen: false,
                  fertigationOn: false,
                  cropStage: 'Vegetative',
                  pumpStartTime: null,
                  battery: null,
                  online: false,
                  lastUpdated: null,
                  lastTelemetryAt: null,
                  sowingDate: Date.now() - 28 * 24 * 60 * 60 * 1000,
                  waterUsageToday: 0,
                },
              },
            };
            return next;
          }

          next = {
            isManualMode: false,
            zones: {
              z1: {
                ...DEFAULT_ZONES.z1,
                cropType: crops[0] || DEFAULT_ZONES.z1.cropType,
              },
              z2: {
                ...DEFAULT_ZONES.z2,
                cropType: crops[1] || crops[0] || DEFAULT_ZONES.z2.cropType,
              },
            },
          };
          return next;
        });
        afterZonesMutation(next?.zones || get().zones);
      },

      updateZoneBulk: (zoneId, data) =>
        set((state) => ({
          zones: {
            ...state.zones,
            [zoneId]: {
              ...state.zones[zoneId],
              ...data,
              lastUpdated: data.lastUpdated ?? Date.now(),
            },
          },
        })),

      updateZone: (zoneId, key, value) =>
        set((state) => ({
          zones: {
            ...state.zones,
            [zoneId]: {
              ...state.zones[zoneId],
              [key]: value,
              lastUpdated: Date.now(),
            },
          },
        })),

      applySensorReading: (zoneId, key, value, { isRetained = false } = {}) =>
        set((state) => {
          const now = Date.now();
          return {
            zones: {
              ...state.zones,
              [zoneId]: {
                ...state.zones[zoneId],
                [key]: value,
                online: true,
                lastTelemetryAt: isRetained
                  ? state.zones[zoneId]?.lastTelemetryAt ?? null
                  : now,
                lastUpdated: isRetained ? state.zones[zoneId]?.lastUpdated : now,
              },
            },
          };
        }),

      updateZoneField: (zoneId, key, value) =>
        set((state) => ({
          zones: {
            ...state.zones,
            [zoneId]: {
              ...state.zones[zoneId],
              [key]: value,
              lastUpdated: Date.now(),
            },
          },
        })),

      removeZone: (zoneId) => {
        let nextZones;
        set((state) => {
          nextZones = { ...state.zones };
          delete nextZones[zoneId];
          return { zones: nextZones };
        });
        afterZonesMutation(nextZones);
      },

      setManualEntry: (zoneId, payload) =>
        set((state) => ({
          manualEntries: {
            ...state.manualEntries,
            [zoneId]: {
              ...payload,
              stage: payload.stage || payload.cropStage || '',
              cropStage: payload.cropStage || payload.stage || '',
              updatedAt: Date.now(),
            },
          },
          zones: {
            ...state.zones,
            [zoneId]: {
              ...state.zones[zoneId],
              lastUpdated: Date.now(),
              moisture:
                payload.observation === 'Dry'
                  ? 34
                  : payload.observation === 'Wet'
                  ? 82
                  : 58,
            },
          },
        })),

      updateWeather: (weatherPatch) =>
        set((state) => ({
          weatherCache: {
            ...(state.weatherCache || {}),
            ...weatherPatch,
            lastUpdated: Date.now(),
          },
        })),

      setPumpState: (zoneId, pumpOn) =>
        set((state) => ({
          zones: {
            ...state.zones,
            [zoneId]: {
              ...state.zones[zoneId],
              pumpOn,
              pumpStartTime: pumpOn ? Date.now() : null,
              waterUsageToday: pumpOn
                ? (state.zones[zoneId]?.waterUsageToday || 0) + 24
                : state.zones[zoneId]?.waterUsageToday || 0,
            },
          },
        })),

      setValveState: (zoneId, valveOpen) =>
        set((state) => ({
          zones: {
            ...state.zones,
            [zoneId]: {
              ...state.zones[zoneId],
              valveOpen,
            },
          },
        })),

      setFertigationState: (zoneId, fertigationOn) =>
        set((state) => ({
          zones: {
            ...state.zones,
            [zoneId]: {
              ...state.zones[zoneId],
              fertigationOn,
            },
          },
        })),

      updateTankLevel: (tankId, level) =>
        set((state) => ({
          tanks: {
            ...(state.tanks || DEFAULT_TANKS),
            [tankId]: Math.max(0, Math.min(100, Number(level) || 0)),
          },
        })),

      updateFertigationCalibration: (patch) =>
        set((state) => ({
          fertigationCalibration: {
            ...(state.fertigationCalibration || DEFAULT_FERTIGATION_CALIBRATION),
            ...patch,
          },
        })),

      saveSoilReport: (zoneId, report) => {
        let nextZones;
        let savedReport;

        set((state) => {
          const existingReports = Array.isArray(state.soilReports?.[zoneId]) ? state.soilReports[zoneId] : [];
          const version = existingReports.length + 1;
          const nextReport = {
            ...report,
            id: report.id || `soil-${zoneId}-${Date.now()}`,
            version,
            zoneId,
            createdAt: Date.now(),
          };
          savedReport = nextReport;
          nextZones = {
            ...state.zones,
            [zoneId]: {
              ...state.zones[zoneId],
              cropStage: nextReport.cropStage || state.zones[zoneId]?.cropStage,
              nitrogen: nextReport.nitrogen ?? state.zones[zoneId]?.nitrogen,
              phosphorus: nextReport.phosphorus ?? state.zones[zoneId]?.phosphorus,
              potassium: nextReport.potassium ?? state.zones[zoneId]?.potassium,
              ph: nextReport.ph ?? state.zones[zoneId]?.ph,
              ec: nextReport.ec ?? state.zones[zoneId]?.ec,
              lastUpdated: Date.now(),
            },
          };

          return {
            soilReports: {
              ...(state.soilReports || {}),
              [zoneId]: [nextReport, ...existingReports],
            },
            zones: nextZones,
          };
        });

        afterZonesMutation(nextZones || get().zones);
        return savedReport;
      },

      logFertigationEvent: (event) =>
        set((state) => ({
          fertigationHistory: [
            {
              id: event.id || `fert-${Date.now()}`,
              createdAt: Date.now(),
              ...event,
            },
            ...(state.fertigationHistory || []),
          ].slice(0, 80),
        })),

      setZoneOnlineStatus: (zoneId, online) =>
        set((state) => ({
          zones: {
            ...state.zones,
            [zoneId]: {
              ...state.zones[zoneId],
              online,
            },
          },
        })),

      queuePumpCommand: (zoneId, action) =>
        set((state) => ({
          queuedCommands: [
            ...state.queuedCommands.filter((entry) => !(entry.zoneId === zoneId && entry.type === 'pump')),
            { zoneId, type: 'pump', action, queuedAt: Date.now() },
          ],
        })),

      clearQueuedCommands: () => set({ queuedCommands: [] }),

      getZone: (zoneId) => get().zones[zoneId],

      getActiveSoilReport: (zoneId) => {
        const reports = get().soilReports?.[zoneId];
        return Array.isArray(reports) ? reports[0] || null : null;
      },

      getZonesArray: () => Object.values(get().zones),

      getMoistureStatus: (zoneId) => {
        const moisture = get().zones[zoneId]?.moisture ?? 0;
        if (moisture < 40) return 'critical';
        if (moisture <= 60) return 'watch';
        if (moisture <= 80) return 'optimal';
        return 'high';
      },

      isZoneOffline: (zoneId) => {
        const zone = get().zones[zoneId];
        if (!zone || zone.zoneType === 'manual') return false;
        if (!zone.online) return true;
        const lastTelemetryAt = zone.lastTelemetryAt;
        return !(lastTelemetryAt && Date.now() - lastTelemetryAt <= 15 * 60 * 1000);
      },
    }),
    {
      name: 'ks-zone-store',
      version: 3,
      migrate: (persistedState, version) => {
        if (!persistedState) {
          return persistedState;
        }

        let nextState = persistedState;

        if (version < 2) {
          const nextZones = Object.fromEntries(
            Object.entries(persistedState.zones || {}).map(([zoneId, zone]) => [
              zoneId,
              zone?.zoneType === 'manual'
                ? zone
                : {
                    ...zone,
                    online: false,
                    lastTelemetryAt: null,
                    lastUpdated: null,
                  },
            ])
          );

          nextState = {
            ...nextState,
            zones: nextZones,
          };
        }

        return {
          ...nextState,
          tanks: { ...DEFAULT_TANKS, ...(nextState.tanks || {}) },
          fertigationCalibration: {
            ...DEFAULT_FERTIGATION_CALIBRATION,
            ...(nextState.fertigationCalibration || {}),
          },
          soilReports: nextState.soilReports || {},
          fertigationHistory: nextState.fertigationHistory || [],
        };
      },
      partialize: (state) => ({
        zones: state.zones,
        tanks: state.tanks,
        fertigationCalibration: state.fertigationCalibration,
        soilReports: state.soilReports,
        fertigationHistory: state.fertigationHistory,
        userName: state.userName,
        farmerPhone: state.farmerPhone,
        farmName: state.farmName,
        village: state.village,
        district: state.district,
        state: state.state,
        totalAcres: state.totalAcres,
        selectedCrops: state.selectedCrops,
        isManualMode: state.isManualMode,
        isDemo: state.isDemo,
        manualEntries: state.manualEntries,
        weatherCache: state.weatherCache,
      }),
    }
  )
);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'ks-zone-store' || event.key === ZONE_STORE_SYNC_KEY) {
      useZoneStore.persist.rehydrate();
    }
  });

  window.addEventListener('focus', () => {
    useZoneStore.persist.rehydrate();
  });

  window.addEventListener('pageshow', () => {
    useZoneStore.persist.rehydrate();
  });
}
