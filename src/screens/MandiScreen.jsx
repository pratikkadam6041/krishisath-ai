import { useMemo, useState } from 'react';
import { ArrowLeft, Bell, CalendarDays, ChevronDown, MapPin, RefreshCw, Share2, TrendingDown, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import CropAvatar from '../components/CropAvatar.jsx';
import CropSuggestionCard from '../components/CropSuggestionCard.jsx';
import { useMandiStore } from '../store/mandiStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useAdminStore } from '../store/adminStore.js';
import { localize, formatCurrency, formatRelativeTime } from '../utils/formatters.js';
import { Sparkline } from '../utils/svgChart.jsx';
import { shareMandiPrice } from '../utils/shareWhatsApp.js';
import { isFeatureRouteEnabled } from '../utils/featureFlags.js';

const VARIETY_LABELS = {
  Dara: { hi: 'दारा', mr: 'दारा', en: 'Dara' },
  Local: { hi: 'लोकल', mr: 'लोकल', en: 'Local' },
  Hybrid: { hi: 'हाइब्रिड', mr: 'हायब्रिड', en: 'Hybrid' },
  Yellow: { hi: 'येलो', mr: 'यलो', en: 'Yellow' },
  'H-4': { hi: 'एच-4', mr: 'एच-4', en: 'H-4' },
};

function PriceAlertSheet({ crop, onClose, onSave, currentValue, language }) {
  const [value, setValue] = useState(currentValue || crop.price);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 px-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-t-[32px] bg-white p-6 pb-10 shadow-2xl">
        <h2 className="text-2xl font-black text-text-primary">
          {localize({ hi: 'प्राइस अलर्ट सेट करें', mr: 'किंमत अलर्ट सेट करा', en: 'Set price alert' }, language)}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">{localize(crop.cropNameHi ? { hi: crop.cropNameHi, mr: crop.cropNameMr, en: crop.cropName } : crop.cropName, language)}</p>

        <div className="mt-5 rounded-2xl border border-border bg-[#f7faf5] p-4">
          <label className="mb-2 block text-sm font-bold text-text-secondary">
            {localize(
              {
                hi: 'जब कीमत इस स्तर तक पहुंचे',
                mr: 'किंमत या पातळीपर्यंत पोहोचल्यावर',
                en: 'Notify me when price reaches',
              },
              language
            )}
          </label>
          <div className="flex items-center rounded-2xl bg-white px-4 py-4">
            <span className="text-2xl font-black text-[#1a3d1a]">₹</span>
            <input
              type="number"
              value={value}
              onChange={(event) => setValue(Number(event.target.value))}
              className="w-full bg-transparent px-3 text-2xl font-black text-text-primary outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-border px-4 py-4 text-sm font-bold text-text-primary"
          >
            {localize({ hi: 'रद्द करें', mr: 'रद्द करा', en: 'Cancel' }, language)}
          </button>
          <button
            type="button"
            onClick={() => onSave(value)}
            className="flex-1 rounded-2xl bg-[#1a3d1a] px-4 py-4 text-sm font-black text-white"
          >
            {localize({ hi: 'अलर्ट सेव करें', mr: 'अलर्ट जतन करा', en: 'Save alert' }, language)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MandiScreen() {
  const navigate = useNavigate();
  const language = useSettingsStore((state) => state.language);
  const selectedMandi = useMandiStore((state) => state.selectedMandi);
  const mandis = useMandiStore((state) => state.mandis);
  const crops = useMandiStore((state) => state.crops);
  const setSelectedMandi = useMandiStore((state) => state.setSelectedMandi);
  const priceAlerts = useMandiStore((state) => state.priceAlerts);
  const setPriceAlert = useMandiStore((state) => state.setPriceAlert);
  const selectedCropIds = useMandiStore((state) => state.selectedCropIds);
  const lastUpdated = useMandiStore((state) => state.lastUpdated);
  const isDemo = useMandiStore((state) => state.isDemo);
  const isLoading = useMandiStore((state) => state.isLoading);
  const refreshPrices = useMandiStore((state) => state.refreshPrices);
  const features = useAdminStore((state) => state.features);

  const [selectedAlertCrop, setSelectedAlertCrop] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filters = useMemo(() => ['all', ...crops.map((crop) => crop.id)], [crops]);
  const sortedMandis = useMemo(
    () =>
      [...mandis].sort(
        (left, right) => Number.parseInt(left.distance, 10) - Number.parseInt(right.distance, 10)
      ),
    [mandis]
  );

  const sortedCrops = useMemo(() => {
    const selected = crops.filter((crop) => selectedCropIds.includes(crop.id));
    const others = crops.filter((crop) => !selectedCropIds.includes(crop.id));
    return [...selected, ...others];
  }, [crops, selectedCropIds]);

  const visibleCrops = useMemo(
    () => (selectedFilter === 'all' ? sortedCrops : sortedCrops.filter((crop) => crop.id === selectedFilter)),
    [selectedFilter, sortedCrops]
  );

  const isStale = Date.now() - lastUpdated > 3 * 60 * 60 * 1000;

  if (!isFeatureRouteEnabled('/mandi', features)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="rounded-[32px] bg-white p-8 shadow-xl max-w-sm">
          <h2 className="text-xl font-black text-slate-800">Mandi Disabled</h2>
          <p className="mt-2 text-sm text-slate-500">Admin has turned off live APMC Mandi prices for this app.</p>
          <button onClick={() => navigate(-1)} className="mt-6 w-full rounded-2xl bg-[#1a3d1a] py-3 text-sm font-black text-white">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-8">
      {isStale ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3">
          <div>
            <p className="text-sm font-black text-amber-900">
              {localize({ hi: 'पुराना डेटा दिख रहा है', mr: 'जुना डेटा दिसत आहे', en: 'Showing stale market data' }, language)}
            </p>
            <p className="text-sm text-amber-700">
              {localize(
                {
                  hi: 'फैसला लेने से पहले ताज़ा भाव जांचें।',
                  mr: 'निर्णय घेण्यापूर्वी ताजे दर तपासा.',
                  en: 'Check fresh rates before acting on these prices.',
                },
                language
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => refreshPrices()}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-amber-800"
          >
            <RefreshCw size={14} />
            {localize({ hi: 'रीफ्रेश', mr: 'रिफ्रेश', en: 'Refresh' }, language)}
          </button>
        </div>
      ) : null}

      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-text-primary"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-[30px] font-black leading-none text-text-primary">
            {localize({ hi: 'मंडी भाव', mr: 'मंडी भाव', en: 'Mandi prices' }, language)}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {localize(
              {
                hi: `आख़िरी अपडेट ${formatRelativeTime(lastUpdated, language)}`,
                mr: `शेवटचा अपडेट ${formatRelativeTime(lastUpdated, language)}`,
                en: `Last updated ${formatRelativeTime(lastUpdated, language)}`,
              },
              language
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refreshPrices()}
          disabled={isLoading}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-text-primary disabled:opacity-50"
          aria-label="Refresh mandi prices"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="rounded-[28px] border border-border bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-[#f5f9f3] px-4 py-2 text-sm font-black text-text-primary"
          >
            <MapPin size={14} />
            {selectedMandi.name}
            <ChevronDown size={14} />
          </button>
          <span className="rounded-full bg-[#edf6ec] px-3 py-2 text-xs font-black text-[#1a3d1a]">
            {localize({ hi: 'आज का भाव', mr: 'आजचा भाव', en: "Today's rate" }, language)}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-2">
            {mandis.map((mandi) => (
              <button
                key={mandi.id}
                type="button"
                onClick={() => setSelectedMandi(mandi)}
                className={`rounded-full px-4 py-3 text-sm font-black ${
                  mandi.id === selectedMandi.id ? 'bg-[#1a3d1a] text-white' : 'bg-[#f5f9f3] text-text-secondary'
                }`}
              >
                {mandi.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-2">
          {filters.map((filter) => {
            const crop = sortedCrops.find((item) => item.id === filter);
            const label =
              filter === 'all'
                ? localize({ hi: 'सभी फसलें', mr: 'सर्व पिके', en: 'All crops' }, language)
                : localize({ hi: crop?.cropNameHi, mr: crop?.cropNameMr, en: crop?.cropName }, language);

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setSelectedFilter(filter)}
                className={`rounded-full px-4 py-2 text-sm font-black ${
                  selectedFilter === filter ? 'bg-[#1a3d1a] text-white' : 'bg-white text-text-secondary'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <CropSuggestionCard mandiName={selectedMandi.name} historyData={visibleCrops} />

      <div className="mt-4 space-y-4">
        {visibleCrops.map((crop) => {
          const varietyLabel = localize(VARIETY_LABELS[crop.variety] || { hi: crop.variety, mr: crop.variety, en: crop.variety }, language);
          const trendColor = crop.change >= 0 ? '#16a34a' : '#dc2626';

          return (
            <div key={crop.id} className="rounded-[28px] border border-border bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <CropAvatar cropId={crop.id} size="md" />
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-text-primary">
                      {localize({ hi: crop.cropNameHi, mr: crop.cropNameMr, en: crop.cropName }, language)}
                    </h2>
                    <p className="mt-1 text-sm text-text-secondary">
                      {localize({ hi: 'किस्म', mr: 'वाण', en: 'Variety' }, language)} · {varietyLabel}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[32px] font-black leading-none text-text-primary">₹{formatCurrency(crop.price)}</p>
                  <p className={`mt-2 inline-flex items-center gap-1 text-sm font-black ${crop.change >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {crop.change >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                    {crop.change >= 0 ? `+₹${crop.change}` : `-₹${Math.abs(crop.change)}`}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="rounded-[24px] bg-[#f7faf5] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-text-primary">
                      {localize({ hi: '7 दिन ट्रेंड', mr: '7 दिवस ट्रेंड', en: '7-day trend' }, language)}
                    </p>
                    <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-text-secondary">₹</span>
                  </div>
                  <Sparkline
                    data={crop.history7d}
                    height={190}
                    color={trendColor}
                    labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                    showDots
                    showLabels
                    formatter={(value) => `₹${formatCurrency(value)}`}
                  />
                </div>

                <div className="grid gap-3">
                  <div className="rounded-[24px] bg-[#f7faf5] p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">
                      {localize({ hi: 'आज का दायरा', mr: 'आजची श्रेणी', en: "Today's range" }, language)}
                    </p>
                    <p className="mt-2 text-lg font-black text-text-primary">
                      ₹{formatCurrency(crop.min)} - ₹{formatCurrency(crop.max)}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">{crop.unit}</p>
                  </div>

                  <div className="rounded-[24px] bg-[#f7faf5] p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">
                      {localize({ hi: 'मार्केट', mr: 'मार्केट', en: 'Market' }, language)}
                    </p>
                    <p className="mt-2 text-lg font-black text-text-primary">{selectedMandi.name}</p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {localize(
                        {
                          hi: 'साझा करें या अलर्ट सेट करें',
                          mr: 'शेअर करा किंवा अलर्ट सेट करा',
                          en: 'Share or set an alert',
                        },
                        language
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    shareMandiPrice({
                      cropName: localize({ hi: crop.cropNameHi, mr: crop.cropNameMr, en: crop.cropName }, language),
                      price: crop.price,
                      unit: crop.unit,
                      mandi: selectedMandi.name,
                      change: crop.change,
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#cfe2cf] bg-[#f6fbf5] px-4 py-4 text-sm font-black text-[#1a3d1a]"
                >
                  <Share2 size={16} />
                  {localize({ hi: 'WhatsApp शेयर', mr: 'WhatsApp शेअर', en: 'Share on WhatsApp' }, language)}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAlertCrop(crop)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#cfe2cf] bg-[#f6fbf5] px-4 py-4 text-sm font-black text-[#1a3d1a]"
                >
                  <Bell size={16} />
                  {priceAlerts[crop.id]
                    ? `${localize({ hi: 'अलर्ट', mr: 'अलर्ट', en: 'Alert' }, language)} ₹${priceAlerts[crop.id]}`
                    : localize({ hi: 'प्राइस अलर्ट', mr: 'किंमत अलर्ट', en: 'Price alert' }, language)}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-[28px] border border-border bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-text-primary">
              {localize({ hi: 'अन्य मंडी भाव देखें', mr: 'इतर मंडी भाव पाहा', en: 'Nearby mandi options' }, language)}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {localize(
                {
                  hi: 'सबसे नज़दीकी मंडी पहले दिखाई गई है।',
                  mr: 'सर्वात जवळची मंडी आधी दाखवली आहे.',
                  en: 'Nearest mandi is highlighted first.',
                },
                language
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {sortedMandis
            .filter((mandi) => mandi.id !== selectedMandi.id)
            .map((mandi, index) => (
              <button
                key={mandi.id}
                type="button"
                onClick={() => setSelectedMandi(mandi)}
                className="flex w-full items-center justify-between rounded-[22px] border border-[#e8efe6] bg-[#f7faf5] px-4 py-4 text-left"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-text-primary">{mandi.name}</p>
                    {index === 0 ? (
                      <span className="rounded-full bg-[#edf6ec] px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#1a3d1a]">
                        {localize({ hi: 'सबसे नज़दीक', mr: 'सर्वात जवळ', en: 'Nearest' }, language)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-text-secondary">{mandi.distance}</p>
                </div>
                <span className="text-sm font-black text-[#1a3d1a]">
                  {localize({ hi: 'खोलें', mr: 'उघडा', en: 'Open' }, language)}
                </span>
              </button>
            ))}
        </div>
      </div>

      {selectedAlertCrop ? (
        <PriceAlertSheet
          crop={selectedAlertCrop}
          currentValue={priceAlerts[selectedAlertCrop.id]}
          language={language}
          onClose={() => setSelectedAlertCrop(null)}
          onSave={(value) => {
            setPriceAlert(selectedAlertCrop.id, value);
            setSelectedAlertCrop(null);
          }}
        />
      ) : null}
    </div>
  );
}
