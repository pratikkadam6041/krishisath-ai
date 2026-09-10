import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  refreshAllMandiData,
  appendPriceHistory,
  computePriceChange,
} from '../services/mandiService.js';
import { cacheMandi, getCachedMandi } from '../services/offlineCache.js';
import { checkMandiPriceAlerts } from '../services/notificationEngine.js';

const MANDI_DATA = [
  {
    id: 'wheat',
    cropName: 'Wheat',
    cropNameHi: 'गेहूं',
    cropNameMr: 'गहू',
    emoji: '🌾',
    variety: 'Dara',
    price: 2180,
    change: 12,
    min: 2050,
    max: 2240,
    unit: 'क्विंटल',
    mandi: 'Pune APMC',
    history7d: [2100, 2120, 2145, 2160, 2155, 2168, 2180],
  },
  {
    id: 'onion',
    cropName: 'Onion',
    cropNameHi: 'प्याज',
    cropNameMr: 'कांदा',
    emoji: '🧅',
    variety: 'Local',
    price: 1640,
    change: -8,
    min: 1580,
    max: 1720,
    unit: 'क्विंटल',
    mandi: 'Nashik APMC',
    history7d: [1700, 1680, 1660, 1650, 1648, 1648, 1640],
  },
  {
    id: 'tomato',
    cropName: 'Tomato',
    cropNameHi: 'टमाटर',
    cropNameMr: 'टोमॅटो',
    emoji: '🍅',
    variety: 'Hybrid',
    price: 890,
    change: 45,
    min: 780,
    max: 950,
    unit: 'क्विंटल',
    mandi: 'Pune APMC',
    history7d: [720, 740, 790, 820, 840, 845, 890],
  },
  {
    id: 'cotton',
    cropName: 'Cotton',
    cropNameHi: 'कपास',
    cropNameMr: 'कापूस',
    emoji: '🌼',
    variety: 'H-4',
    price: 6850,
    change: -50,
    min: 6700,
    max: 7000,
    unit: 'क्विंटल',
    mandi: 'Akola APMC',
    history7d: [7050, 7000, 6980, 6940, 6910, 6900, 6850],
  },
  {
    id: 'soybean',
    cropName: 'Soybean',
    cropNameHi: 'सोयाबीन',
    cropNameMr: 'सोयाबीन',
    emoji: '🌿',
    variety: 'Yellow',
    price: 4320,
    change: 80,
    min: 4100,
    max: 4500,
    unit: 'क्विंटल',
    mandi: 'Latur APMC',
    history7d: [4100, 4150, 4200, 4240, 4280, 4300, 4320],
  },
];

const ALL_MANDIS = [
  { id: 'pune', name: 'Pune APMC', distance: '12 km' },
  { id: 'nashik', name: 'Nashik APMC', distance: '214 km' },
  { id: 'nagpur', name: 'Nagpur APMC', distance: '720 km' },
  { id: 'solapur', name: 'Solapur APMC', distance: '249 km' },
];

export const useMandiStore = create(
  persist(
    (set, get) => ({
      crops: MANDI_DATA,
      cropsByMarket: {},
      mandis: ALL_MANDIS,
      selectedMandi: ALL_MANDIS[0],
      selectedCropIds: ['wheat', 'onion', 'tomato'],
      priceAlerts: {},
      priceHistory: {},
      priceObservationDays: {},
      priceHistorySource: {},
      lastUpdated: Date.now(),
      isDemo: true,
      isLoading: false,
      loadError: null,

      setSelectedMandi: (selectedMandi) => {
        const { cropsByMarket } = get();
        const marketCrops = cropsByMarket[selectedMandi.id];
        // An empty official response is meaningful: do not leave the previous
        // Mandi's prices visible after the user changes market.
        set({ selectedMandi, crops: marketCrops || [] });
      },

      setSelectedCrops: (selectedCropIds) => set({ selectedCropIds }),

      setPriceAlert: (cropId, thresholdPrice) =>
        set((state) => ({
          priceAlerts: {
            ...state.priceAlerts,
            [cropId]: thresholdPrice,
          },
        })),

      removePriceAlert: (cropId) =>
        set((state) => {
          const nextAlerts = { ...state.priceAlerts };
          delete nextAlerts[cropId];
          return { priceAlerts: nextAlerts };
        }),

      getCrop: (cropId) => get().crops.find((crop) => crop.id === cropId),

      getSortedCrops: () => {
        const { crops, selectedCropIds } = get();
        const selected = crops.filter((crop) => selectedCropIds.includes(crop.id));
        const others = crops.filter((crop) => !selectedCropIds.includes(crop.id));
        return [...selected, ...others];
      },

      refreshPrices: async ({ state = 'Maharashtra', cropIds } = {}) => {
        set({ isLoading: true, loadError: null });
        try {
          const ids = cropIds || get().selectedCropIds;
          const result = await refreshAllMandiData({ state, cropIds: ids });

          const priceHistory = { ...get().priceHistory };
          const priceObservationDays = { ...get().priceObservationDays };
          const priceHistorySource = { ...get().priceHistorySource };
          const mergeHistory = (cropList) =>
            cropList.map((crop) => {
              const historyKey = `${crop.marketKey || crop.mandi || 'market'}:${crop.id}`;
              const observationDay = String(crop.arrivalDate || new Date().toISOString().slice(0, 10));
              // Never carry the static demo series into a verified market chart.
              const savedHistory = crop.source === 'official' && priceHistorySource[historyKey] === 'official'
                ? priceHistory[historyKey]
                : undefined;
              const prev = savedHistory || crop.history7d || [];
              const history7d = !savedHistory?.length || priceObservationDays[historyKey] === observationDay
                ? prev
                : appendPriceHistory(prev, crop.price);
              priceHistory[historyKey] = history7d;
              priceObservationDays[historyKey] = observationDay;
              priceHistorySource[historyKey] = crop.source === 'official' ? 'official' : 'demo';
              return {
                ...crop,
                history7d,
                change: computePriceChange(history7d),
              };
            });

          const sourceCrops = result.crops?.length ? result.crops : get().crops?.length ? get().crops : MANDI_DATA;
          const crops = mergeHistory(sourceCrops);
          const cropsByMarket = {};
          Object.entries(result.cropsByMarket || {}).forEach(([marketId, list]) => {
            cropsByMarket[marketId] = mergeHistory(list);
          });

          const selectedMandi = get().selectedMandi;
          const hasSelectedMarketResponse = Object.prototype.hasOwnProperty.call(cropsByMarket, selectedMandi?.id);
          const displayCrops = hasSelectedMarketResponse
            ? cropsByMarket[selectedMandi.id]
            : crops.length
            ? crops
            : MANDI_DATA;

          const payload = {
            crops: displayCrops,
            cropsByMarket,
            priceHistory,
            priceObservationDays,
            priceHistorySource,
            mandis: result.mandis?.length ? result.mandis : get().mandis,
            isDemo: result.isDemo,
            lastUpdated: result.fetchedAt,
            isLoading: false,
            loadError: result.error,
          };

          set(payload);
          cacheMandi(payload);
          checkMandiPriceAlerts();
          return payload;
        } catch (err) {
          const cached = getCachedMandi();
          if (cached) {
            set({ ...cached, isLoading: false, loadError: err.message });
          } else {
            set({ isLoading: false, loadError: err.message });
          }
          throw err;
        }
      },

      hydrateFromCache: () => {
        const cached = getCachedMandi();
        if (cached?.crops?.length) {
          set({ ...cached, isDemo: cached.isDemo ?? true });
        } else if (!get().crops?.length) {
          set({ crops: MANDI_DATA, selectedCropIds: ['wheat', 'onion', 'tomato'], lastUpdated: Date.now() });
        }
      },
    }),
    {
      name: 'ks-mandi-store',
      version: 4,
      migrate: (persisted) => ({
        ...(persisted || {}),
        crops: persisted?.crops?.length ? persisted.crops : MANDI_DATA,
        selectedCropIds: persisted?.selectedCropIds?.length ? persisted.selectedCropIds : ['wheat', 'onion', 'tomato'],
        mandis: persisted?.mandis?.length ? persisted.mandis : ALL_MANDIS,
        selectedMandi: persisted?.selectedMandi || ALL_MANDIS[0],
        priceHistory: persisted?.priceHistory || {},
        priceObservationDays: persisted?.priceObservationDays || {},
        priceHistorySource: persisted?.priceHistorySource || {},
      }),
    }
  )
);
