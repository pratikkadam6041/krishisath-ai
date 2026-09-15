/**
 * Live mandi prices per APMC — official Agmarknet daily reports.
 */

import { fetchMandiMarketReports } from '../api/liveServices.js';
import { getCropMeta } from '../data/appContent.js';

const MH_MARKETS = [
  // A Pune-wide query includes Moshi and Pimpri, which creates duplicate
  // commodity cards. Use one explicitly named APMC for the Pune tab so every
  // displayed price has a single, traceable official source.
  { id: 'pune', name: 'Pune APMC (Moshi)', marketId: 3450, distance: '12 km' },
  { id: 'nashik', name: 'Nashik APMC (Devlali)', marketId: 2140, distance: '214 km' },
  { id: 'nagpur', name: 'Nagpur APMC', marketId: 155, distance: '720 km' },
  { id: 'solapur', name: 'Solapur APMC', marketId: 168, distance: '249 km' },
  { id: 'akola', name: 'Akola APMC', marketId: 146, distance: '310 km' },
  { id: 'latur', name: 'Latur APMC', marketId: 153, distance: '380 km' },
  { id: 'kolhapur', name: 'Kolhapur APMC', marketId: 152, distance: '230 km' },
  { id: 'aurangabad', name: 'Chhatrapati Sambhajinagar APMC', marketId: 557, distance: '235 km' },
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
    mandi: record.market || marketName,
    marketKey: marketName,
    sourceMarket: record.market || marketName,
    arrivalDate: record.arrival_date,
    source: 'official',
    // Agmarknet returns a current observation, not a historical time series.
    // Start with one real value and let the persisted store add a value only
    // when it receives a new market-day observation.
    history7d: [price],
  };
}

function arrivalTime(value) {
  const [day, month, year] = String(value || '').split('/').map(Number);
  return Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)
    ? Date.UTC(year, month - 1, day)
    : 0;
}

function distinctCommodities(records = []) {
  const representativeByCommodity = new Map();

  records.forEach((record) => {
    const key = slugify(record.commodity);
    if (!key) return;
    const existing = representativeByCommodity.get(key);
    if (!existing || arrivalTime(record.arrival_date) > arrivalTime(existing.arrival_date)) {
      representativeByCommodity.set(key, record);
    }
  });

  return [...representativeByCommodity.values()];
}

function historyForCommodity(records = [], commodity = '') {
  const sampleByDay = new Map();
  records
    .filter((record) => slugify(record.commodity) === slugify(commodity))
    .sort((left, right) => arrivalTime(left.arrival_date) - arrivalTime(right.arrival_date))
    .forEach((record) => {
      const price = Math.round(Number(record.modal_price) || 0);
      if (price > 0) sampleByDay.set(record.arrival_date, price);
    });
  return [...sampleByDay.values()].slice(-7);
}

/** Merge API records into per-market crop lists */
export async function refreshAllMandiData({ state = 'Maharashtra', cropIds = [] } = {}) {
  const commodities = cropIds.length
    ? cropIds.map((id) => COMMODITY_MAP[id] || id)
    : Object.values(COMMODITY_MAP);

  const { recordsByMarketId, isLive, error } = await fetchMandiMarketReports({
    marketIds: MH_MARKETS.map((market) => market.marketId),
  });

  const marketResults = MH_MARKETS.map((m) => {
      const filtered = recordsByMarketId[m.marketId] || [];
      const crops = distinctCommodities(filtered)
        .filter((r) =>
          commodities.length === 0
            ? true
            : commodities.some(
                (c) => String(r.commodity).toLowerCase() === c.toLowerCase()
              )
        )
        .map((r) => ({
          ...recordToCrop(r, m.name),
          // These are official daily observations collected above, not a
          // simulated graph. A chart is shown only when the market supplied
          // at least two reported trading days for that commodity.
          history7d: historyForCommodity(filtered, r.commodity),
        }));
      return { market: m, crops, isLive, error };
    });

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
  return history;
}

export function computePriceChange(history7d = []) {
  if (history7d.length < 2) return 0;
  const prev = history7d[history7d.length - 2];
  const curr = history7d[history7d.length - 1];
  return curr - prev;
}
