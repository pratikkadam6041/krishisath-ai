/**
 * Live mandi prices per APMC — Agmarknet (data.gov.in) with distinct market data.
 */

import { fetchMandiPrices } from '../api/liveServices.js';
import { getCropMeta } from '../data/appContent.js';

const MH_MARKETS = [
  { id: 'pune', name: 'Pune APMC', marketFilter: 'Pune', distance: '12 km' },
  { id: 'nashik', name: 'Nashik APMC', marketFilter: 'Nashik', distance: '214 km' },
  { id: 'nagpur', name: 'Nagpur APMC', marketFilter: 'Nagpur', distance: '720 km' },
  { id: 'solapur', name: 'Solapur APMC', marketFilter: 'Solapur', distance: '249 km' },
  { id: 'akola', name: 'Akola APMC', marketFilter: 'Akola', distance: '310 km' },
  { id: 'latur', name: 'Latur APMC', marketFilter: 'Latur', distance: '380 km' },
  { id: 'kolhapur', name: 'Kolhapur APMC', marketFilter: 'Kolhapur', distance: '230 km' },
  { id: 'aurangabad', name: 'Aurangabad APMC', marketFilter: 'Aurangabad', distance: '235 km' },
];

const COMMODITY_MAP = {
  wheat: 'Wheat',
  onion: 'Onion',
  tomato: 'Tomato',
  cotton: 'Cotton',
  soybean: 'Soyabean',
  maize: 'Maize',
  pomegranate: 'Pomegranate',
  sugarcane: 'Sugarcane',
};

function slugify(name = '') {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function recordToCrop(record, marketName) {
  const cropMeta = getCropMeta(slugify(record.commodity));
  const price = Math.round(Number(record.modal_price) || 0);
  const min = Math.round(Number(record.min_price) || price * 0.95);
  const max = Math.round(Number(record.max_price) || price * 1.05);

  return {
    id: slugify(record.commodity),
    cropName: record.commodity,
    cropNameHi: cropMeta.name?.hi || record.commodity,
    cropNameMr: cropMeta.name?.mr || record.commodity,
    emoji: cropMeta.emoji || '🌾',
    variety: record.variety || 'Local',
    price,
    min,
    max,
    change: 0,
    unit: 'क्विंटल',
    mandi: marketName,
    marketKey: marketName,
    arrivalDate: record.arrival_date,
    // Agmarknet returns a current observation, not a historical time series.
    // Start with one real value and let the persisted store add a value only
    // when it receives a new market-day observation.
    history7d: [price],
  };
}

/** Merge API records into per-market crop lists */
export async function refreshAllMandiData({ state = 'Maharashtra', cropIds = [] } = {}) {
  const commodities = cropIds.length
    ? cropIds.map((id) => COMMODITY_MAP[id] || id)
    : Object.values(COMMODITY_MAP);

  const marketResults = await Promise.all(
    MH_MARKETS.map(async (m) => {
      const { records, isLive, error } = await fetchMandiPrices({
        state,
        limit: 80,
        market: m.marketFilter,
      });

      let filtered = records || [];
      if (m.marketFilter) {
        const key = m.marketFilter.toLowerCase();
        const byMarket = filtered.filter(
          (r) =>
            String(r.market || r.district || '')
              .toLowerCase()
              .includes(key) || String(r.district || '').toLowerCase().includes(key)
        );
        if (byMarket.length > 0) filtered = byMarket;
      }

      const crops = filtered
        .filter((r) =>
          commodities.length === 0
            ? true
            : commodities.some(
                (c) => String(r.commodity).toLowerCase() === c.toLowerCase()
              )
        )
        .map((r) => recordToCrop(r, m.name));

      return { market: m, crops, isLive, error };
    })
  );

  const anyLive = marketResults.some((r) => r.isLive);
  const primary = marketResults[0]?.crops?.length
    ? marketResults[0].crops
    : marketResults.flatMap((r) => r.crops).slice(0, 12);

  const byMarket = {};
  marketResults.forEach(({ market, crops }) => {
    byMarket[market.id] = crops;
  });

  return {
    mandis: MH_MARKETS,
    crops: primary,
    cropsByMarket: byMarket,
    isLive: anyLive,
    isDemo: !anyLive,
    fetchedAt: Date.now(),
    error: marketResults.find((r) => r.error)?.error || null,
  };
}

/** Append today's price to 7-day history (persisted in store) */
export function appendPriceHistory(existingHistory = [], newPrice) {
  const history = [...(existingHistory || [])];
  if (history.length >= 7) history.shift();
  history.push(newPrice);
  while (history.length < 7) {
    history.unshift(history[0] ?? newPrice);
  }
  return history;
}

export function computePriceChange(history7d = []) {
  if (history7d.length < 2) return 0;
  const prev = history7d[history7d.length - 2];
  const curr = history7d[history7d.length - 1];
  return curr - prev;
}
