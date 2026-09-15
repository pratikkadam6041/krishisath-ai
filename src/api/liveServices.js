/**
 * Live API Services for KrishiSarth
 *
 * Weather  → Open-Meteo (free, no key, GPS-based)
 * Mandi    → official Agmarknet 2 daily-report API, served through the local
 *            same-origin route because the government API disallows browser CORS
 * Map      → Leaflet CDN (OpenStreetMap tiles, no key)
 */

// ─── Weather API (Open-Meteo) ────────────────────────────────────────────────
const WMO_CODES = {
  0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Rime Fog',
  51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
  61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
  71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow',
  80: 'Slight Showers', 81: 'Moderate Showers', 82: 'Violent Showers',
  95: 'Thunderstorm', 96: 'Thunderstorm w/ Hail', 99: 'Thunderstorm w/ Hail',
};

const WMO_EMOJI = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '⛈️',
  71: '🌨️', 73: '🌨️', 75: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

export async function fetchWeather(lat = 18.5204, lon = 73.8567) {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set('current', [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation_probability',
      'weather_code',
      'wind_speed_10m',
      'uv_index',
    ].join(','));
    url.searchParams.set('daily', [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'sunrise',
      'sunset',
    ].join(','));
    url.searchParams.set('timezone', 'Asia/Kolkata');
    url.searchParams.set('forecast_days', '7');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Weather API ${res.status}`);
    const json = await res.json();

    const cur = json.current;
    const daily = json.daily;

    const forecast7d = (daily.time || []).map((date, i) => ({
      date,
      code: daily.weather_code[i],
      emoji: WMO_EMOJI[daily.weather_code[i]] || '🌤️',
      condition: WMO_CODES[daily.weather_code[i]] || 'Clear',
      maxTemp: daily.temperature_2m_max[i],
      minTemp: daily.temperature_2m_min[i],
      rainProb: daily.precipitation_probability_max[i] || 0,
      sunrise: daily.sunrise?.[i]?.split('T')[1]?.slice(0, 5) || '--',
      sunset: daily.sunset?.[i]?.split('T')[1]?.slice(0, 5) || '--',
    }));

    return {
      temp: Math.round(cur.temperature_2m),
      feelsLike: Math.round(cur.apparent_temperature),
      humidity: cur.relative_humidity_2m,
      rainProb: cur.precipitation_probability || 0,
      windSpeed: Math.round(cur.wind_speed_10m),
      uvIndex: Math.round(cur.uv_index || 0),
      code: cur.weather_code,
      emoji: WMO_EMOJI[cur.weather_code] || '☀️',
      condition: WMO_CODES[cur.weather_code] || 'Clear Sky',
      forecast7d,
      fetchedAt: Date.now(),
      error: null,
    };
  } catch (err) {
    console.warn('[Weather] API failed, using fallback:', err.message);
    return {
      temp: 32, feelsLike: 35, humidity: 58, rainProb: 12,
      windSpeed: 14, uvIndex: 7, code: 0, emoji: '☀️', condition: 'Clear Sky',
      forecast7d: [],
      fetchedAt: Date.now(),
      error: err.message,
    };
  }
}

// ─── Reverse Geocode (get village/district from GPS) ─────────────────────────
export async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'KrishiSarth-App/2.0' },
    });
    const json = await res.json();
    const addr = json.address || {};
    return {
      village: addr.village || addr.suburb || addr.town || addr.city_district || '',
      district: addr.county || addr.city || addr.district || 'पुणे',
      state: addr.state || 'Maharashtra',
      country: addr.country_code?.toUpperCase() || 'IN',
      displayName: json.display_name || '',
    };
  } catch (err) {
    console.warn('[Geocode] Reverse geocode failed:', err.message);
    return { village: '', district: 'पुणे', state: 'Maharashtra', country: 'IN', displayName: '' };
  }
}

// ─── Get user GPS location ─────────────────────────────────────────────────
export function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: 18.5204, lon: 73.8567, error: 'Not supported' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, error: null }),
      (err) => resolve({ lat: 18.5204, lon: 73.8567, error: err.message }),
      { timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

// ─── Mandi Price API (official Agmarknet) ────────────────────────────────────
// In a hosted deployment VITE_MANDI_API_URL must point to an equivalent
// server-side route. The Vite route powers the local demo and never exposes a
// credential to the browser.
const MANDI_REPORT_URL = import.meta.env.VITE_MANDI_API_URL || '/api/mandi-report';

const CACHE_KEY = 'ks_mandi_cache';

function dateInIndia(daysBack = 0) {
  const value = new Date(Date.now() - daysBack * 86_400_000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(value)
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function displayDate(isoDate) {
  const [year, month, day] = String(isoDate).split('-');
  return year && month && day ? `${day}/${month}/${year}` : isoDate;
}

function flattenAgmarknetReport(report, isoDate) {
  return (report?.states || []).flatMap((state) =>
    (state.markets || []).flatMap((market) =>
      (market.commodities || []).flatMap((commodity) =>
        (commodity.data || []).map((row) => ({
          commodity: commodity.commodityName,
          variety: row.variety || 'Local',
          market: row.marketCenter || market.marketName,
          state: state.stateName,
          modal_price: String(row.modalPrice ?? 0),
          min_price: String(row.minimumPrice ?? 0),
          max_price: String(row.maximumPrice ?? 0),
          arrival_date: displayDate(isoDate),
        }))
      )
    )
  );
}

/**
 * Fetch the newest available official report for each requested APMC.
 * Markets often publish after trading closes, so a blank current-day report
 * falls back to the most recent report within the last seven days. Its date is
 * retained on every record; no stale rate is ever labelled as today's price.
 */
export async function fetchMandiMarketReports({ marketIds = [], stateIds = [20], daysBack = 7 } = {}) {
  const cacheKey = `${CACHE_KEY}_agmarknet_${marketIds.join('_')}`;
  const recordsByMarketId = {};
  let lastError = null;

  try {
    for (let daysAgo = 0; daysAgo <= daysBack; daysAgo += 1) {
      const isoDate = dateInIndia(daysAgo);
      const res = await fetch(MANDI_REPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: isoDate, marketIds, stateIds }),
      });
      if (!res.ok) throw new Error(`Agmarknet report ${res.status}`);

      const report = await res.json();
      const rows = flattenAgmarknetReport(report, isoDate);
      rows.forEach((row) => {
        const marketId = (report.states || [])
          .flatMap((state) => state.markets || [])
          .find((market) => String(market.marketName || '').trim() === String(row.market || '').trim())?.marketId;
        if (marketId && !recordsByMarketId[marketId]) recordsByMarketId[marketId] = [];
        if (marketId) recordsByMarketId[marketId].push(row);
      });

    }

    localStorage.setItem(cacheKey, JSON.stringify({ recordsByMarketId, fetchedAt: Date.now() }));
    return { recordsByMarketId, isLive: true, fetchedAt: Date.now(), error: null };
  } catch (error) {
    lastError = error;
    console.warn('[Mandi] Official Agmarknet request failed, attempting cache:', error.message);
  }

  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached?.recordsByMarketId) {
      return {
        recordsByMarketId: cached.recordsByMarketId,
        isLive: false,
        fetchedAt: cached.fetchedAt,
        error: 'Offline mode: Showing the last cached official report.',
      };
    }
  } catch {
    // A corrupt cache is treated as unavailable data.
  }

  return {
    recordsByMarketId: {},
    isLive: false,
    fetchedAt: Date.now(),
    error: `Official Mandi report unavailable: ${lastError?.message || 'unknown error'}`,
  };
}
