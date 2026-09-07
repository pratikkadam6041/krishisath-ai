/**
 * Live API Services for KrishiSarth
 *
 * Weather  → Open-Meteo (free, no key, GPS-based)
 * Mandi    → data.gov.in Agmarknet API (free key) + static fallback
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

// ─── Mandi Price API (data.gov.in Agmarknet) ─────────────────────────────────
const DATA_GOV_KEY = import.meta.env.VITE_DATA_GOV_API_KEY;
const AGMARKNET_RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';

const CACHE_KEY = 'ks_mandi_cache';

export async function fetchMandiPrices({
  state = 'Maharashtra',
  commodities = [],
  market = '',
  limit = 20,
} = {}) {
  // Try live API if key is available
  if (DATA_GOV_KEY) {
    try {
      const url = new URL(`https://api.data.gov.in/resource/${AGMARKNET_RESOURCE_ID}`);
      url.searchParams.set('api-key', DATA_GOV_KEY);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', limit);
      url.searchParams.set('filters[State]', state);
      if (market) {
        url.searchParams.set('filters[Market]', market);
      }
      // Filter by commodities if specified
      if (commodities.length === 1) {
        url.searchParams.set('filters[Commodity]', commodities[0]);
      }

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Agmarknet API ${res.status}`);
      const json = await res.json();

      if (json.records && json.records.length > 0) {
        const formattedRecords = json.records.map((r) => ({
          commodity: r.commodity || r.Commodity,
          variety: r.variety || r.Variety || 'Local',
          market: r.market || r.Market,
          district: r.district || r.District,
          state: r.state || r.State,
          modal_price: String(r.modal_price || r['Modal Price (Rs./Quintal)'] || 0),
          min_price: String(r.min_price || r['Min Price (Rs./Quintal)'] || 0),
          max_price: String(r.max_price || r['Max Price (Rs./Quintal)'] || 0),
          arrival_date: r.arrival_date || r['Arrival Date'] || new Date().toLocaleDateString('en-IN'),
        }));
        
        // Cache the result
        localStorage.setItem(`${CACHE_KEY}_${market}_${commodities.join('_')}`, JSON.stringify({
          records: formattedRecords,
          fetchedAt: Date.now()
        }));

        return {
          records: formattedRecords,
          isLive: true,
          fetchedAt: Date.now(),
          error: null,
        };
      }
      throw new Error('No records returned');
    } catch (err) {
      console.warn('[Mandi] Live API failed, attempting offline cache:', err.message);
    }
  }

  // Attempt Offline Cache
  const cachedDataStr = localStorage.getItem(`${CACHE_KEY}_${market}_${commodities.join('_')}`);
  if (cachedDataStr) {
    try {
      const cachedData = JSON.parse(cachedDataStr);
      return {
        records: cachedData.records,
        isLive: false,
        fetchedAt: cachedData.fetchedAt,
        error: 'Offline mode: Showing cached data',
      };
    } catch (e) {
      console.warn('Cache parsing failed');
    }
  }

  // No data available
  return {
    records: [],
    isLive: false,
    fetchedAt: Date.now(),
    error: 'Live API unavailable and no offline cache. Please check VITE_DATA_GOV_API_KEY and your internet.',
  };
}
