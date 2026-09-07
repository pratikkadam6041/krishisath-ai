import { useEffect, useState } from 'react';
import { ArrowLeft, Sunrise, Sunset, Wind } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { fetchWeather, getUserLocation } from '../api/liveServices.js';
import { formatRelativeTime, localize } from '../utils/formatters.js';

export default function WeatherScreen() {
  const navigate = useNavigate();
  const language = useSettingsStore((state) => state.language);
  const district = useZoneStore((state) => state.district);
  const village = useZoneStore((state) => state.village);
  const weatherCache = useZoneStore((state) => state.weatherCache);
  const setWeatherCache = useZoneStore((state) => state.setWeatherCache);
  const [weather, setWeather] = useState(weatherCache);

  useEffect(() => {
    let mounted = true;

    async function loadWeather() {
      const coords = await getUserLocation();
      const data = await fetchWeather(coords.lat, coords.lon);
      if (!mounted) return;
      setWeather(data);
      setWeatherCache(data);
    }

    loadWeather();
    return () => {
      mounted = false;
    };
  }, [setWeatherCache]);

  return (
    <div className="min-h-[100dvh] bg-[#f4f9f2] px-4 pt-4 pb-8">
      <div className="mb-4 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-text-primary">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-text-primary">
            {localize({ hi: 'मौसम विवरण', mr: 'हवामान तपशील', en: 'Weather detail' }, language)}
          </h1>
          <p className="text-sm text-text-secondary">
            {village}, {district}
          </p>
        </div>
      </div>

      {weather ? (
        <>
          <div className="rounded-[32px] bg-[#1a3d1a] p-6 text-white shadow-[0_24px_60px_rgba(26,61,26,0.3)]">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">LIVE</p>
                <p className="mt-2 text-6xl font-black">{weather.temp}°C</p>
                <p className="mt-2 text-sm text-white/75">
                  {weather.condition} · {localize({ hi: `महसूस ${weather.feelsLike}°`, mr: `${weather.feelsLike}° जाणवते`, en: `Feels like ${weather.feelsLike}°` }, language)}
                </p>
              </div>
              <div className="text-7xl">{weather.emoji}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Wind</p>
                <p className="mt-1 text-lg font-black text-white">{weather.windSpeed} km/h</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Rain</p>
                <p className="mt-1 text-lg font-black text-white">{weather.rainProb}%</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Humidity</p>
                <p className="mt-1 text-lg font-black text-white">{weather.humidity}%</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">UV</p>
                <p className="mt-1 text-lg font-black text-white">{weather.uvIndex}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-border bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-black text-text-primary">
                <Sunrise size={16} className="text-amber-600" />
                {localize({ hi: 'सूर्योदय', mr: 'सूर्योदय', en: 'Sunrise' }, language)}
              </div>
              <p className="text-lg font-black text-text-primary">{weather.forecast7d?.[0]?.sunrise || '--:--'}</p>
            </div>
            <div className="rounded-[24px] border border-border bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-black text-text-primary">
                <Sunset size={16} className="text-orange-600" />
                {localize({ hi: 'सूर्यास्त', mr: 'सूर्यास्त', en: 'Sunset' }, language)}
              </div>
              <p className="text-lg font-black text-text-primary">{weather.forecast7d?.[0]?.sunset || '--:--'}</p>
            </div>
          </div>

          <div className="mt-5 rounded-[28px] border border-border bg-white p-5">
            <h2 className="text-lg font-black text-text-primary">
              {localize({ hi: 'खेती सलाह', mr: 'शेती सल्ला', en: 'Farm advisory' }, language)}
            </h2>
            <div className="mt-4 space-y-3">
              {[
                {
                  icon: <Wind size={16} className="text-sky-600" />,
                  title: localize({ hi: 'स्प्रे विंडो', mr: 'स्प्रे विंडो', en: 'Spray window' }, language),
                  text:
                    weather.windSpeed < 16
                      ? localize({ hi: 'आज शाम हल्का स्प्रे करना सुरक्षित रहेगा।', mr: 'आज संध्याकाळी हलका स्प्रे सुरक्षित राहील.', en: 'This evening should be safe for light spraying.' }, language)
                      : localize({ hi: 'हवा तेज है, स्प्रे टालें।', mr: 'वारा जास्त आहे, स्प्रे पुढे ढकला.', en: 'Winds are high, so postpone spraying.' }, language),
                },
                {
                  icon: <Sunrise size={16} className="text-emerald-600" />,
                  title: localize({ hi: 'सिंचाई सलाह', mr: 'सिंचन सल्ला', en: 'Irrigation advice' }, language),
                  text:
                    weather.rainProb > 50
                      ? localize({ hi: 'बारिश की संभावना है, सिंचाई कम रखें।', mr: 'पावसाची शक्यता आहे, सिंचन कमी ठेवा.', en: 'Rain is likely, so keep irrigation light.' }, language)
                      : localize({ hi: 'सुबह जल्दी पानी देना बेहतर रहेगा।', mr: 'सकाळी लवकर पाणी देणे चांगले.', en: 'Early-morning irrigation would be best today.' }, language),
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl bg-[#f7faf5] p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-black text-text-primary">
                    {item.icon}
                    {item.title}
                  </div>
                  <p className="text-sm text-text-secondary">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-[28px] border border-border bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-text-primary">
                {localize({ hi: '5 दिन पूर्वानुमान', mr: '5 दिवसांचा अंदाज', en: '5-day forecast' }, language)}
              </h2>
              <span className="text-xs font-semibold text-text-secondary">
                {formatRelativeTime(weather.fetchedAt, language)}
              </span>
            </div>
            <div className="space-y-3">
              {weather.forecast7d?.slice(0, 5).map((day, index) => (
                <div key={day.date} className="flex items-center justify-between rounded-2xl bg-[#f7faf5] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{day.emoji}</span>
                    <div>
                      <p className="font-black text-text-primary">
                        {index === 0 ? localize({ hi: 'आज', mr: 'आज', en: 'Today' }, language) : new Date(day.date).toLocaleDateString('en-IN', { weekday: 'long' })}
                      </p>
                      <p className="text-sm text-text-secondary">{day.condition}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-text-primary">
                      {day.maxTemp}° / <span className="text-text-secondary">{day.minTemp}°</span>
                    </p>
                    <p className="text-sm text-sky-600">{day.rainProb}% rain</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
